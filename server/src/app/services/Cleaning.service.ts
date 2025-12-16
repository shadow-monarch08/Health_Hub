import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from "../../config/environment"
import logger from '../../config/logger';

const connectionString = env.DB_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export class CleaningService {

    /**
     * Triggered after normalization. Aggregates data for a specific profile and resource type.
     */
    async clean(profileId: string, resourceType: string) {
        try {
            // 1. Fetch all normalized records for this profile & type
            const normalizedRecords = await prisma.profileFhirResourceNormalized.findMany({
                where: { profileId, resourceType }
            });

            if (normalizedRecords.length === 0) return;

            let cleanData: any = {};

            // 2. Aggregate based on type
            switch (resourceType) {
                case 'MedicationRequest':
                    cleanData = this.aggregateMedications(normalizedRecords);
                    break;
                case 'Condition':
                    cleanData = this.aggregateConditions(normalizedRecords);
                    break;
                case 'Observation':
                    cleanData = this.aggregateObservations(normalizedRecords);
                    break;
                case 'Immunization':
                    cleanData = this.aggregateImmunizations(normalizedRecords);
                    break;
                case 'AllergyIntolerance':
                    cleanData = this.aggregateAllergies(normalizedRecords);
                    break;
                case 'Encounter':
                    cleanData = this.aggregateEncounters(normalizedRecords);
                    break;
                case 'Procedure':
                    cleanData = this.aggregateProcedures(normalizedRecords);
                    break;
                default:
                    // Unknown types: just take the latest one
                    const latest = normalizedRecords.sort((a, b) => new Date(b.normalizedAt).getTime() - new Date(a.normalizedAt).getTime())[0];
                    // Contract says "clean_json" -> summary only. 
                    // Let's store it as an Object keyed by "Unknown".
                    if (latest) cleanData = [{ status: 'unknown', ...(latest.normalizedJson as object) }];
            }

            // 3. Save to Clean Table (Strict Summary Rule)
            // The unique constraint @@unique([profileId, resourceType]) now exists.
            // We use upsert to replace the ENTIRE entry with the new clean summary.

            // The 'cleanData' from aggregate methods is now a LIST of summaries (one per code).
            // Example: [{ "Hypertension": {...} }, { "Diabetes": {...} }] -> No, wait.
            // My aggregate methods return an ARRAY of objects.
            // The frontend likely expects a map or a list.
            // The example contract shows: "Hypertension": { ... }
            // Let's make `cleanData` a simple object map keyed by the Condition Name / Med Name.

            // REFACTOR: All aggregate methods below will now return the FINAL JSON OBJECT, not an array.

            // Convert array back to object if needed, or update aggregate methods to return object.
            // Let's update `cleanData` to be `any` (Object) instead of `any[]`.

            // ... Wait, I need to check the aggregate method signatures below. 
            // I will update them to return `any` (Object).

            await prisma.profileFhirResourceClean.upsert({
                where: {
                    profileId_resourceType: {
                        profileId,
                        resourceType
                    }
                },
                update: {
                    cleanJson: cleanData,
                    sources: normalizedRecords.map(r => ({ provider: r.provider, raw_id: r.resourceId, fetchedAt: r.normalizedAt })),
                    createdAt: new Date() // Strictly "Replaced At"
                },
                create: {
                    profileId,
                    resourceType,
                    cleanJson: cleanData,
                    sources: normalizedRecords.map(r => ({ provider: r.provider, raw_id: r.resourceId, fetchedAt: r.normalizedAt }))
                }
            });

            logger.info(`Cleaned ${resourceType} for profile ${profileId}`);

        } catch (error) {
            logger.error(`Cleaning failed for ${resourceType}`, error);
        }
    }

    // --- AGGREGATION LOGIC (SUMMARY ONLY) ---

    private aggregateMedications(records: any[]): any {
        // Output: { "MedName": { status, dose, ... } }
        const summary: { [key: string]: any } = {};

        for (const record of records) {
            const data = record.normalizedJson;
            // Only care about Active medications
            if (data.status === 'completed' || data.status === 'stopped') continue;

            const key = record.canonicalCode || data.medication || 'Unknown Medication';

            // Conflict resolution: Latest authored date wins
            const existing = summary[key];
            const isNewer = !existing || (new Date(data.authoredOn) > new Date(existing.start_date));

            if (isNewer) {
                summary[key] = {
                    status: data.status,
                    dose: data.dosage,
                    start_date: data.authoredOn,
                    requester: data.requester
                };
            }
        }
        return summary;
    }

    private aggregateConditions(records: any[]): any {
        // Output: { "ConditionName": { code, status, onset } }
        const summary: { [key: string]: any } = {};

        for (const record of records) {
            const data = record.normalizedJson;
            // Only active
            // logic: if status is 'resolved' or 'inactive', skip? 
            // Contract says "Active conditions only".
            if (data.clinicalStatus === 'resolved' || data.clinicalStatus === 'inactive') continue;

            const key = record.canonicalCode || data.condition || 'Unknown Condition';

            // For conditions, we usually want the EARLIEST onset (when it started) 
            // BUT the LATEST clinical status check.
            // Since we receive snapshots, we assume the record itself is the latest fact.

            const existing = summary[key];
            // If already exists, maybe check if this record provides more detail?
            // Simple rule: Latest record wins for status, Earliest wins for onset.

            if (!existing) {
                summary[key] = {
                    code: record.canonicalCode,
                    status: data.clinicalStatus,
                    onset_date: data.onset,
                    recorded_date: data.recordedDate
                };
            } else {
                // Update stats if newer record
                if (data.recordedDate > existing.recorded_date) {
                    summary[key].status = data.clinicalStatus;
                    summary[key].recorded_date = data.recordedDate;
                }
                // Keep earliest onset
                if (data.onset && (!existing.onset_date || data.onset < existing.onset_date)) {
                    summary[key].onset_date = data.onset;
                }
            }
        }
        return summary;
    }

    private aggregateObservations(records: any[]): any {
        // Output: { "Test Name": { latest: { val, date }, trend: '...' } }
        const summary: { [key: string]: any } = {};

        // 1. Group all by key first to sort
        const groups: { [key: string]: any[] } = {};

        for (const r of records) {
            const key = r.canonicalCode || r.normalizedJson.testName || 'Unknown Test';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r.normalizedJson);
        }

        // 2. Compute Summary per group
        for (const key in groups) {
            const sorted = groups[key].sort((a, b) => new Date(b.effectiveDateTime).getTime() - new Date(a.effectiveDateTime).getTime());
            const latest = sorted[0];
            const previous = sorted[1]; // Next latest

            if (!latest) continue;

            summary[key] = {
                latest: {
                    value: latest.value,
                    unit: latest.unit || '', // Normalization needs to ensure unit field exists
                    date: latest.effectiveDateTime,
                    category: latest.category
                }
            };

            if (previous) {
                summary[key].previous = {
                    value: previous.value,
                    date: previous.effectiveDateTime
                };
            }
        }
        return summary;
    }

    private aggregateImmunizations(records: any[]): any {
        // Output: { "Vaccine": { date, status } }
        const summary: { [key: string]: any } = {};

        for (const r of records) {
            const data = r.normalizedJson;
            const key = r.canonicalCode || data.vaccineName || 'Unknown Vaccine';

            // Latest dose wins
            const existing = summary[key];
            if (!existing || data.date > existing.date) {
                summary[key] = {
                    date: data.date,
                    status: data.status,
                    site: data.site
                };
            }
        }
        return summary;
    }

    private aggregateAllergies(records: any[]): any {
        const summary: { [key: string]: any } = {};

        for (const r of records) {
            const data = r.normalizedJson;
            // Active only
            if (data.clinicalStatus === 'resolved') continue;

            const key = r.canonicalCode || data.allergy || 'Unknown Allergy';
            // Latest wins
            const existing = summary[key];
            if (!existing || data.recordedDate > existing.recordedDate) {
                summary[key] = {
                    criticality: data.criticality,
                    reaction: data.reaction,
                    status: data.clinicalStatus,
                    recordedDate: data.recordedDate
                };
            }
        }
        return summary;
    }

    private aggregateEncounters(records: any[]): any {
        // Just the latest 5 encounters, no grouping
        const sorted = records
            .map(r => r.normalizedJson)
            .sort((a, b) => new Date(b.period?.start || 0).getTime() - new Date(a.period?.start || 0).getTime())
            .slice(0, 5); // Hard limit

        return sorted.map(e => ({
            type: e.type,
            class: e.class,
            date: e.period?.start,
            provider: e.provider,
            location: e.location
        }));
    }

    private aggregateProcedures(records: any[]): any {
        // Latest 10 procedures
        const sorted = records
            .map(r => r.normalizedJson)
            .sort((a, b) => new Date(b.performedDateTime || 0).getTime() - new Date(a.performedDateTime || 0).getTime())
            .slice(0, 10);

        return sorted.map(p => ({
            procedure: p.procedure,
            date: p.performedDateTime,
            status: p.status
        }));
    }
}

export const cleaningService = new CleaningService();
