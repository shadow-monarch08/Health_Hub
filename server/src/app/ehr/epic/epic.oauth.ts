import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import * as redisOAuth from "../../../redis/oauth";
import logger from "../../../config/logger.config";
import { EhrAuthProvider, TokenResponse } from "../common/ehrProvider.interface";

export class EpicOAuth implements EhrAuthProvider {
    /**
     * Generates PKCE verifier/challenge and constructs the Epic Authorization URL.
     * Stores the state logic in Redis.
     */
    async createAuthorizationRedirect(
        userId: string,
        profileId: string
    ): Promise<string> {
        const state = uuidv4();
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);

        // Store state with metadata
        await redisOAuth.saveState(state, {
            userId,
            profileId,
            provider: "epic",
            codeVerifier,
        });

        // Construct URL
        const params = new URLSearchParams({
            response_type: "code",
            client_id: process.env.EPIC_CLIENT_ID!,
            redirect_uri: `${process.env.APP_BASE_URL}/api/v1/OAuth/epic/callback`,
            scope:
                process.env.EPIC_SCOPE ||
                [
                    "openid",
                    "fhirUser",
                    "patient/Patient.read",
                    "patient/Observation.read",
                    "patient/Condition.read",
                    "patient/Immunization.read",
                    "patient/DiagnosticReport.read",
                    "patient/Specimen.read",
                    "patient/FamilyMemberHistory.read",
                    "patient/BodyStructure.read",
                    "patient/Appointment.read",
                    "patient/AdverseEvent.read",
                    "patient/Binary.read",
                    "patient/DocumentReference.read",
                ].join(" "),
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            aud: process.env.EPIC_FHIR_BASE!,
        });

        const fullUrl = `${process.env.EPIC_AUTH_URL}?${params.toString()}`;
        logger.info("Generated Epic Auth URL:", fullUrl);

        return fullUrl;
    }

    /**
     * Exchanges the authorization code for an access token.
     * Validates state and code_verifier from Redis.
     * Returns generic TokenResponse AND the original state data (userId, profileId).
     */
    async exchangeCodeForToken(
        state: string,
        code: string
    ): Promise<{ token: TokenResponse; stateData: any }> {
        const stateData = await redisOAuth.getState(state);

        if (!stateData) {
            throw new Error("Invalid or expired state");
        }

        const { codeVerifier, userId, profileId } = stateData;

        // Exchange code for token
        const params = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.EPIC_CLIENT_ID!,
            code: code,
            redirect_uri: `${process.env.APP_BASE_URL}/api/v1/OAuth/epic/callback`,
            code_verifier: codeVerifier || "",
        });

        const response = await fetch(process.env.EPIC_TOKEN_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Epic token exchange failed: ${errorText}`);
            throw new Error(
                `Failed to exchange code for token: ${response.statusText}`
            );
        }

        const tokenData: TokenResponse = await response.json();

        logger.info("Token Exchange Successful");

        return { token: tokenData, stateData };
    }

    // --- Private Helpers ---

    private generateCodeVerifier(): string {
        return crypto.randomBytes(32).toString("base64url");
    }

    private generateCodeChallenge(verifier: string): string {
        return crypto.createHash("sha256").update(verifier).digest("base64url");
    }
}

export const epicOAuth = new EpicOAuth();
