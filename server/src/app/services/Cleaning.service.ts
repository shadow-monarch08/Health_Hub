import prisma from '../../config/prisma';
import { env } from "../../config/environment"
import logger from '../../config/logger';

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
        // Output: { "MedName": { ...structured data... } }
        const summary: { [key: string]: any } = {};

        for (const record of records) {
            const data = record.normalizedJson;
            // Only care about Active medications
            if (data.status === 'completed' || data.status === 'stopped') continue;

            // Handle both new and old structure for safe transition
            const medName = data.medication?.name || data.medication || 'Unknown Medication';
            const key = record.canonicalCode || medName;

            // Conflict resolution: Latest start date wins
            // New structure uses 'course.start', old used 'authoredOn'
            const newStartStr = data.course?.start || data.authoredOn;
            const existingStartStr = summary[key]?.course?.start;

            const newDate = newStartStr ? new Date(newStartStr) : new Date(0);
            const existingDate = existingStartStr ? new Date(existingStartStr) : new Date(0);

            const isNewer = !summary[key] || (newDate > existingDate);

            if (isNewer) {
                // Calculate Derived Fields
                let end = data.course?.end;
                if (!end && newStartStr && data.course?.duration_days) {
                    try {
                        const s = new Date(newStartStr);
                        s.setDate(s.getDate() + Number(data.course.duration_days));
                        end = s.toISOString().split('T')[0];
                    } catch (e) { /* ignore date error */ }
                }

                summary[key] = {
                    medication: {
                        name: medName,
                        form: data.medication?.form || 'unknown'
                    },
                    dosage: {
                        amount: data.dosage?.amount || 1, // field might be missing in old data
                        unit: data.dosage?.unit || 'unit',
                        route: data.dosage?.route || 'oral',
                        frequency_per_day: data.dosage?.frequency_per_day || 1
                    },
                    course: {
                        start: newStartStr,
                        end: end,
                        duration_days: data.course?.duration_days || data.supply?.days
                    },
                    reason: data.reason,
                    status: data.status,
                    supply: {
                        days: data.supply?.days,
                        refills: data.supply?.refills
                    }
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
