import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../config/logger';
import { env } from '../config/environment';

dotenv.config();

const redisHost = env.REDIS_HOST || 'localhost';
const redisPort = env.REDIS_PORT || 6379;

const redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
    logger.info(`🚀 Redis running in ${redisHost} mode on port ${redisPort}`);
});

redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

export default redisClient;