
import { syncQueue } from "../../../jobs/queues/sync.queue";
import redisClient from "../../../config/redis.config";
import prisma from "../../../config/prisma.config";
import {
  SYNC_COOLDOWN_MS,
  syncJobId,
  cooldownKey
} from "../../../jobs/constants/sync.constants";


export class SyncStatusService {
  async resolveSyncStatus(
    profileId: string,
    provider: string
  ) {
    const jobId = syncJobId(profileId, provider);

    /* 1️⃣ Execution lock — BullMQ jobId */
    const existingJob = await syncQueue.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === "waiting" || state === "active" || state === "delayed") {
        return {
          status: "running",
          jobId
        };
      }
    }

    /* 2️⃣ Redis cooldown lock (fast path) */
    const redisTtl = await redisClient.ttl(cooldownKey(profileId, provider));
    if (redisTtl > 0) {
      return {
        status: "cooldown",
        retryAfterSeconds: redisTtl
      };
    }

    /* 3️⃣ DB fallback (authoritative) */
    const profile = await prisma.profileSyncJob.findFirst({
      where: {
        jobId,
        OR: [
          {
            status: "success"
          },
          {
            status: "syncing"
          },
          {
            status: "pending"
          }
        ]
      },
      orderBy: {
        completedAt: "desc",
      },
      select: { completedAt: true, status: true }
    });

    if (profile?.completedAt) {
      if (profile.status === "success") {

        const elapsed =
          Date.now() - profile.completedAt.getTime();

        if (elapsed < SYNC_COOLDOWN_MS) {
          const remainingMs = SYNC_COOLDOWN_MS - elapsed;

          // Rehydrate Redis cooldown lock
          await redisClient.set(
            cooldownKey(profileId, provider),
            "1",
            "PX",
            remainingMs
          );

          return {
            status: "cooldown",
            retryAfterSeconds: Math.ceil(remainingMs / 1000)
          };
        }
      } else if (profile.status === "syncing" || profile.status === "pending") {
        return {
          status: "running",
          jobId
        };
      }
    }

    /* 4️⃣ Safe to sync */
    return {
      status: "idle"
    };
  }
}

export const syncStatusService = new SyncStatusService();