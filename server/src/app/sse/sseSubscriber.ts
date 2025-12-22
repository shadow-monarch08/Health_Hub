import Redis from "ioredis";
import logger from "../../config/logger.config";
import { getClient } from "./sseBus";
import { env } from "../../config/environment.config";

export const sseRedis = new Redis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
});

export function startSseSubscriber() {
    sseRedis.psubscribe('sse:*');

    sseRedis.on('pmessage', (_, channel, message) => {
        const jobId = channel.replace('sse:', '');
        const res = getClient(jobId);

        if (!res) return;
        res.write(`data: ${message}\n\n`);
        res.flush?.();
    });

    logger.info('📡 SSE Redis subscriber started');
}