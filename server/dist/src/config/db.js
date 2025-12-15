"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const environment_1 = require("./environment");
const logger_1 = __importDefault(require("./logger"));
const pool = new pg_1.Pool({
    host: environment_1.env.DB_HOST,
    port: environment_1.env.DB_PORT,
    user: environment_1.env.DB_USER,
    password: environment_1.env.DB_PASSWORD,
    database: environment_1.env.DB_NAME,
});
pool.on('error', (err) => {
    logger_1.default.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// Test connection
pool.connect()
    .then((client) => {
    logger_1.default.info('✅ Database connected successfully');
    client.release();
})
    .catch((err) => {
    logger_1.default.error('❌ Database connection failed', err);
});
exports.default = pool;
