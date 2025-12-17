import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './environment';
import logger from './logger';

const connectionString = env.DB_URL;
const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter }); // Removed explicit log: ['query'] for production readiness unless requested

export default prisma;
