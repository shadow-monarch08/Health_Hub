import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./environment.config";
import logger from "./logger.config";

const connectionString = env.DB_URL;
const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter }); // Removed explicit log: ['query'] for production readiness unless requested

export default prisma;
