import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import * as redisOAuth from "../../redis/oauth";
import logger from "../../config/logger.config";
import prisma from "../../config/prisma.config";
import { env } from "../../config/environment.config";
import { cryptoService } from "./Crypto.service";
import { uuid } from "zod";
import { syncQueue } from "../../jobs/queues/sync.queue";
import { syncJobId } from "../../jobs/constants/sync.constants";
import { syncStatusService } from "./syncStatus.service";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  patient?: string;
  refresh_token?: string;
  id_token?: string;
}

export class OAuthService {
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

  /**
   * Stores the Epic session connection in the DB.
   * Replaces previous Redis-only storage.
   */
  async storeConnection(
    userId: string,
    profileId: string,
    tokenData: TokenResponse
  ): Promise<void> {
    // Encrypt tokens before storage (placeholder function, in prod use real encryption)
    // For now, assuming simple storage or simple base64 as placeholder?
    // Instructions: "access_token_encrypted TEXT NOT NULL".
    // Use a simple encryption helper if available, or just store raw for prototype (NOT SECURE but follows 'scaffold' phase).
    // Actually, I should check if there are encryption utils.
    // I will just store them as is for now but mapped to the column, adding a TODO.
    // Wait, "Encrypted OAuth tokens" was a requirement.

    const accessTokenEncrypted = tokenData.access_token; // TODO: Encrypt
    const refreshTokenEncrypted = tokenData.refresh_token; // TODO: Encrypt

    const patientId = tokenData.patient || "unknown";
    // Need to handle if patient is missing or if we need to fetch it.

    await prisma.profileEmrConnection.upsert({
      where: {
        profileId_provider: {
          profileId,
          provider: "epic",
        },
      },
      create: {
        profileId,
        provider: "epic",
        patientEmrId: patientId,
        accessTokenEncrypted: cryptoService.encrypt(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token
          ? cryptoService.encrypt(tokenData.refresh_token)
          : null,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scope: tokenData.scope,
        status: "connected",
      },
      update: {
        patientEmrId: patientId,
        accessTokenEncrypted: cryptoService.encrypt(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token
          ? cryptoService.encrypt(tokenData.refresh_token)
          : null,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scope: tokenData.scope,
        status: "connected",
        updatedAt: new Date(),
      },
    });

    // Also update onboarding status
    await this.updateOnboardingStatus(userId);
  }

  async updateOnboardingStatus(userId: string) {
    // Check if user has at least one profile with at least one connection
    const userProfiles = await prisma.profile.findMany({
      where: { userId },
      include: { emrConnections: true },
    });

    const hasConnection = userProfiles.some(
      (p) =>
        p.emrConnections.length > 0 &&
        p.emrConnections.some((c) => c.status === "connected")
    );

    if (hasConnection) {
      await prisma.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
      });
    }
  }

  async createSyncJob(profileId: string, userId: string, provider: string): Promise<string> {
    // Redirect to frontend (NO session ID logic anymore)
    let frontendRedirect = process.env.FRONTEND_REDIRECT;

    if (!frontendRedirect) {
      logger.warn(
        "FRONTEND_REDIRECT is not set in .env! Using default fallback."
      );
      frontendRedirect = "https://frontend.example.com/epic/success";
    }

    const syncStatus = await syncStatusService.resolveSyncStatus(profileId, provider);

    if (syncStatus.status === "running") {
      const targetUrl = `${frontendRedirect}?status=running&profileId=${profileId}&jobStatus=running&jobId=${syncStatus.jobId}`;

      return targetUrl
    } else if (syncStatus.status === "cooldown") {
      const targetUrl = `${frontendRedirect}?status=connected&profileId=${profileId}&jobStatus=cooldown&retryAfterSeconds=${syncStatus.retryAfterSeconds}`;

      return targetUrl
    }

    const jobId = syncJobId(profileId, provider)

    await syncQueue.add("sync-ehrData", {
      jobId,
      profileId,
      userId,
      provider: provider
    }, {
      jobId,
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: true
    })

    await prisma.profileSyncJob.create({
      data: {
        jobId,
        profileId,
        provider,
        status: "pending",
      },
    })

    // Clean redirect URL - append status or profileId but NOT full session token
    const targetUrl = `${frontendRedirect}?status=connected&profileId=${profileId}&jobId=${jobId}jobStatus=pending`;

    return targetUrl
  }

  // --- Private Helpers ---

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
  }
}

export const oAuthService = new OAuthService();
