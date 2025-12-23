import { Request, Response, NextFunction } from "express";
import { EhrRegistry } from "../ehr/ehr.registry";
import { profileService } from "../services/profile/profile.service";
import { syncService } from "../services/sync/sync.service";
import logger from "../../config/logger.config";

export class OAuthController {

  /**
   * Initiates the OAuth2 flow by redirecting the user to Provider's authorization page.
   * Path: /:provider/connect
   */
  async connect(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const providerName = req.params.provider;

      // Validate user authentication
      if (!(req as any).user || !(req as any).user.id) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const userId = (req as any).user.id;

      // Get profileId
      const profileId = (req.query.profileId as string) || req.body.profileId;
      if (!profileId) {
        res.status(400).json({ success: false, message: "Missing profileId" });
        return;
      }

      const provider = EhrRegistry.get(providerName);
      const redirectUrl = await provider.auth.createAuthorizationRedirect(userId, profileId);

      // Return URL for frontend to redirect
      res.json({ url: redirectUrl });
    } catch (error) {
      logger.error("Error in connect:", error);
      next(error);
    }
  }

  /**
   * Handles the callback from Provider.
   * Path: /:provider/callback
   */
  async callback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const providerName = req.params.provider;
      const { code, state } = req.query;

      if (!code || !state) {
        res
          .status(400)
          .json({ success: false, message: "Missing code or state parameter" });
        return;
      }

      const provider = EhrRegistry.get(providerName);

      // Exchange code for tokens and get state context (userId, profileId)
      const { token, stateData } = await provider.auth.exchangeCodeForToken(
        state as string,
        code as string
      );
      const { userId, profileId } = stateData;

      // Store connection in DB
      await profileService.storeConnection(userId, profileId, providerName, token);

      logger.info(
        `Successfully completed ${providerName} OAuth flow. Profile: ${profileId}`
      );

      const jobData = await syncService.createSyncJob(profileId, userId, providerName);

      const targetUrl = jobData.targetUrl || "/";

      logger.info(`FINAL REDIRECT ATTEMPT: ${targetUrl}`);

      res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting…</title>
                <meta http-equiv="refresh" content="0;url='${targetUrl}'" />
            </head>
            <body>
                <p>Redirecting to your app…</p>
            </body>
            </html>
        `);
    } catch (error) {
      logger.error("Error in callback:", error);
      next(error);
    }
  }
}

export const oAuthController = new OAuthController();
