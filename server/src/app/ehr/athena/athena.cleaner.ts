import prisma from "../../../config/prisma.config";
import logger from "../../../config/logger.config";
import { CleanRecord } from "../common/ehrProvider.interface";

export class AthenaCleaner {
  /**
   * Triggered after normalization. Aggregates data for a specific profile and resource type.
   * Logic mirrors EpicCleaner to ensure consistent user-facing output.
   */
  async clean(
    profileId: string,
    resourceType: string
  ): Promise<CleanRecord | null> {
    try {
      // 1. Fetch all normalized records for this profile & type (limit to Athena provider)
      const normalizedRecords =
        await prisma.profileFhirResourceNormalized.findMany({
          where: { profileId, resourceType, provider: "athena" },
        });

      if (normalizedRecords.length === 0) return null;

      let cleanData: any = {};

      // 2. Aggregate based on type
      switch (resourceType) {
        case "MedicationRequest":
          cleanData = this.aggregateMedications(normalizedRecords);
          break;
        case "Condition":
          cleanData = this.aggregateConditions(normalizedRecords);
          break;
        case "Observation":
          cleanData = this.aggregateObservations(normalizedRecords);
          break;
        case "Immunization":
          cleanData = this.aggregateImmunizations(normalizedRecords);
          break;
        case "AllergyIntolerance":
          cleanData = this.aggregateAllergies(normalizedRecords);
          break;
        case "Encounter":
          cleanData = this.aggregateEncounters(normalizedRecords);
          break;
        case "Procedure":
          cleanData = this.aggregateProcedures(normalizedRecords);
          break;
        default:
          const latest = normalizedRecords.sort(
            (a, b) =>
              new Date(b.normalizedAt).getTime() -
              new Date(a.normalizedAt).getTime()
          )[0];
          if (latest)
            cleanData = [
              { status: "unknown", ...(latest.normalizedJson as object) },
            ];
      }

      // Upsert into Clean Table
      // Note: Clean table is unique by [profileId, resourceType].
      // If we have mixed providers, we might overwite Epic data here?
      // The instruction says: "Clean resolves multiplicity".
      // "Sources string" or JSON usually tracks origin.
      // If we want to support multi-provider aggregation, we should fetch ALL providers' normalized data.
      // But the current scope is explicitly "Athena Integration".
      // IF we strictly modify ONLY Athena files, we might miss the aggregation of Epic+Athena.
      // However, the cleaner is usually provider-specific in this architecture OR generic.
      // The instruction says "Reuse generic clean logic... Output format must be provider-agnostic".
      // And "Mixed Epic + Athena data normalizes cleanly... Clean tables aggregate across providers correctly".

      // CRITICAL: If I only fetch "provider: athena", I will wipe out Epic data in the Clean table because cleanJson is a summary of EVERYTHING.
      // SO, I must fetch ALL normalized records for the profile, NOT just Athena.

      const allNormalizedRecords =
        await prisma.profileFhirResourceNormalized.findMany({
          where: { profileId, resourceType }, // Fetch ALL providers
        });

      // Re-run aggregation on the COMBINED set
      switch (resourceType) {
        case "MedicationRequest":
          cleanData = this.aggregateMedications(allNormalizedRecords);
          break;
        case "Condition":
          cleanData = this.aggregateConditions(allNormalizedRecords);
          break;
        case "Observation":
          cleanData = this.aggregateObservations(allNormalizedRecords);
          break;
        case "Immunization":
          cleanData = this.aggregateImmunizations(allNormalizedRecords);
          break;
        case "AllergyIntolerance":
          cleanData = this.aggregateAllergies(allNormalizedRecords);
          break;
        case "Encounter":
          cleanData = this.aggregateEncounters(allNormalizedRecords);
          break;
        case "Procedure":
          cleanData = this.aggregateProcedures(allNormalizedRecords);
          break;
        case "Patient":
          cleanData = this.aggregatePatient(allNormalizedRecords);
          break;
        default:
          // ...
          cleanData = {};
      }

      await prisma.profileFhirResourceClean.upsert({
        where: {
          profileId_resourceType: {
            profileId,
            resourceType,
          },
        },
        update: {
          cleanJson: cleanData,
          sources: allNormalizedRecords.map((r: any) => ({
            provider: r.provider,
            raw_id: r.resourceId,
            fetchedAt: r.normalizedAt,
          })),
          createdAt: new Date(),
        },
        create: {
          profileId,
          resourceType,
          cleanJson: cleanData,
          sources: allNormalizedRecords.map((r: any) => ({
            provider: r.provider,
            raw_id: r.resourceId,
            fetchedAt: r.normalizedAt,
          })),
        },
      });

      logger.info(
        `Cleaned ${resourceType} for profile ${profileId} (Athena trigger)`
      );

      return {
        resourceType,
        cleanJson: cleanData,
        sources: allNormalizedRecords.map((r: any) => ({
          provider: r.provider,
          raw_id: r.resourceId,
          fetchedAt: r.normalizedAt,
        })),
      };
    } catch (error) {
      logger.error(`Athena Cleaning failed for ${resourceType}`, error);
      return null;
    }
  }

  // --- AGGREGATION LOGIC (Mirrored from EpicCleaner for consistency) ---
  // In a future refactor, this should be moved to a shared 'ClinicalAggregator' service.

  private aggregatePatient(records: any[]): any {
    const sorted = records.sort(
      (a, b) =>
        new Date(b.normalizedAt).getTime() - new Date(a.normalizedAt).getTime()
    );
    return sorted[0]?.normalizedJson || {};
  }

  private aggregateMedications(records: any[]): any {
    const summary: { [key: string]: any } = {};

    for (const record of records) {
      const data = record.normalizedJson;
      if (data.status === "completed" || data.status === "stopped") continue;

      const medName = data.medication?.name || "Unknown Medication";
      const key = record.canonicalCode || medName;

      const newStartStr = data.course?.start; // Athena normalizer ensures this field
      const existingStartStr = summary[key]?.course?.start;

      const newDate = newStartStr ? new Date(newStartStr) : new Date(0);
      const existingDate = existingStartStr
        ? new Date(existingStartStr)
        : new Date(0);

      const isNewer = !summary[key] || newDate > existingDate;

      if (isNewer) {
        summary[key] = data; // Athena Normalizer output is already in Clean shape
      }
    }
    return summary;
  }

  private aggregateConditions(records: any[]): any {
    const summary: { [key: string]: any } = {};

    for (const record of records) {
      const data = record.normalizedJson;
      if (
        data.clinicalStatus === "resolved" ||
        data.clinicalStatus === "inactive"
      )
        continue;

      const key = record.canonicalCode || data.condition || "Unknown Condition";
      const existing = summary[key];

      if (!existing) {
        summary[key] = {
          code: record.canonicalCode,
          status: data.clinicalStatus,
          onset_date: data.onset,
          recorded_date: data.recordedDate,
          lable: data.condition,
        };
      } else {
        if (data.recordedDate > existing.recorded_date) {
          summary[key].status = data.clinicalStatus;
          summary[key].recorded_date = data.recordedDate;
        }
      }
    }
    return summary;
  }

  private aggregateObservations(records: any[]): any {
    const summary: { [key: string]: any } = {};
    const groups: { [key: string]: any[] } = {};

    for (const r of records) {
      const key =
        r.canonicalCode || r.normalizedJson.testName || "Unknown Test";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r.normalizedJson);
    }

    for (const key in groups) {
      const sorted = groups[key].sort(
        (a, b) =>
          new Date(b.effectiveDateTime).getTime() -
          new Date(a.effectiveDateTime).getTime()
      );
      const latest = sorted[0];
      const previous = sorted[1];

      if (!latest) continue;

      summary[key] = {
        latest: {
          value: latest.value,
          unit: latest.unit || "",
          date: latest.effectiveDateTime,
          category: latest.category,
        },
      };

      if (previous) {
        summary[key].previous = {
          value: previous.value,
          date: previous.effectiveDateTime,
        };
      }
    }
    return summary;
  }

  private aggregateImmunizations(records: any[]): any {
    const summary: { [key: string]: any } = {};
    for (const r of records) {
      const data = r.normalizedJson;
      const key = r.canonicalCode || data.vaccineName || "Unknown Vaccine";
      const existing = summary[key];
      if (!existing || data.date > existing.date) {
        summary[key] = {
          date: data.date,
          status: data.status,
          site: data.site,
          vaccineName: data.vaccineName,
        };
      }
    }
    return summary;
  }

  private aggregateAllergies(records: any[]): any {
    const summary: { [key: string]: any } = {};
    for (const r of records) {
      const data = r.normalizedJson;
      if (data.clinicalStatus === "resolved") continue;
      const key = r.canonicalCode || data.allergy || "Unknown Allergy";
      const existing = summary[key];
      if (!existing || data.recordedDate > existing.recordedDate) {
        summary[key] = {
          criticality: data.criticality,
          reaction: data.reaction,
          status: data.clinicalStatus,
          allergy: data.allergy,
          condition: data.condition,
          recordedDate: data.recordedDate,
        };
      }
    }
    return summary;
  }

  private aggregateEncounters(records: any[]): any {
    return records
      .map((r) => r.normalizedJson)
      .sort(
        (a, b) =>
          new Date(b.period?.start || 0).getTime() -
          new Date(a.period?.start || 0).getTime()
      )
      .slice(0, 5)
      .map((e: any) => ({
        type: e.type,
        class: e.class,
        date: e.period?.start,
        provider: e.provider,
        location: e.location,
      }));
  }

  private aggregateProcedures(records: any[]): any {
    return records
      .map((r) => r.normalizedJson)
      .sort(
        (a, b) =>
          new Date(b.performedDateTime || 0).getTime() -
          new Date(a.performedDateTime || 0).getTime()
      )
      .slice(0, 10)
      .map((p: any) => ({
        procedure: p.procedure,
        date: p.performedDateTime,
        status: p.status,
        reason: p.reason,
      }));
  }
}

export const athenaCleaner = new AthenaCleaner();
