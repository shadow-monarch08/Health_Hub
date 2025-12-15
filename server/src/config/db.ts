import { Pool } from 'pg';
import { env } from './environment';
import logger from './logger';

const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test connection
pool.connect()
    .then((client) => {
        logger.info('✅ Database connected successfully');
        client.release();
    })
    .catch((err) => {
        logger.error('❌ Database connection failed', err);
    });

export default pool;
