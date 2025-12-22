import prisma from "../../config/prisma.config";
import { env } from "../../config/environment.config";
import logger from "../../config/logger.config";


export class NormalizationService {
  /**
   * Normalizes a raw FHIR resource and acts as a transformer before saving to the normalized table.
   */
  async normalize(
    profileId: string,
    provider: string,
    resourceType: string,
    resourceId: string,
    rawJson: any
  ) {
    try {
      let normalizedJson: any = {};
      let canonicalCode: string | null = null;

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
          // For now, just copy raw if we don't have specific normalization logic
          normalizedJson = {
            ...rawJson,
            _note: "Raw copy, no normalization logic yet",
          };
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

      // Cleaning is now triggered by the orchestrator (EHRService)
    } catch (error) {
      logger.error(
        `Normalization failed for ${resourceType}/${resourceId}`,
        error
      );
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

    // Attempt to extract form from text if possible (naive)
    // In real FHIR, form is on the Medication resource.
    const form = raw.category?.[0]?.text || null;

    // Dosage
    const dosageInst = raw.dosageInstruction?.[0];
    const doseAndRate = dosageInst?.doseAndRate?.[0];
    const doseQuantity = doseAndRate?.doseQuantity;
    const timing = dosageInst?.timing;

    // Calculate frequency (naive)
    let frequency = 1;
    if (timing?.repeat?.frequency && timing?.repeat?.period) {
      // e.g. 2 times per 1 day = 2
      // This is complex, simplifying for now
      frequency = timing.repeat.frequency;
    }

    // Supply
    const dispense = raw.dispenseRequest;
    const supplyDuration = dispense?.expectedSupplyDuration?.value;
    const supplyRefills = dispense?.numberOfRepeatsAllowed;

    // Course
    const startDate = raw.authoredOn || dispense?.validityPeriod?.start;
    const endDate = dispense?.validityPeriod?.end;
    // If end date missing, we might calculate it in Cleaning service or here if we have duration.

    return {
      data: {
        status: raw.status,
        medication: {
          name: medicationName,
          form: form,
        },
        dosage: {
          amount: doseQuantity?.value,
          unit: doseQuantity?.unit,
          route:
            dosageInst?.route?.coding?.[0]?.display || dosageInst?.route?.text,
          frequency_per_day: frequency,
        },
        course: {
          start: startDate,
          end: endDate,
          duration_days: supplyDuration, // rough proxy if missing
        },
        reason: raw.reasonCode?.[0]?.text,
        supply: {
          days: supplyDuration,
          refills: supplyRefills,
        },
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

    return {
      data: {
        clinicalStatus: raw.clinicalStatus?.coding?.[0]?.code,
        verificationStatus: raw.verificationStatus?.coding?.[0]?.code,
        condition: result.display || raw.code?.text,
        onset: raw.onsetDateTime,
        recordedDate: raw.recordedDate,
      },
      code: result.code,
    };
  }

  private normalizeObservation(raw: any) {
    // Extract LOINC
    const result = this.extractCanonicalCode(raw.code, "http://loinc.org");

    let value = raw.valueString;
    if (raw.valueQuantity) {
      value = `${raw.valueQuantity.value} ${raw.valueQuantity.unit}`;
    }

    return {
      data: {
        status: raw.status,
        category: raw.category?.[0]?.coding?.[0]?.code,
        testName: result.display || raw.code?.text,
        value: value,
        effectiveDateTime: raw.effectiveDateTime,
      },
      code: result.code,
    };
  }

  private normalizeImmunization(raw: any) {
    // Extract CVX code if possible
    const result = this.extractCanonicalCode(
      raw.vaccineCode,
      "http://hl7.org/fhir/sid/cvx"
    );

    return {
      data: {
        status: raw.status,
        vaccineName: result.display || raw.vaccineCode?.text,
        date: raw.occurrenceDateTime,
        site: raw.site?.coding?.[0]?.display,
        route: raw.route?.coding?.[0]?.display,
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

    return {
      data: {
        clinicalStatus: raw.clinicalStatus?.coding?.[0]?.code,
        verificationStatus: raw.verificationStatus?.coding?.[0]?.code,
        allergy: result.display || raw.code?.text,
        criticality: raw.criticality,
        category: raw.category?.[0], // food, medication, etc.
        recordedDate: raw.recordedDate,
        reaction: raw.reaction?.[0]?.manifestation?.[0]?.text,
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

export const normalizationService = new NormalizationService();
