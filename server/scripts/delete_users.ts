
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from "../src/config/environment"

const connectionString = env.DB_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
    try {
        await prisma.profileEmrConnection.deleteMany({});
        await prisma.profile.deleteMany({});
        const deleted = await prisma.user.deleteMany({});
        console.log(`Deleted ${deleted.count} users.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
