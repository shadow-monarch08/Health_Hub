import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from "../../config/environment"
import logger from '../../config/logger';

const connectionString = env.DB_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    patient?: string;
    refresh_token?: string;
    id_token?: string;
}

export class EHRService {
    /**
     * Fetches a generic FHIR resource for the current session's patient.
     * @param sessionId The session ID from the frontend.
     * @param resourceType The FHIR resource type (e.g., 'Observation', 'Condition').
     */
    async fetchResource(userId: string, profileId: string, resourceType: string): Promise<any> {
        // 1. Verify profile ownership and retrieve connection
        const profile = await prisma.profile.findFirst({
            where: { id: profileId, userId }
        });

        if (!profile) {
            throw new Error('Forbidden: Profile does not belong to user');
        }

        const connection = await prisma.profileEmrConnection.findUnique({
            where: {
                profileId_provider: {
                    profileId,
                    provider: 'epic' // Defaulting to epic for now as per instructions
                }
            }
        });

        if (!connection) {
            throw new Error('Profile not connected to Epic');
        }

        const accessToken = connection.accessTokenEncrypted; // TODO: Decrypt
        const patientId = connection.patientEmrId;

        if (!accessToken || !patientId) {
            throw new Error('Invalid connection data: missing token or patient ID');
        }

        // 2. Construct FHIR URL
        let url: string;
        if (resourceType === 'Patient') {
            url = `${process.env.EPIC_FHIR_BASE}/Patient/${patientId}`;
        } else {
            url = `${process.env.EPIC_FHIR_BASE}/${resourceType}?patient=${patientId}`;
        }

        // 3. Handle specific resource requirements
        if (resourceType === 'Observation') {
            // e.g. add category
            url += '&category=vital-signs'; // Example: default to vitals or laboratory
        }

        logger.info(`Fetching EHR Data: ${resourceType} for patient ${patientId}`);

        // 4. Call Epic FHIR API
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/fhir+json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`FHIR ${resourceType} fetch failed: ${errorText}`);

            if (response.status === 401) {
                throw new Error('Unauthorized: Token expired or invalid');
            }
            throw new Error(`Failed to fetch ${resourceType}: ${response.status} ${response.statusText}`);
        }

        const resourceData = await response.json();
        return { success: true, resourceType, data: resourceData };
    }
}

export const ehrService = new EHRService();
