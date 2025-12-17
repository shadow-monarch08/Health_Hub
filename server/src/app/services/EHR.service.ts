import prisma from '../../config/prisma';
import { env } from "../../config/environment"
import logger from '../../config/logger';
import { cryptoService } from './Crypto.service';
import { normalizationService } from './Normalization.service';




interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    patient?: string;
    refresh_token?: string;
    id_token?: string;
}

export class EHRService {
    /**
     * Fetches a generic FHIR resource for the current session's patient.
     * @param sessionId The session ID from the frontend.
     * @param resourceType The FHIR resource type (e.g., 'Observation', 'Condition').
     */
    async fetchResource(userId: string, profileId: string, resourceType: string): Promise<any> {
        // 1. Verify profile ownership and retrieve connection
        const profile = await prisma.profile.findFirst({
            where: { id: profileId, userId }
        });

        if (!profile) {
            throw new Error('Forbidden: Profile does not belong to user');
        }

        const connection = await prisma.profileEmrConnection.findUnique({
            where: {
                profileId_provider: {
                    profileId,
                    provider: 'epic' // Defaulting to epic for now as per instructions
                }
            }
        });

        if (!connection) {
            throw new Error('Profile not connected to Epic');
        }

        const accessTokenEncrypted = connection.accessTokenEncrypted;
        const patientId = connection.patientEmrId;

        let accessToken: string;
        try {
            accessToken = cryptoService.decrypt(accessTokenEncrypted);
        } catch (error) {
            logger.error(`Failed to decrypt access token for profile ${profileId}:`, error);
            throw new Error('Invalid token data — please reconnect Epic.');
        }

        if (!accessToken || !patientId) {
            throw new Error('Invalid connection data: missing token or patient ID');
        }

        // 2. Construct FHIR URL
        let url: string;
        if (resourceType === 'Patient') {
            url = `${process.env.EPIC_FHIR_BASE}/Patient/${patientId}`;
        } else {
            url = `${process.env.EPIC_FHIR_BASE}/${resourceType}?patient=${patientId}`;
        }

        // 3. Handle specific resource requirements
        if (resourceType === 'Observation') {
            // e.g. add category
            url += '&category=vital-signs'; // Example: default to vitals or laboratory
        }

        logger.info(`Fetching EHR Data: ${resourceType} for patient ${patientId}`);

        // 4. Call Epic FHIR API
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/fhir+json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`FHIR ${resourceType} fetch failed: ${errorText}`);

            if (response.status === 401) {
                throw new Error('Unauthorized: Token expired or invalid');
            }
            throw new Error(`Failed to fetch ${resourceType}: ${response.status} ${response.statusText}`);
        }

        const resourceData = await response.json();

        // --- Phase 2: Raw FHIR Storage ---
        // We persist exactly what we received from Epic.
        // Handling uniqueness: If we fetch the same resource again, we update it (or ignore).
        // For 'Patient', resourceId is patientId.
        // For others, we might get a Bundle. logic differs.

        if (resourceData.resourceType === 'Bundle' && resourceData.entry) {
            // Upsert each entry in the bundle
            await Promise.all(resourceData.entry.map(async (entry: any) => {
                if (!entry.resource || !entry.resource.id) return;

                await prisma.profileFhirResourceRaw.upsert({
                    where: {
                        profileId_provider_resourceType_resourceId: {
                            profileId,
                            provider: 'epic',
                            resourceType: entry.resource.resourceType,
                            resourceId: entry.resource.id
                        }
                    },
                    create: {
                        profileId,
                        provider: 'epic',
                        resourceType: entry.resource.resourceType,
                        resourceId: entry.resource.id,
                        resourceJson: entry.resource,
                        fetchedAt: new Date()
                    },
                    update: {
                        resourceJson: entry.resource,
                        fetchedAt: new Date()
                    }
                });
                // Normalize
                await normalizationService.normalize(profileId, 'epic', entry.resource.resourceType, entry.resource.id, entry.resource);
            }));
        } else if (resourceData.id) {
            // Single resource (e.g. Patient)
            await prisma.profileFhirResourceRaw.upsert({
                where: {
                    profileId_provider_resourceType_resourceId: {
                        profileId,
                        provider: 'epic',
                        resourceType: resourceType,
                        resourceId: resourceData.id
                    }
                },
                create: {
                    profileId,
                    provider: 'epic',
                    resourceType: resourceType,
                    resourceId: resourceData.id,
                    resourceJson: resourceData,
                    fetchedAt: new Date()
                },
                update: {
                    resourceJson: resourceData,
                    fetchedAt: new Date()
                }
            });

            // Normalize
            await normalizationService.normalize(profileId, 'epic', resourceType, resourceData.id, resourceData);
        }

        return { success: true, resourceType, data: resourceData };
    }

    /**
     * Retrieves the clean, aggregated data for a resource type.
     */
    async getCleanResource(profileId: string, resourceType: string): Promise<any> {
        const record = await prisma.profileFhirResourceClean.findFirst({
            where: { profileId, resourceType }
        });

        return record ? record.cleanJson : [];
    }
}

export const ehrService = new EHRService();
