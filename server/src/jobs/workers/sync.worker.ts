// src/app/workers/medication.worker.ts
import { Job, Worker } from "bullmq";
import redisClient from "../../config/redis.config";
import { ehrService } from "../../app/services/EHR.service";

interface JobData {
    jobId: string;
    profileId: string;
    userId: string;
    provider: string;
};

new Worker(
    "sync-ehrData",
    async (job: Job<JobData>) => {
        const { jobId, profileId, userId, provider } = job.data;

        await ehrService.syncProfile(userId, profileId, provider, jobId);

    },
    { connection: redisClient }
);
