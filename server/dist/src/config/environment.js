"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('4000').transform((val) => parseInt(val, 10)),
    DB_URL: zod_1.z.string(),
    DB_HOST: zod_1.z.string(),
    DB_PORT: zod_1.z.string().default('5432').transform((val) => parseInt(val, 10)),
    DB_USER: zod_1.z.string(),
    DB_PASSWORD: zod_1.z.string(),
    DB_NAME: zod_1.z.string(),
    REDIS_HOST: zod_1.z.string(),
    REDIS_PORT: zod_1.z.string().default('6379').transform((val) => parseInt(val, 10)),
    JWT_SECRET: zod_1.z.string(),
    ENCRYPTION_KEY: zod_1.z.string(),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
    EMAIL_HOST: zod_1.z.string(),
    EMAIL_PORT: zod_1.z.string().default('5432').transform((val) => parseInt(val, 10)),
    EMAIL_USER: zod_1.z.string(),
    EMAIL_PASSWORD: zod_1.z.string(),
    EMAIL_FROM: zod_1.z.string(),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    throw new Error('Invalid environment variables');
}
exports.env = _env.data;
