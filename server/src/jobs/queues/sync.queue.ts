import { Queue } from "bullmq";
import redisClient from "../../config/redis.config";
import { SYNC_QUEUE_NAME } from "../constants/sync.constants";

export const syncQueue = new Queue(SYNC_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    delay: 3000,
    removeOnComplete: true,
    removeOnFail: {
      age: 12 * 3600, // Keep failed jobs for 24 hours
      count: 1000,
    },
  },
});
