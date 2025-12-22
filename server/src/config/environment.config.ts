import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
    DB_URL: z.string(),
    DB_HOST: z.string(),
    DB_PORT: z.string().default('5432').transform((val) => parseInt(val, 10)),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
    JWT_SECRET: z.string(),
    ENCRYPTION_KEY: z.string(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
    EMAIL_HOST: z.string(),
    EMAIL_PORT: z.string().default('5432').transform((val) => parseInt(val, 10)),
    EMAIL_USER: z.string(),
    EMAIL_PASSWORD: z.string(),
    EMAIL_FROM: z.string(),
    FRONTEND_ORIGIN: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    throw new Error('Invalid environment variables');
}

export const env = _env.data;
