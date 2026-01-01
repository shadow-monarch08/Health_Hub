import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import * as redisOAuth from "../../../redis/oauth";
import logger from "../../../config/logger.config";
import {
  EhrAuthProvider,
  TokenResponse,
} from "../common/ehrProvider.interface";
import { env } from "../../../config/environment.config";

export class AthenaOAuth implements EhrAuthProvider {
  /**
   * Generates state and constructs the Athena Authorization URL.
   * Uses strict redirect URI matching from config.
   */
  async createAuthorizationRedirect(
    userId: string,
    profileId: string
  ): Promise<string> {
    const state = uuidv4();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    // Athena doesn't strictly require PKCE for confidential clients in all flows
    // but it's good practice. However, standard Athena docs for "partner" apps
    // often just use Code Flow. We will implement standard OAuth 2.0 Code Flow.
    // If we needed PKCE we would generate it here. For now, following standard docs.

    // Store state with metadata
    await redisOAuth.saveState(state, {
      userId,
      profileId,
      provider: "athena",
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.ATHENA_CLIENT_ID,
      redirect_uri: env.ATHENA_CALLBACK_URL,
      scope: env.ATHENA_SCOPE,
      state: state,
      client_secret: env.ATHENA_CLIENT_SECRET,
      aud: env.ATHENA_API_BASE_URL,
    });

    const fullUrl = `${env.ATHENA_AUTH_URL}?${params.toString()}`;
    logger.info("Generated Athena Auth URL:", fullUrl);

    return fullUrl;
  }

  /**
   * Exchanges the authorization code for an access token.
   * Athena typically requires Basic Auth (ClientId:ClientSecret) header for this request.
   */
  async exchangeCodeForToken(
    state: string,
    code: string
  ): Promise<{ token: TokenResponse; stateData: any }> {
    const stateData = await redisOAuth.getState(state);

    if (!stateData) {
      throw new Error("Invalid or expired state");
    }

    const { userId, profileId, codeVerifier } = stateData;

    // Prepare Basic Auth Header
    const authHeader = Buffer.from(
      `${env.ATHENA_CLIENT_ID}:${env.ATHENA_CLIENT_SECRET}`
    ).toString("base64");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: env.ATHENA_CALLBACK_URL,
    });

    logger.info(
      `Exchanging Athena code for token. Redirect URI: ${env.ATHENA_CALLBACK_URL}`
    );

    const response = await fetch(env.ATHENA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authHeader}`,
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Athena token exchange failed: ${errorText}`);
      throw new Error(
        `Failed to exchange code for token: ${response.status} ${response.statusText}`
      );
    }

    const rawToken = await response.json();

    // Map Athena response to our generic TokenResponse if necessary
    // Athena returns keys like: access_token, token_type, expires_in, refresh_token, scope
    const tokenData: TokenResponse = {
      access_token: rawToken.access_token,
      token_type: rawToken.token_type,
      expires_in: rawToken.expires_in,
      refresh_token: rawToken.refresh_token,
      scope: rawToken.scope,
      // Athena might embed patient ID in the response or requires a separate call.
      // Often it's in the response as `patient` or we derive it later.
      // For now, mapping what is available.
      patient: rawToken.patient,
      id_token: rawToken.id_token,
    };

    logger.info("Athena Token Exchange Successful");

    return { token: tokenData, stateData };
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
  }
}

export const athenaOAuth = new AthenaOAuth();
