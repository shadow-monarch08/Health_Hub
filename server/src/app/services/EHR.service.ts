import prisma from "../../config/prisma.config";
import { env } from "../../config/environment.config";
import logger from "../../config/logger.config";
import { cryptoService } from "./Crypto.service";
import { normalizationService } from "./Normalization.service";
import { cleaningService } from "./Cleaning.service";
import redisClient from "../../config/redis.config";
import { cooldownKey, SYNC_COOLDOWN_MS, SYNC_QUEUE_NAME, syncJobId } from "../../jobs/constants/sync.constants";
import { syncStatusService } from "./syncStatus.service";
import { syncQueue } from "../../jobs/queues/sync.queue";

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

  async createSyncJob(profileId: string, userId: string, provider: string): Promise<{
    jobId?: string;
    status: string;
    retryAfterSeconds?: number;
  }> {
    const syncStatus = await syncStatusService.resolveSyncStatus(profileId, provider);

    if (syncStatus.status === "running") {
      return {
        jobId: syncStatus.jobId,
        status: "running"
      }
    } else if (syncStatus.status === "cooldown") {
      return {
        status: "cooldown",
        retryAfterSeconds: syncStatus.retryAfterSeconds
      }
    }

    const jobId = syncJobId(profileId, provider)

    await syncQueue.add(SYNC_QUEUE_NAME, {
      jobId,
      profileId,
      userId,
      provider: provider
    }, {
      jobId,
    })

    await prisma.profileSyncJob.upsert({
      where: {
        jobId
      },
      update: {
        status: "pending"
      },
      create: {
        jobId,
        profileId,
        provider,
        status: "pending",
      },
    })

    return {
      jobId,
      status: "pending"
    }
  }

}

export const ehrService = new EHRService();
