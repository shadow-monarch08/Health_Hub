import logger from "../../../config/logger.config";
import { env } from "../../../config/environment.config";

export class AthenaFetcher {
  /**
   * Generic fetch wrapper for Athena API
   */
  private async makeRequest(endpoint: string, accessToken: string) {
    const url = `${env.ATHENA_API_BASE_URL}${endpoint}`;
    logger.info(`Fetching Athena Data: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Athena fetch failed for ${endpoint}: ${errorText}`);
      if (response.status === 401) {
        throw new Error("Unauthorized: Token expired or invalid");
      }
      throw new Error(
        `Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async fetchResource(
    resourceType: string,
    patientId: string,
    accessToken: string
  ): Promise<any> {
    // Map FHIR-like resource types to Athena specific endpoints
    // Athena API is NOT FHIR native by default (though they have a FHIR layer).
    // We will assume we are using their proprietary API for some things or their FHIR R4 endpoints for others.
    // For the sake of this integration and "Canonical Contract", let's assume we use their
    // /chart/{patientid}/... endpoints which return JSON that we will normalize.

    let endpoint = "";

    switch (resourceType) {
      case "Patient":
        endpoint = `/Patient/${patientId}`;
        break;

      case "MedicationRequest":
        endpoint = `/MedicationRequest?patient=${patientId}&intent=order`;
        break;

      case "Condition":
        endpoint = `/Condition?patient=${patientId}`;
        break;

      case "Observation":
        endpoint = `/Observation?patient=${patientId}`;
        break;

      case "Immunization":
        endpoint = `/Immunization?patient=${patientId}`;
        break;

      case "AllergyIntolerance":
        endpoint = `/AllergyIntolerance?patient=${patientId}`;
        break;

      case "Encounter":
        endpoint = `/Encounter?patient=${patientId}`;
        break;

      case "Procedure":
        endpoint = `/Procedure?patient=${patientId}`;
        break;

      default:
        logger.warn(`Unknown resource type for Athena: ${resourceType}`);
        return null;
    }

    return await this.makeRequest(endpoint, accessToken);
  }
}

export const athenaFetcher = new AthenaFetcher();
