import prisma from '../../config/prisma';
import { env } from "../../config/environment"
import logger from '../../config/logger';
import { ehrService } from './EHR.service';

export class SyncService {

    /**
     * Triggers a full sync for the given profile and provider.
     * Fetches Patient, Medications, Conditions, and Observations.
     */
    async syncProfile(userId: string, profileId: string, provider: string = 'epic') {
        const jobId = `sync-${profileId}-${Date.now()}`;
        logger.info(`Starting Sync Job ${jobId} for profile ${profileId}`);

        try {
            // 1. Create Sync Job Record
            await prisma.profileSyncJob.create({
                data: {
                    profileId,
                    status: 'syncing',
                    startedAt: new Date()
                }
            });

            // 2. Fetch Resources concurrently
            const resources = ['Patient', 'MedicationRequest', 'Condition', 'Observation', 'Immunization', 'AllergyIntolerance', 'Encounter', 'Procedure'];

            // We run them sequentially or parallel? Parallel is faster but might hit rate limits.
            // Let's do parallel for now.
            const results = await Promise.allSettled(resources.map(async (resource) => {
                try {
                    await ehrService.fetchResource(userId, profileId, resource);
                    return { resource, status: 'success' };
                } catch (err: any) {
                    logger.error(`Sync failed for ${resource}`, err);
                    throw new Error(`${resource}: ${err.message}`);
                }
            }));

            // 3. Check results
            const errors = results
                .filter(r => r.status === 'rejected')
                .map(r => (r as PromiseRejectedResult).reason.message);

            // 4. Update Job Status
            if (errors.length > 0) {
                await prisma.profileSyncJob.updateMany({
                    where: { profileId, status: 'syncing' }, // Naive match active job
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        error: errors.join(', ')
                    }
                });
            } else {
                await prisma.profileSyncJob.updateMany({
                    where: { profileId, status: 'syncing' },
                    data: {
                        status: 'success',
                        completedAt: new Date(),
                        error: null
                    }
                });
            }

            logger.info(`Sync Job ${jobId} completed. Errors: ${errors.length}`);

        } catch (error: any) {
            logger.error(`Critical error in Sync Job for ${profileId}`, error);
            await prisma.profileSyncJob.updateMany({
                where: { profileId, status: 'syncing' },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                    error: error.message
                }
            });
        }
    }
}

export const syncService = new SyncService();
