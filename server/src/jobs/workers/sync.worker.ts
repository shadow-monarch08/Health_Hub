// src/app/workers/medication.worker.ts
import { Job, Worker } from "bullmq";
import redisClient from "../../config/redis.config";
import { syncService } from "../../app/services/sync.service";
import { SYNC_QUEUE_NAME } from "../constants/sync.constants";
import logger from "../../config/logger.config";

interface JobData {
    jobId: string;
    profileId: string;
    userId: string;
    provider: string;
};

export const syncWorker = new Worker(
    SYNC_QUEUE_NAME,
    async (job: Job<JobData>) => {
        const { jobId, profileId, userId, provider } = job.data;

        logger.info('🔄 Sync worker started job : ', job.id);

        await syncService.syncProfile(userId, profileId, provider, jobId);

        logger.info('✅ Sync worker completed job : ', job.id);
    },
    { connection: redisClient }
);


syncWorker.on("ready", () => {
    logger.info(`🚀 Sync worker ready`);
});

syncWorker.on("failed", (job, err) => {
    logger.info(`❌ Sync worker failed job : ${job?.id} with error : ${err}`);
});