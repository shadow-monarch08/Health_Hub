import logger from "../../../config/logger.config";

export class EpicFetcher {
    async fetchResource(
        resourceType: string,
        patientId: string,
        accessToken: string
    ): Promise<any> {
        let url: string;
        if (resourceType === "Patient") {
            url = `${process.env.EPIC_FHIR_BASE}/Patient/${patientId}`;
        } else {
            url = `${process.env.EPIC_FHIR_BASE}/${resourceType}?patient=${patientId}`;
        }

        // Handle specific resource requirements
        if (resourceType === "Observation") {
            url += "&category=vital-signs";
        }

        logger.info(`Fetching EHR Data: ${resourceType} for patient ${patientId}`);

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/fhir+json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`FHIR ${resourceType} fetch failed: ${errorText}`);

            if (response.status === 401) {
                throw new Error("Unauthorized: Token expired or invalid");
            }
            throw new Error(
                `Failed to fetch ${resourceType}: ${response.status} ${response.statusText}`
            );
        }

        return await response.json();
    }
}

export const epicFetcher = new EpicFetcher();
