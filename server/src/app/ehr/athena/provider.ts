import prisma from "../../../config/prisma.config";
import logger from "../../../config/logger.config";
import { cryptoService } from "../../services/crypto/crypto.service";
import { sseRedis } from "../../sse/sseSubscriber";
import {
  CleanRecord,
  EhrProvider,
  NormalizedRecord,
} from "../common/ehrProvider.interface";
import { athenaFetcher } from "./athena.fetcher";
import { athenaNormalizer } from "./athena.normalizer";
import { athenaCleaner } from "./athena.cleaner";
import { athenaOAuth } from "./athena.oauth";

export class AthenaProvider implements EhrProvider {
  auth = athenaOAuth;

  async fetch(profileId: string): Promise<void> {
    throw new Error("Use sync() for Athena provider");
  }

  normalize(rawData: any[]): NormalizedRecord[] {
    return [];
  }

  clean(normalizedData: NormalizedRecord[]): CleanRecord[] {
    return [];
  }

  async sync(profileId: string, jobId?: string): Promise<void> {
    // 1. Retrieve connection
    const connection = await prisma.profileEmrConnection.findUnique({
      where: {
        profileId_provider: {
          profileId,
          provider: "athena",
        },
      },
    });

    if (!connection) {
      throw new Error("Profile not connected to Athena");
    }

    const accessTokenEncrypted = connection.accessTokenEncrypted;
    const patientId = connection.patientEmrId;

    let accessToken: string;
    try {
      accessToken = cryptoService.decrypt(accessTokenEncrypted);
      logger.info(`Athena scope : `, connection.scope);
    } catch (error) {
      logger.error(
        `Failed to decrypt Athena token for profile ${profileId}`,
        error
      );
      throw new Error("Invalid token data — please reconnect Athena.");
    }

    if (!accessToken || !patientId) {
      throw new Error("Invalid Athena connection data");
    }

    // 2. Define Resources
    const resources = [
      "Patient",
      "MedicationRequest",
      "Condition",
      "Observation",
      "Immunization",
      "AllergyIntolerance",
      "Encounter",
      "Procedure",
    ];

    const errors: string[] = [];

    // 3. Sync Loop
    const results = await Promise.allSettled(
      resources.map((resource) =>
        this.syncSingleResource(
          profileId,
          resource,
          patientId,
          accessToken,
          jobId
        )
      )
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const resource = resources[index];
        logger.error(`Athena Sync failed for ${resource}`, result.reason);
        errors.push(`${resource}: ${result.reason.message}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Athena Sync completed with errors: ${errors.join(", ")}`
      );
    }
  }

  private async syncSingleResource(
    profileId: string,
    resourceType: string,
    patientId: string,
    accessToken: string,
    jobId?: string
  ) {
    // Publish Event
    if (jobId)
      sseRedis.publish(
        `sse:${jobId}`,
        JSON.stringify({ event: "fetching", resourceType })
      );

    // 1. Fetch
    let resourceData;
    try {
      resourceData = await athenaFetcher.fetchResource(
        resourceType,
        patientId,
        accessToken
      );
    } catch (e) {
      if (jobId)
        sseRedis.publish(
          `sse:${jobId}`,
          JSON.stringify({ event: "failed", resourceType })
        );
      throw e;
    }

    if (!resourceData) return; // Skip if no data or invalid type

    if (jobId)
      sseRedis.publish(
        `sse:${jobId}`,
        JSON.stringify({ event: "fetched", resourceType })
      );
    if (jobId)
      sseRedis.publish(
        `sse:${jobId}`,
        JSON.stringify({ event: "normalizing", resourceType })
      );

    // 2. Persist Raw & Normalize
    // Athena returns different shapes. Often "patient" is an object, lists are arrays.
    // We need to handle single objects vs arrays. `fetchResource` returns generic JSON.
    // Usually list endpoints return { totalcount: N, features: [...] } or just [...]

    let items: any[] = [];
    // Check for common specific list wrappers (Athena API style or FHIR Bundle)
    if (resourceData.resourceType === 'Bundle' && Array.isArray(resourceData.entry)) {
      // FHIR Bundle: Extract 'resource' from each entry
      items = resourceData.entry.map((e: any) => e.resource).filter((r: any) => r);
    } else if (Array.isArray(resourceData)) {
      items = resourceData;
    } else if (resourceData.patients && Array.isArray(resourceData.patients)) {
      // /patients search
      items = resourceData.patients;
    } else if (resourceData.medications) {
      items = resourceData.medications;
    } else if (resourceData.item) {
      // Legacy style
      items = resourceData.item;
    } else {
      // Assume single object (like Patient details)
      items = [resourceData];
    }

    for (const item of items) {
      // Athena doesn't always have a clear "id".
      // We need a unique ID for Raw table.
      // Patient: patientid
      // Med: medicationid
      // Problem: problemid
      // Fallback to generating one or using index is risky for updates.
      // We try to find a best-effort ID.
      const rawId =
        item.id ||
        item.patientid ||
        item.medicationid ||
        item.problemid ||
        item.encounterid ||
        item.vitalid ||
        item.vaccineid ||
        `gen-${Math.random()}`; // Last resort

      await prisma.profileFhirResourceRaw.upsert({
        where: {
          profileId_provider_resourceType_resourceId: {
            profileId,
            provider: "athena",
            resourceType,
            resourceId: String(rawId),
          },
        },
        create: {
          profileId,
          provider: "athena",
          resourceType,
          resourceId: String(rawId),
          resourceJson: item,
          fetchedAt: new Date(),
        },
        update: {
          resourceJson: item,
          fetchedAt: new Date(),
        },
      });

      await athenaNormalizer.normalize(
        profileId,
        resourceType,
        String(rawId),
        item
      );
    }

    if (jobId)
      sseRedis.publish(
        `sse:${jobId}`,
        JSON.stringify({ event: "cleaning", resourceType })
      );

    // 3. Clean
    await athenaCleaner.clean(profileId, resourceType);
  }
}

export const athenaProvider = new AthenaProvider();
