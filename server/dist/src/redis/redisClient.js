"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../config/logger"));
const environment_1 = require("../config/environment");
dotenv_1.default.config();
const redisHost = environment_1.env.REDIS_HOST || 'localhost';
const redisPort = environment_1.env.REDIS_PORT || 6379;
const redisClient = new ioredis_1.default({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
});
redisClient.on('connect', () => {
    logger_1.default.info(`🚀 Redis running in ${redisHost} mode on port ${redisPort}`);
});
redisClient.on('error', (err) => {
    logger_1.default.error('Redis connection error:', err);
});
exports.default = redisClient;
