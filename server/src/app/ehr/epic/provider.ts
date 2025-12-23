import prisma from "../../../config/prisma.config";
import logger from "../../../config/logger.config";
import { cryptoService } from "../../services/crypto/crypto.service";
import { sseRedis } from "../../sse/sseSubscriber";
import { CleanRecord, EhrProvider, NormalizedRecord } from "../common/ehrProvider.interface";
import { epicFetcher } from "./epic.fetcher";
import { epicNormalizer } from "./epic.normalizer";
import { epicCleaner } from "./epic.cleaner";
import { epicOAuth } from "./epic.oauth";

export class EpicProvider implements EhrProvider {
    auth = epicOAuth;

    async fetch(profileId: string): Promise<void> {
        // Implementation for standalone fetch if needed
        // For Epic, we typically do sync() which does fetch+normalize+clean
        // But to satisfy interface, we could implement a fetch-only loop here.
        // For now, sync() is the main driver.
        throw new Error("Use sync() for Epic provider");
    }

    normalize(rawData: any[]): NormalizedRecord[] {
        // This is a synchronous convenience method in the interface, 
        // but our implementation deals with DB upserts directly in the flow.
        // We can conform to the interface or use our internal flow.
        // Given existing architecture, we upsert during processing.
        return [];
    }

    clean(normalizedData: NormalizedRecord[]): CleanRecord[] {
        return [];
    }

    async sync(profileId: string, jobId?: string): Promise<void> {
        // 1. Retrieve connection and decrypt token
        const connection = await prisma.profileEmrConnection.findUnique({
            where: {
                profileId_provider: {
                    profileId,
                    provider: "epic",
                },
            },
        });

        if (!connection) {
            throw new Error("Profile not connected to Epic");
        }

        const accessTokenEncrypted = connection.accessTokenEncrypted;
        const patientId = connection.patientEmrId;

        let accessToken: string;
        try {
            accessToken = cryptoService.decrypt(accessTokenEncrypted);
        } catch (error) {
            logger.error(
                `Failed to decrypt access token for profile ${profileId}:`,
                error
            );
            throw new Error("Invalid token data — please reconnect Epic.");
        }

        if (!accessToken || !patientId) {
            throw new Error("Invalid connection data: missing token or patient ID");
        }

        // 2. Define Resources to Sync
        const resources = [
            "Patient",
            "MedicationRequest",
            "Condition",
            "Observation",
            "Immunization",
            "AllergyIntolerance",
            "Encounter",
            "Procedure",
        ];

        const errors: string[] = [];

        // 3. Sequential Sync Loop
        const results = await Promise.allSettled(
            resources.map((resource) =>
                this.syncSingleResource(profileId, resource, patientId, accessToken, jobId)
            )
        );

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                const resource = resources[index];
                logger.error(`Sync failed for ${resource}`, result.reason);
                errors.push(`${resource}: ${result.reason.message}`);
            }
        });

        if (errors.length > 0) {
            throw new Error(`Sync completed with errors: ${errors.join(", ")}`);
        }
    }

    private async syncSingleResource(
        profileId: string,
        resourceType: string,
        patientId: string,
        accessToken: string,
        jobId?: string
    ) {
        // Publish Event
        if (jobId) sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "fetching", resourceType }));

        // 1. Fetch
        let resourceData;
        try {
            resourceData = await epicFetcher.fetchResource(resourceType, patientId, accessToken);
        } catch (e) {
            if (jobId) sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "failed", resourceType }));
            throw e;
        }

        if (jobId) sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "fetched", resourceType }));
        if (jobId) sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "normalizing", resourceType }));

        // 2. Persist Raw & Normalize
        // Handle Bundle vs Single
        if (resourceData.resourceType === "Bundle" && resourceData.entry) {
            for (const entry of resourceData.entry) {
                if (!entry.resource || !entry.resource.id) continue;

                await prisma.profileFhirResourceRaw.upsert({
                    where: {
                        profileId_provider_resourceType_resourceId: {
                            profileId,
                            provider: "epic",
                            resourceType: entry.resource.resourceType,
                            resourceId: entry.resource.id,
                        },
                    },
                    create: {
                        profileId,
                        provider: "epic",
                        resourceType: entry.resource.resourceType,
                        resourceId: entry.resource.id,
                        resourceJson: entry.resource,
                        fetchedAt: new Date(),
                    },
                    update: {
                        resourceJson: entry.resource,
                        fetchedAt: new Date(),
                    },
                });

                await epicNormalizer.normalize(
                    profileId,
                    entry.resource.resourceType,
                    entry.resource.id,
                    entry.resource
                );
            }
        } else if (resourceData.id) {
            // Single Resource (e.g. Patient)
            await prisma.profileFhirResourceRaw.upsert({
                where: {
                    profileId_provider_resourceType_resourceId: {
                        profileId,
                        provider: "epic",
                        resourceType: resourceType,
                        resourceId: resourceData.id,
                    },
                },
                create: {
                    profileId,
                    provider: "epic",
                    resourceType: resourceType,
                    resourceId: resourceData.id,
                    resourceJson: resourceData,
                    fetchedAt: new Date(),
                },
                update: {
                    resourceJson: resourceData,
                    fetchedAt: new Date(),
                },
            });

            await epicNormalizer.normalize(
                profileId,
                resourceType,
                resourceData.id,
                resourceData
            );
        }

        if (jobId) sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "cleaning", resourceType }));

        // 3. Clean
        await epicCleaner.clean(profileId, resourceType);
    }
}

export const epicProvider = new EpicProvider();
