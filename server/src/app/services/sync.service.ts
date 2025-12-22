import prisma from "../../config/prisma.config";
import { cryptoService } from "./Crypto.service";
import logger from "../../config/logger.config";
import { normalizationService } from "./Normalization.service";
import { cleaningService } from "./Cleaning.service";
import redisClient from "../../config/redis.config";
import { cooldownKey, SYNC_COOLDOWN_MS } from "../../jobs/constants/sync.constants";
import { sseRedis } from "../sse/sseSubscriber";

export class SyncService {
    /**
   * Fetches a generic FHIR resource for the current session's patient.
   * @param sessionId The session ID from the frontend.
   * @param resourceType The FHIR resource type (e.g., 'Observation', 'Condition').
   */
    async syncResource(
        userId: string,
        profileId: string,
        resourceType: string,
        jobId: string
    ): Promise<any> {
        // 1. Verify profile ownership and retrieve connection
        const profile = await prisma.profile.findFirst({
            where: { id: profileId, userId },
        });

        if (!profile) {
            throw new Error("Forbidden: Profile does not belong to user");
        }

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

        // 2. Construct FHIR URL
        let url: string;
        if (resourceType === "Patient") {
            url = `${process.env.EPIC_FHIR_BASE}/Patient/${patientId}`;
        } else {
            url = `${process.env.EPIC_FHIR_BASE}/${resourceType}?patient=${patientId}`;
        }

        // 3. Handle specific resource requirements
        if (resourceType === "Observation") {
            // e.g. add category
            // e.g. add category
            url += "&category=vital-signs";
        }

        logger.info(`Fetching EHR Data: ${resourceType} for patient ${patientId}`);


        // Bradcasting redis event for fetching
        sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "fetching", resourceType }));

        // 4. Call Epic FHIR API
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/fhir+json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`FHIR ${resourceType} fetch failed: ${errorText}`);

            // Bradcasting redis event for fetching
            sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "failed", resourceType }));

            if (response.status === 401) {
                throw new Error("Unauthorized: Token expired or invalid");
            }
            throw new Error(
                `Failed to fetch ${resourceType}: ${response.status} ${response.statusText}`
            );
        }

        // Bradcasting redis event for fetching
        sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "fetched", resourceType }));

        const resourceData = await response.json();

        // --- Phase 2: Raw FHIR Storage ---
        // We persist exactly what we received from Epic.
        // Handling uniqueness: If we fetch the same resource again, we update it (or ignore).
        // For 'Patient', resourceId is patientId.
        // For others, we might get a Bundle. logic differs.

        // Bradcasting redis event for fetching
        sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "normalizing", resourceType }));

        if (resourceData.resourceType === "Bundle" && resourceData.entry) {
            // Upsert each entry in the bundle sequentially

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

                // Normalize
                await normalizationService.normalize(
                    profileId,
                    "epic",
                    entry.resource.resourceType,
                    entry.resource.id,
                    entry.resource
                );
            }
        } else if (resourceData.id) {
            // Single resource (e.g. Patient)
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

            // Normalize
            await normalizationService.normalize(
                profileId,
                "epic",
                resourceType,
                resourceData.id,
                resourceData
            );
        }

        // Bradcasting redis event for fetching
        sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "cleaning", resourceType }));

        // Aggregation / Cleaning
        await cleaningService.clean(profileId, resourceType);

        return { success: true, resourceType, data: resourceData };
    }

    /**
   * Triggers a full sync for the given profile and provider.
   * Fetches Patient, Medications, Conditions, and Observations.
   */
    async syncProfile(
        userId: string,
        profileId: string,
        provider: string = "epic",
        jobId: string
    ) {
        logger.info(`Starting Sync Job ${jobId} for profile ${profileId}`);

        try {
            // 1. Update Sync Job Record (created by caller)
            await prisma.profileSyncJob.update({
                where: { jobId },
                data: {
                    status: "syncing",
                    startedAt: new Date(),
                },
            });

            // 2. Fetch Resources sequentially
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

            const results = await Promise.allSettled(
                resources.map((resource) =>
                    this.syncResource(userId, profileId, resource, jobId)
                )
            );

            results.forEach((result, index) => {
                if (result.status === "rejected") {
                    const resource = resources[index];
                    logger.error(`Sync failed for ${resource}`, result.reason);
                    errors.push(`${resource}: ${result.reason.message}`);
                }
            });

            // 3. Update Job Status
            if (errors.length > 0) {
                await prisma.profileSyncJob.update({
                    where: { jobId },
                    data: {
                        provider: provider,
                        status: "failed",
                        completedAt: new Date(),
                        error: errors.join(", "),
                    },
                });
            } else {
                await prisma.profileSyncJob.update({
                    where: { jobId },
                    data: {
                        status: "success",
                        provider: provider,
                        completedAt: new Date(),
                        error: null,
                    },
                });
                redisClient.set(cooldownKey(profileId, provider), "1", "PX", SYNC_COOLDOWN_MS);
            }

            // Bradcasting redis event for fetching
            sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "complete", resourceType: "all" }));

            logger.info(`Sync Job ${jobId} completed. Errors: ${errors.length}`);
        } catch (error: any) {
            logger.error(`Critical error in Sync Job for ${profileId}`, error);
            await prisma.profileSyncJob.update({
                where: { jobId },
                data: {
                    status: "failed",
                    provider: provider,
                    completedAt: new Date(),
                    error: error.message,
                },
            });
        }
    }
}

export const syncService = new SyncService();