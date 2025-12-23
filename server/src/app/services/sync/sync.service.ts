import prisma from "../../../config/prisma.config";
import logger from "../../../config/logger.config";
import redisClient from "../../../config/redis.config";
import { cooldownKey, SYNC_COOLDOWN_MS, SYNC_QUEUE_NAME, syncJobId } from "../../../jobs/constants/sync.constants";
import { sseRedis } from "../../sse/sseSubscriber";
import { EhrRegistry } from "../../ehr/ehr.registry";
import { syncQueue } from "../../../jobs/queues/sync.queue";
import { syncStatusService } from "./syncStatus.service";

export class SyncService {

    /**
   * Triggers a full sync for the given profile and provider.
   * Orchestrates the sync process using the appropriate EHR provider.
   */
    async syncProfile(
        userId: string,
        profileId: string,
        providerName: string = "epic",
        jobId: string
    ) {
        logger.info(`Starting Sync Job ${jobId} for profile ${profileId} (${providerName})`);

        try {
            // 1. Update Sync Job Record (created by caller)
            await prisma.profileSyncJob.update({
                where: { jobId },
                data: {
                    status: "syncing",
                    startedAt: new Date(),
                },
            });

            // 2. Resolve Provider
            const provider = EhrRegistry.get(providerName);

            // 3. Delegate to Provider
            await provider.sync(profileId, jobId);

            // 4. Update Job Status on Success
            await prisma.profileSyncJob.update({
                where: { jobId },
                data: {
                    status: "success",
                    provider: providerName,
                    completedAt: new Date(),
                    error: null,
                },
            });
            redisClient.set(cooldownKey(profileId, providerName), "1", "PX", SYNC_COOLDOWN_MS);

            // Bradcasting redis event for fetching
            sseRedis.publish(`sse:${jobId}`, JSON.stringify({ event: "complete", resourceType: "all" }));

            logger.info(`Sync Job ${jobId} completed successfully.`);
        } catch (error: any) {
            logger.error(`Critical error in Sync Job for ${profileId}`, error);
            await prisma.profileSyncJob.update({
                where: { jobId },
                data: {
                    status: "failed",
                    provider: providerName,
                    completedAt: new Date(),
                    error: error.message || String(error),
                },
            });
        }
    }

    /**
     * Creates a new sync job in the queue.
     * Checks for cooldowns and existing jobs.
     */
    async createSyncJob(profileId: string, userId: string, provider: string): Promise<{
        jobId?: string;
        targetUrl?: string; // For redirect convenience if needed
        status: string;
        retryAfterSeconds?: number;
    }> {
        const syncStatus = await syncStatusService.resolveSyncStatus(profileId, provider);
        const frontendRedirect = process.env.FRONTEND_REDIRECT || "https://frontend.example.com/epic/success";

        if (syncStatus.status === "running") {
            return {
                targetUrl: `${frontendRedirect}?status=connected&profileId=${profileId}&jobStatus=running`,
                jobId: syncStatus.jobId,
                status: "running"
            }
        } else if (syncStatus.status === "cooldown") {
            return {
                targetUrl: `${frontendRedirect}?status=connected&profileId=${profileId}&jobStatus=cooldown`,
                status: "cooldown",
                retryAfterSeconds: syncStatus.retryAfterSeconds
            }
        }

        const jobId = syncJobId(profileId, provider)

        await syncQueue.add(SYNC_QUEUE_NAME, {
            jobId,
            profileId,
            userId,
            provider: provider
        }, {
            jobId,
        })

        await prisma.profileSyncJob.upsert({
            where: {
                jobId
            },
            update: {
                status: "pending"
            },
            create: {
                jobId,
                profileId,
                provider,
                status: "pending",
            },
        })

        // Construct friendly redirect URL for OAuth flow convenience
        const targetUrl = `${frontendRedirect}?status=connected&profileId=${profileId}&jobId=${encodeURIComponent(jobId)}&jobStatus=pending`;

        return {
            jobId,
            status: "pending",
            targetUrl
        }
    }
}

export const syncService = new SyncService();
