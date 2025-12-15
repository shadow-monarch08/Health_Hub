"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ehrService = exports.EHRService = void 0;
const client_1 = require("../../../generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const environment_1 = require("../../config/environment");
const logger_1 = __importDefault(require("../../config/logger"));
const connectionString = environment_1.env.DB_URL;
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
const prisma = new client_1.PrismaClient({ adapter });
class EHRService {
    /**
     * Fetches a generic FHIR resource for the current session's patient.
     * @param sessionId The session ID from the frontend.
     * @param resourceType The FHIR resource type (e.g., 'Observation', 'Condition').
     */
    fetchResource(userId, profileId, resourceType) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Verify profile ownership and retrieve connection
            const profile = yield prisma.profile.findFirst({
                where: { id: profileId, userId }
            });
            if (!profile) {
                throw new Error('Forbidden: Profile does not belong to user');
            }
            const connection = yield prisma.profileEmrConnection.findUnique({
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
            let url = `${process.env.EPIC_FHIR_BASE}/${resourceType}?patient=${patientId}`;
            // 3. Handle specific resource requirements
            if (resourceType === 'Observation') {
                // e.g. add category
            }
            logger_1.default.info(`Fetching EHR Data: ${resourceType} for patient ${patientId}`);
            // 4. Call Epic FHIR API
            const response = yield fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/fhir+json',
                },
            });
            if (!response.ok) {
                const errorText = yield response.text();
                logger_1.default.error(`FHIR ${resourceType} fetch failed: ${errorText}`);
                if (response.status === 401) {
                    throw new Error('Unauthorized: Token expired or invalid');
                }
                throw new Error(`Failed to fetch ${resourceType}: ${response.status} ${response.statusText}`);
            }
            const resourceData = yield response.json();
            return { success: true, resourceType, data: resourceData };
        });
    }
}
exports.EHRService = EHRService;
exports.ehrService = new EHRService();
