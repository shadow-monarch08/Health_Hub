import prisma from "../../../config/prisma.config";
import { createProfileSchema } from "../../utils/validation/profile.schema";
import { z } from "zod";
import { cryptoService } from "../crypto/crypto.service";

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    patient?: string;
    refresh_token?: string;
    id_token?: string;
}

export class ProfileService {
    async createProfile(
        userId: string,
        data: z.infer<typeof createProfileSchema>
    ) {
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
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Retrieves the clean, aggregated data for a resource type.
     */
    async getCleanResource(
        profileId: string,
        resourceType: string
    ): Promise<any> {
        const record = await prisma.profileFhirResourceClean.findFirst({
            where: { profileId, resourceType },
        });

        return record ? record.cleanJson : [];
    }

    /**
     * Retrieves ALL clean, aggregated data for a profile from the database.
     * Returns a structured object with keys for each resource type.
     */
    async getProfileData(profileId: string): Promise<any> {
        const records = await prisma.profileFhirResourceClean.findMany({
            where: { profileId },
        });

        const data: any = {
            patient: {},
            conditions: [],
            allergies: [],
            medications: [],
            labs: [],
            encounters: [],
            procedures: [],
            immunizations: [],
        };

        records.forEach((record) => {
            switch (record.resourceType) {
                case "Patient":
                    data.patient = record.cleanJson;
                    break;
                case "Condition":
                    data.conditions = record.cleanJson;
                    break;
                case "AllergyIntolerance":
                    data.allergies = record.cleanJson;
                    break;
                case "MedicationRequest":
                    data.medications = record.cleanJson;
                    break;
                case "Observation":
                    data.labs = record.cleanJson;
                    break;
                case "Encounter":
                    data.encounters = record.cleanJson;
                    break;
                case "Procedure":
                    data.procedures = record.cleanJson;
                    break;
                case "Immunization":
                    data.immunizations = record.cleanJson;
                    break;
            }
        });

        return data;
    }

    /**
     * Stores the EHR session connection in the DB.
     */
    async storeConnection(
        userId: string,
        profileId: string,
        provider: string,
        tokenData: TokenResponse
    ): Promise<void> {
        const patientId = tokenData.patient || "unknown";

        await prisma.profileEmrConnection.upsert({
            where: {
                profileId_provider: {
                    profileId,
                    provider: provider,
                },
            },
            create: {
                profileId,
                provider: provider,
                patientEmrId: patientId,
                accessTokenEncrypted: cryptoService.encrypt(tokenData.access_token),
                refreshTokenEncrypted: tokenData.refresh_token
                    ? cryptoService.encrypt(tokenData.refresh_token)
                    : null,
                expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
                scope: tokenData.scope,
                status: "connected",
            },
            update: {
                patientEmrId: patientId,
                accessTokenEncrypted: cryptoService.encrypt(tokenData.access_token),
                refreshTokenEncrypted: tokenData.refresh_token
                    ? cryptoService.encrypt(tokenData.refresh_token)
                    : null,
                expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
                scope: tokenData.scope,
                status: "connected",
                updatedAt: new Date(),
            },
        });

        // Also update onboarding status
        await this.updateOnboardingStatus(userId);
    }

    async updateOnboardingStatus(userId: string) {
        // Check if user has at least one profile with at least one connection
        const userProfiles = await prisma.profile.findMany({
            where: { userId },
            include: { emrConnections: true },
        });

        const hasConnection = userProfiles.some(
            (p) =>
                p.emrConnections.length > 0 &&
                p.emrConnections.some((c) => c.status === "connected")
        );

        if (hasConnection) {
            await prisma.user.update({
                where: { id: userId },
                data: { onboardingCompleted: true },
            });
        }
    }
}

export const profileService = new ProfileService();
