import prisma from "../../../config/prisma.config";
import logger from "../../../config/logger.config";
import { NormalizedRecord } from "../common/ehrProvider.interface";

export class AthenaNormalizer {
    /**
     * Normalizes raw Athena FHIR R4 data into the canonical format.
     */
    async normalize(
        profileId: string,
        resourceType: string,
        resourceId: string,
        rawJson: any
    ): Promise<NormalizedRecord | null> {
        try {
            let normalizedJson: any = {};
            let canonicalCode: string | null = null;
            const provider = "athena";

            switch (resourceType) {
                case "Patient":
                    normalizedJson = this.normalizePatient(rawJson);
                    break;
                case "MedicationRequest":
                    const medResult = this.normalizeMedicationRequest(rawJson);
                    normalizedJson = medResult.data;
                    canonicalCode = medResult.code;
                    break;
                case "Condition":
                    const condResult = this.normalizeCondition(rawJson);
                    normalizedJson = condResult.data;
                    canonicalCode = condResult.code;
                    break;
                case "Observation":
                    const obsResult = this.normalizeObservation(rawJson);
                    normalizedJson = obsResult.data;
                    canonicalCode = obsResult.code;
                    break;
                case "Immunization":
                    const immResult = this.normalizeImmunization(rawJson);
                    normalizedJson = immResult.data;
                    canonicalCode = immResult.code;
                    break;
                case "AllergyIntolerance":
                    const algResult = this.normalizeAllergyIntolerance(rawJson);
                    normalizedJson = algResult.data;
                    canonicalCode = algResult.code;
                    break;
                case "Encounter":
                    const encResult = this.normalizeEncounter(rawJson);
                    normalizedJson = encResult.data;
                    canonicalCode = encResult.code;
                    break;
                case "Procedure":
                    const procResult = this.normalizeProcedure(rawJson);
                    normalizedJson = procResult.data;
                    canonicalCode = procResult.code;
                    break;
                default:
                    normalizedJson = { ...rawJson, _note: "Raw copy" };
            }

            // Upsert into Normalized Table
            await prisma.profileFhirResourceNormalized.upsert({
                where: {
                    profileId_provider_resourceType_resourceId: {
                        profileId,
                        provider,
                        resourceType,
                        resourceId,
                    },
                },
                update: {
                    normalizedJson,
                    canonicalCode,
                    normalizedAt: new Date(),
                },
                create: {
                    profileId,
                    provider,
                    resourceType,
                    resourceId,
                    normalizedJson,
                    canonicalCode,
                },
            });

            return {
                resourceType,
                resourceId,
                normalizedJson,
                canonicalCode,
                provider,
                normalizedAt: new Date(),
            };
        } catch (error) {
            logger.error(
                `Athena Normalization failed for ${resourceType}/${resourceId}`,
                error
            );
            return null;
        }
    }

    // --- Normalization Helpers (FHIR R4 Standard) ---

    private normalizePatient(raw: any) {
        // Name: Try 'official', then 'usual', then first
        const official = raw.name?.find((n: any) => n.use === 'official') || raw.name?.[0];
        const nameStr = official ? `${official.given?.join(' ') || ''} ${official.family || ''}`.trim() : "Unknown";

        // Address: Try 'home', then first
        const homeAddr = raw.address?.find((a: any) => a.use === 'home') || raw.address?.[0];
        let addressStr = null;
        if (homeAddr) {
            addressStr = `${homeAddr.line?.join(' ') || ''}, ${homeAddr.city || ''}, ${homeAddr.state || ''} ${homeAddr.postalCode || ''}`.replace(/^, /, '').trim();
        }

        return {
            name: nameStr,
            gender: raw.gender ? raw.gender.toLowerCase() : 'unknown', // FHIR usually lowercase
            birthDate: raw.birthDate,
            address: addressStr
        };
    }

    private normalizeMedicationRequest(raw: any) {
        // Robust FHIR R4 extraction - Improvised/Standard

        // 1. Code (RxNorm)
        const result = this.extractCanonicalCode(
            raw.medicationCodeableConcept,
            ["http://www.nlm.nih.gov/research/umls/rxnorm", "http://snomed.info/sct"]
        );

        // 2. Name
        let name = result.display || raw.medicationCodeableConcept?.text || "Unknown Medication";
        if (name === "Unknown Medication" && raw.medicationReference?.display) {
            name = raw.medicationReference.display;
        }

        // 3. Form
        const form = raw.category?.[0]?.text || null; // Often not explicit in basic R4, or in med resource

        // 4. Dosage
        const doseInstr = raw.dosageInstruction?.[0];
        const route = doseInstr?.route?.coding?.[0]?.display || doseInstr?.route?.text;
        const doseQty = doseInstr?.doseAndRate?.[0]?.doseQuantity;

        // Frequency (Simplified)
        const freq = doseInstr?.timing?.repeat?.frequency || 1;

        // 5. Course
        const start = raw.authoredOn || raw.dispenseRequest?.validityPeriod?.start;
        const end = raw.dispenseRequest?.validityPeriod?.end;

        return {
            data: {
                status: raw.status, // active, completed, etc.
                medication: {
                    name: name,
                    form: form
                },
                dosage: {
                    amount: doseQty?.value,
                    unit: doseQty?.unit,
                    route: route,
                    frequency_per_day: freq,
                },
                course: {
                    start: start,
                    end: end,
                    duration_days: raw.dispenseRequest?.expectedSupplyDuration?.value,
                },
                reason: raw.reasonCode?.[0]?.text, // or coding display
                supply: {
                    days: raw.dispenseRequest?.expectedSupplyDuration?.value,
                    refills: raw.dispenseRequest?.numberOfRepeatsAllowed,
                }
            },
            code: result.code,
        };
    }

    private normalizeCondition(raw: any) {
        // Proven Patterns from Ethena-data.json:
        // code: { text, coding: [ {system: "http://snomed.info/sct"...} ] }
        // clinicalStatus: { coding: [ {code: "active"} ] }
        // verificationStatus: { coding: [ {code: "confirmed"} ] }
        // recordedDate or onsetDateTime

        const result = this.extractCanonicalCode(raw.code, [
            "http://snomed.info/sct",
            "http://hl7.org/fhir/sid/icd-10"
        ]);

        const clinicalStatus = raw.clinicalStatus?.coding?.[0]?.code || raw.clinicalStatus?.text;
        const verificationStatus = raw.verificationStatus?.coding?.[0]?.code || raw.verificationStatus?.text;

        return {
            data: {
                clinicalStatus: clinicalStatus,
                verificationStatus: verificationStatus,
                condition: result.display || raw.code?.text || "Unknown Condition",
                onset: raw.onsetDateTime,
                recordedDate: raw.recordedDate || raw.assertedDate,
            },
            code: result.code, // Prefer SNOMED/ICD
        };
    }

    private normalizeObservation(raw: any) {
        // Ethena-data.json:
        // code: { coding: [{system: "http://loinc.org", code: "..."}] }
        // valueString OR valueCodeableConcept OR valueQuantity
        // effectiveDateTime OR issued

        const result = this.extractCanonicalCode(raw.code, ["http://loinc.org"]);

        // Handle varied value types
        let val = "";
        if (raw.valueString) {
            val = raw.valueString;
        } else if (raw.valueQuantity) {
            val = `${raw.valueQuantity.value} ${raw.valueQuantity.unit || ''}`.trim();
        } else if (raw.valueCodeableConcept) {
            val = raw.valueCodeableConcept.text || raw.valueCodeableConcept.coding?.[0]?.display || "Unknown";
        }

        return {
            data: {
                status: raw.status, // final, etc.
                category: raw.category?.[0]?.coding?.[0]?.code || 'vital-signs', // Fallback
                testName: result.display || raw.code?.text || "Unknown Test",
                value: val,
                effectiveDateTime: raw.effectiveDateTime || raw.issued,
            },
            code: result.code, // LOINC
        };
    }

    private normalizeImmunization(raw: any) {
        // Ethena-data.json:
        // vaccineCode: { coding: [{system: "http://hl7.org/fhir/sid/cvx"}] }
        // occurrenceDateTime
        // site: { coding: ... }

        const result = this.extractCanonicalCode(raw.vaccineCode, ["http://hl7.org/fhir/sid/cvx"]);

        return {
            data: {
                status: raw.status,
                vaccineName: result.display || raw.vaccineCode?.text || "Unknown Vaccine",
                date: raw.occurrenceDateTime,
                site: raw.site?.coding?.[0]?.display || raw.site?.text,
                route: raw.route?.coding?.[0]?.display || raw.route?.text,
            },
            code: result.code,
        };
    }

    private normalizeAllergyIntolerance(raw: any) {
        // Ethena-data.json:
        // code: { coding: RxNorm or Athena internal }
        // reaction: [ { manifestation: [ {coding...} ], severity } ]

        const result = this.extractCanonicalCode(raw.code, [
            "http://www.nlm.nih.gov/research/umls/rxnorm",
            "http://snomed.info/sct"
        ]);

        return {
            data: {
                clinicalStatus: raw.clinicalStatus?.coding?.[0]?.code,
                verificationStatus: raw.verificationStatus?.coding?.[0]?.code,
                allergy: result.display || raw.code?.text || "Unknown Allergy",
                criticality: raw.criticality,
                category: raw.category?.[0],
                recordedDate: raw.recordedDate || raw.onsetDateTime,
                reaction: raw.reaction?.[0]?.manifestation?.[0]?.text || raw.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
            },
            code: result.code,
        };
    }

    private normalizeEncounter(raw: any) {
        // Standard FHIR R4 fallback
        const typeCoding = raw.type?.[0];
        const result = this.extractCanonicalCode(typeCoding, ["http://snomed.info/sct", "http://www.ama-assn.org/go/cpt"]);

        return {
            data: {
                status: raw.status,
                class: raw.class?.code || raw.class?.display, // class is often just a code object in R4
                type: result.display || typeCoding?.text || "Encounter",
                period: {
                    start: raw.period?.start,
                    end: raw.period?.end,
                },
                location: raw.location?.[0]?.location?.display,
                provider: raw.participant?.[0]?.individual?.display,
            },
            code: result.code,
        };
    }

    private normalizeProcedure(raw: any) {
        // Standard FHIR R4 fallback
        const result = this.extractCanonicalCode(raw.code, ["http://snomed.info/sct", "http://www.ama-assn.org/go/cpt"]);

        return {
            data: {
                status: raw.status,
                procedure: result.display || raw.code?.text,
                performedDateTime: raw.performedDateTime || raw.performedPeriod?.start,
                reason: raw.reasonCode?.[0]?.text,
            },
            code: result.code,
        };
    }

    // --- Helper ---

    private extractCanonicalCode(codeableConcept: any, systems: string | string[]) {
        if (!codeableConcept || !codeableConcept.coding) return { code: null, display: null };

        const targetSystems = Array.isArray(systems) ? systems : [systems];

        for (const system of targetSystems) {
            // Athena data shows systems like "http://snomed.info/sct", no version often.
            // Using includes to be safe against version suffixes
            const match = codeableConcept.coding.find((c: any) => c.system && c.system.includes(system));
            if (match) {
                return { code: match.code, display: match.display };
            }
        }

        // Fallback: Use the *first* coding if no preferred system match, 
        // often Athena proprietary codes are second, but if only proprietary exists, take it.
        const first = codeableConcept.coding[0];
        return { code: first?.code, display: first?.display };
    }
}

export const athenaNormalizer = new AthenaNormalizer();
