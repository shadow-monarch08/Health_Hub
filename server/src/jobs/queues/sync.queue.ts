import { Queue } from "bullmq";
import redisClient from "../../config/redis.config";

export const syncQueue = new Queue("sync-ehrData", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
      count: 1000,
    },
  },
});
