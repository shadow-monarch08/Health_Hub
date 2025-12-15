import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from "../../config/environment"
import { createProfileSchema } from '../utils/validation/profile.schema';
import { z } from 'zod';

const connectionString = env.DB_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export class ProfileService {
    async createProfile(userId: string, data: z.infer<typeof createProfileSchema>) {
        return prisma.profile.create({
            data: {
                userId,
                displayName: data.displayName,
                legalName: data.legalName,
                dob: data.dob ? new Date(data.dob) : null,
                relationship: data.relationship,
            },
        });
    }

    async getProfiles(userId: string) {
        return prisma.profile.findMany({
            where: { userId },
            include: {
                emrConnections: {
                    select: {
                        id: true,
                        provider: true,
                        status: true,
                        patientEmrId: true,
                        // Not selecting tokens
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}

export const profileService = new ProfileService();
