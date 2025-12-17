import prisma from '../../config/prisma';
import { env } from "../../config/environment"
import { createProfileSchema } from '../utils/validation/profile.schema';
import { z } from 'zod';

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
