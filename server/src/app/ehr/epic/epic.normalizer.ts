import prisma from "../../../config/prisma.config";
import logger from "../../../config/logger.config";
import { NormalizedRecord } from "../common/ehrProvider.interface";

export class EpicNormalizer {
    /**
     * Normalizes a raw FHIR resource and acts as a transformer before saving to the normalized table.
     */
    async normalize(
        profileId: string,
        resourceType: string,
        resourceId: string,
        rawJson: any
    ): Promise<NormalizedRecord[] | null> {
        try {
            const provider = "epic";
            let results: { normalizedJson: any; canonicalCode: string | null; subId?: string }[] = [];

            switch (resourceType) {
                case "Patient":
                    results.push({ normalizedJson: this.normalizePatient(rawJson), canonicalCode: null });
                    break;
                case "MedicationRequest":
                    const medResult = this.normalizeMedicationRequest(rawJson);
                    results.push({ normalizedJson: medResult.data, canonicalCode: medResult.code });
                    break;
                case "Condition":
                    const condResult = this.normalizeCondition(rawJson);
                    results.push({ normalizedJson: condResult.data, canonicalCode: condResult.code });
                    break;
                case "Observation":
                    const obsResults = this.normalizeObservation(rawJson);
                    results = obsResults.map(r => ({ normalizedJson: r.data, canonicalCode: r.code, subId: r.subId }));
                    break;
                case "Immunization":
                    const immResult = this.normalizeImmunization(rawJson);
                    results.push({ normalizedJson: immResult.data, canonicalCode: immResult.code });
                    break;
                case "AllergyIntolerance":
                    const algResult = this.normalizeAllergyIntolerance(rawJson);
                    results.push({ normalizedJson: algResult.data, canonicalCode: algResult.code });
                    break;
                case "Encounter":
                    const encResult = this.normalizeEncounter(rawJson);
                    results.push({ normalizedJson: encResult.data, canonicalCode: encResult.code });
                    break;
                case "Procedure":
                    const procResult = this.normalizeProcedure(rawJson);
                    results.push({ normalizedJson: procResult.data, canonicalCode: procResult.code });
                    break;
                default:
                    results.push({
                        normalizedJson: { ...rawJson, _note: "Raw copy, no normalization logic yet" },
                        canonicalCode: null
                    });
            }

            const normalizedRecords: NormalizedRecord[] = [];

            for (const result of results) {
                const finalResourceId = result.subId ? `${resourceId}-${result.subId}` : resourceId;

                await prisma.profileFhirResourceNormalized.upsert({
                    where: {
                        profileId_provider_resourceType_resourceId: {
                            profileId,
                            provider,
                            resourceType,
                            resourceId: finalResourceId,
                        },
                    },
                    update: {
                        normalizedJson: result.normalizedJson,
                        canonicalCode: result.canonicalCode,
                        normalizedAt: new Date(),
                    },
                    create: {
                        profileId,
                        provider,
                        resourceType,
                        resourceId: finalResourceId,
                        normalizedJson: result.normalizedJson,
                        canonicalCode: result.canonicalCode,
                    },
                });

                normalizedRecords.push({
                    resourceType,
                    resourceId: finalResourceId,
                    normalizedJson: result.normalizedJson,
                    canonicalCode: result.canonicalCode,
                    provider,
                    normalizedAt: new Date()
                });
            }

            return normalizedRecords;

        } catch (error) {
            logger.error(
                `Normalization failed for ${resourceType}/${resourceId}`,
                error
            );
            return null;
        }
    }

    private normalizePatient(raw: any) {
        // Extract basic demographics
        return {
            name:
                raw.name?.[0]?.text ||
                `${raw.name?.[0]?.given?.join(" ")} ${raw.name?.[0]?.family}`,
            gender: raw.gender,
            birthDate: raw.birthDate,
            address: raw.address?.[0]?.text,
        };
    }

    private normalizeMedicationRequest(raw: any) {
        // Extract RxNorm if available
        const codeableConcept = raw.medicationCodeableConcept;
        const result = this.extractCanonicalCode(
            codeableConcept,
            "http://www.nlm.nih.gov/research/umls/rxnorm"
        );

        // Determine medication name
        let medicationName = result.display || codeableConcept?.text;
        if (
            !medicationName &&
            raw.medicationReference &&
            raw.medicationReference.display
        ) {
            medicationName = raw.medicationReference.display;
        }

        // Dosages
        const dosages = raw.dosageInstruction?.map((d: any) => {
            const doseAndRate = d.doseAndRate?.[0];
            const doseQuantity = doseAndRate?.doseQuantity;

            // Frequency calculation (simplified)
            let frequency = 1;
            if (d.timing?.repeat?.frequency) {
                frequency = d.timing.repeat.frequency;
            }

            return {
                dosageText: d.text,
                amount: doseQuantity?.value,
                unit: doseQuantity?.unit,
                route: d.route?.coding?.[0]?.display || d.route?.text,
                frequency_per_day: frequency,
                isPRN: d.asNeededBoolean || !!d.asNeededCodeableConcept
            };
        }) || [];

        // Supply
        const dispense = raw.dispenseRequest;
        const supplyDuration = dispense?.expectedSupplyDuration?.value;
        const supplyRefills = dispense?.numberOfRepeatsAllowed;

        // Course
        const startDate = raw.authoredOn || dispense?.validityPeriod?.start;
        const endDate = dispense?.validityPeriod?.end;

        // Reason
        const reasonText = raw.reasonCode?.map((r: any) => r.text || r.coding?.[0]?.display).join(", ");
        const conditionRefs = raw.reasonReference?.map((r: any) => r.reference) || [];

        return {
            data: {
                status: raw.status,
                intent: raw.intent,
                medication: {
                    name: medicationName,
                    canonicalCode: result.code
                },
                dosages: dosages,
                course: {
                    start: startDate,
                    end: endDate,
                    duration_days: supplyDuration,
                    derived: !endDate && !!supplyDuration
                },
                supply: {
                    days: supplyDuration,
                    refills: supplyRefills,
                },
                reason: {
                    text: reasonText,
                    conditionRefs: conditionRefs
                }
            },
            code: result.code,
        };
    }

    private normalizeCondition(raw: any) {
        // Extract ICD-10 or SNOMED
        const result = this.extractCanonicalCode(raw.code, [
            "http://hl7.org/fhir/sid/icd-10",
            "http://snomed.info/sct",
        ]);

        // 1. Onset & Abatement
        const onsetDate = raw.onsetDateTime || raw.onsetPeriod?.start;
        const onsetText = raw.onsetString;
        const onsetAge = raw.onsetAge?.value;

        const abatementDate = raw.abatementDateTime || raw.abatementPeriod?.start;
        const abatementText = raw.abatementString;

        // 2. Category (Array)
        const category = raw.category?.map((c: any) => c.coding?.[0]?.code || c.text).filter(Boolean) || [];

        // 3. Severity & Body Site
        const severity = raw.severity?.coding?.[0]?.code || raw.severity?.text;
        const bodySite = raw.bodySite?.map((s: any) => s.text || s.coding?.[0]?.display).filter(Boolean) || [];

        return {
            data: {
                condition: result.display || raw.code?.text,
                canonicalCode: result.code,

                clinicalStatus: raw.clinicalStatus?.coding?.[0]?.code,
                verificationStatus: raw.verificationStatus?.coding?.[0]?.code,

                category,
                severity,

                onsetDate,
                onsetText,
                onsetAge,

                abatementDate,
                abatementText,

                bodySite,

                recordedDate: raw.recordedDate,
            },
            code: result.code,
        };
    }

    private normalizeObservation(raw: any): { data: any; code: string | null; subId?: string }[] {
        const results: { data: any; code: string | null; subId?: string }[] = [];

        // 1. Common Fields
        const status = raw.status;
        const category = raw.category?.map((c: any) => c.coding?.[0]?.code || c.text).filter(Boolean) || [];
        // Ensure category is array
        const categories = Array.isArray(category) ? category : [category];

        const effectiveDateTime = raw.effectiveDateTime || raw.issued;

        // 2. Handle Components (Split into separate records)
        if (raw.component && raw.component.length > 0) {
            for (const component of raw.component) {
                // Resolve component canonical code (LOINC)
                const compResult = this.extractCanonicalCode(component.code, "http://loinc.org");

                // Extract value for component
                const valData = this.extractObservationValue(component);

                // Use reference range from component if available
                const refRange = component.referenceRange?.[0];
                const referenceRange = refRange ? {
                    low: refRange.low?.value,
                    high: refRange.high?.value,
                    unit: refRange.low?.unit || refRange.high?.unit
                } : undefined;

                // Interpretation often on component
                const interpretation = component.interpretation?.[0]?.coding?.[0]?.code;
                const interpretationText = component.interpretation?.[0]?.text;

                results.push({
                    subId: component.code?.coding?.[0]?.code || `comp-${Math.random().toString(36).substr(2, 5)}`,
                    data: {
                        status,
                        category: categories,
                        testName: compResult.display || component.code?.text,
                        effectiveDateTime,
                        ...valData,
                        interpretation,
                        interpretationText,
                        referenceRange
                    },
                    code: compResult.code
                });
            }
        } else {
            // 3. Handle Single Observation
            const result = this.extractCanonicalCode(raw.code, "http://loinc.org");
            const valData = this.extractObservationValue(raw);

            const refRange = raw.referenceRange?.[0];
            const referenceRange = refRange ? {
                low: refRange.low?.value,
                high: refRange.high?.value,
                unit: refRange.low?.unit || refRange.high?.unit
            } : undefined;

            const interpretation = raw.interpretation?.[0]?.coding?.[0]?.code;
            const interpretationText = raw.interpretation?.[0]?.text;

            results.push({
                data: {
                    status,
                    category: categories,
                    testName: result.display || raw.code?.text,
                    effectiveDateTime,
                    ...valData,
                    interpretation,
                    interpretationText,
                    referenceRange
                },
                code: result.code,
            });
        }

        return results;
    }

    private extractObservationValue(item: any) {
        let valueDisplay = "";
        let valueType = "string";
        let valueNumeric = undefined;
        let valueUnit = undefined;
        let valueUnitCode = undefined;
        let valueSystem = undefined;
        let valueCode = undefined;
        let valueText = undefined;

        if (item.valueQuantity) {
            valueType = "quantity";
            valueNumeric = item.valueQuantity.value;
            valueUnit = item.valueQuantity.unit;
            valueUnitCode = item.valueQuantity.code;
            valueSystem = item.valueQuantity.system; // http://unitsofmeasure.org
            valueDisplay = `${valueNumeric} ${valueUnit || ""}`.trim();
        } else if (item.valueCodeableConcept) {
            valueType = "codeableConcept";
            valueCode = item.valueCodeableConcept.coding?.[0]?.code;
            valueText = item.valueCodeableConcept.text || item.valueCodeableConcept.coding?.[0]?.display;
            valueDisplay = valueText || valueCode || "Unknown";
        } else if (item.valueString) {
            valueType = "string";
            valueDisplay = item.valueString;
        } else if (item.valueBoolean !== undefined) {
            valueType = "boolean";
            valueDisplay = item.valueBoolean.toString();
        } else if (item.valueInteger !== undefined) {
            valueType = "integer";
            valueNumeric = item.valueInteger;
            valueDisplay = item.valueInteger.toString();
        } else if (item.valueRange) {
            valueType = "range";
            valueDisplay = `${item.valueRange.low?.value} - ${item.valueRange.high?.value} ${item.valueRange.low?.unit || ""}`.trim();
        }

        return {
            valueDisplay,
            valueType,
            valueNumeric,
            valueUnit,
            valueUnitCode,
            valueSystem,
            valueCode,
            valueText
        };
    }

    private normalizeImmunization(raw: any) {
        const result = this.extractCanonicalCode(raw.vaccineCode, ["http://hl7.org/fhir/sid/cvx"]);

        // 1. Status & Reason
        const status = raw.status; // "completed", "not-done", "entered-in-error"
        const statusReason = raw.statusReason?.text || raw.statusReason?.coding?.[0]?.display;

        // 2. Dates
        const occurrenceDate = raw.occurrenceDateTime;
        const occurrenceText = raw.occurrenceString;

        // 3. Dose & Protocol
        const protocol = raw.protocolApplied?.[0];
        const doseNumber = protocol?.doseNumberPositiveInt;
        const series = protocol?.series;
        const seriesDoses = protocol?.seriesDosesPositiveInt;

        // 4. Site & Route (Coded + Display)
        const site = raw.site ? {
            display: raw.site.text || raw.site.coding?.[0]?.display,
            code: raw.site.coding?.[0]?.code
        } : undefined;

        const route = raw.route ? {
            display: raw.route.text || raw.route.coding?.[0]?.display,
            code: raw.route.coding?.[0]?.code
        } : undefined;

        // 5. Lot & Expiration
        const lotNumber = raw.lotNumber;
        const expirationDate = raw.expirationDate;

        // 6. Reactions
        const reactions = raw.reaction?.map((r: any) => ({
            date: r.date,
            manifestation: r.detail?.display || r.detail?.text, // 'detail' is standard R4 for reaction reference, but varies. 
            // In R4 Immunization.reaction.detail is a Reference(Observation).
            // However, often simplified implementations or older mappings provide text or distinct fields.
            // If sticking to strict R4, we might need to look at contained observations, but provided instructions imply we extract what's there.
            // Let's assume raw.reaction objects might have manifestation text if not reference.
            // If it is a reference, we just capturing the display if available.
            reported: r.reported
        })) || [];


        return {
            data: {
                status,
                statusReason,
                vaccineName: result.display || raw.vaccineCode?.text || "Unknown Vaccine",
                canonicalCode: result.code, // Redundant but good for sanity
                occurrenceDate,
                occurrenceText,
                doseNumber,
                series,
                seriesDoses,
                site,
                route,
                lotNumber,
                expirationDate,
                reactions
            },
            code: result.code,
        };
    }

    private normalizeAllergyIntolerance(raw: any) {
        // RxNorm or SNOMED
        const result = this.extractCanonicalCode(raw.code, [
            "http://www.nlm.nih.gov/research/umls/rxnorm",
            "http://snomed.info/sct",
        ]);

        // Helper for severity ranking
        const severityRank: Record<string, number> = { "severe": 3, "moderate": 2, "mild": 1 };
        const getSeverityScore = (s: string) => severityRank[s?.toLowerCase()] || 0;

        const reactions: any[] = [];
        let maxSeverityScore = 0;
        let maxReactionSeverity = null;

        if (Array.isArray(raw.reaction)) {
            for (const react of raw.reaction) {
                const severity = react.severity;
                const currentScore = getSeverityScore(severity);

                if (currentScore > maxSeverityScore) {
                    maxSeverityScore = currentScore;
                    maxReactionSeverity = severity;
                }

                // Iterate over all manifestations
                if (Array.isArray(react.manifestation)) {
                    for (const manifest of react.manifestation) {
                        const noteTexts = react.note?.map((n: any) => n.text) || [];

                        reactions.push({
                            manifestation: manifest.text || manifest.coding?.[0]?.display,
                            manifestationCode: manifest.coding?.[0]?.code, // SNOMED
                            severity: severity,
                            onset: react.onset,
                            exposureRoute: react.exposureRoute?.text || react.exposureRoute?.coding?.[0]?.display,
                            notes: noteTexts
                        });
                    }
                }
            }
        }

        // Calculate primary reaction (highest severity, or first)
        let primaryReaction = null;
        if (reactions.length > 0) {
            // Sort by severity desc for primary selection
            const sorted = [...reactions].sort((a, b) => getSeverityScore(b.severity) - getSeverityScore(a.severity));
            primaryReaction = sorted[0].manifestation;
        }

        // Normalize category as array
        let category = raw.category;
        if (category && !Array.isArray(category)) {
            category = [category];
        } else if (!category) {
            category = [];
        }

        return {
            data: {
                clinicalStatus: raw.clinicalStatus?.coding?.[0]?.code,
                verificationStatus: raw.verificationStatus?.coding?.[0]?.code,
                allergy: result.display || raw.code?.text,
                criticality: raw.criticality,
                category: category,
                recordedDate: raw.recordedDate,

                // Enhanced fields
                primaryReaction: primaryReaction,
                maxReactionSeverity: maxReactionSeverity,
                reactions: reactions
            },
            code: result.code,
        };
    }

    private normalizeEncounter(raw: any) {
        // Encounter type
        const typeCoding = raw.type?.[0];
        const result = this.extractCanonicalCode(
            typeCoding,
            "http://snomed.info/sct"
        ); // Often uses SNOMED or CPT

        // Class (inpatient, outpatient, etc.)
        const encClass = raw.class?.code || raw.class?.display;

        return {
            data: {
                status: raw.status,
                class: encClass,
                type: result.display || typeCoding?.text,
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
        // CPT or SNOMED
        const result = this.extractCanonicalCode(raw.code, [
            "http://snomed.info/sct",
            "http://www.ama-assn.org/go/cpt",
        ]);

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

    private extractCanonicalCode(
        codeableConcept: any,
        systems: string | string[]
    ) {
        if (!codeableConcept || !codeableConcept.coding)
            return { code: null, display: null };

        const targetSystems = Array.isArray(systems) ? systems : [systems];

        for (const system of targetSystems) {
            const match = codeableConcept.coding.find(
                (c: any) => c.system && c.system.includes(system)
            ); // fuzzy match system URL
            if (match) {
                return { code: match.code, display: match.display };
            }
        }

        // Fallback to first code
        const first = codeableConcept.coding[0];
        return { code: first?.code, display: first?.display };
    }
}

export const epicNormalizer = new EpicNormalizer();
