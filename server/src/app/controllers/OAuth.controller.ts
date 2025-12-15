import { Request, Response, NextFunction } from 'express';
import { oAuthService } from '../services/OAuth.service';
import logger from '../../config/logger';

export class OAuthController {
    /**
     * Initiates the Epic OAuth2 flow by redirecting the user to Epic's authorization page.
     */
    /**
     * Initiates the Epic OAuth2 flow by redirecting the user to Epic's authorization page.
     */
    async authorizeEpic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate user authentication
            if (!(req as any).user || !(req as any).user.id) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const userId = (req as any).user.id;

            // Get profileId
            const profileId = req.query.profileId as string || req.body.profileId;
            if (!profileId) {
                res.status(400).json({ success: false, message: 'Missing profileId' });
                return;
            }

            // TODO: Validate that profileId belongs to userId (optional here since we check again in callback, but good for UX)

            const redirectUrl = await oAuthService.createAuthorizationRedirect(userId, profileId);
            // Return URL for frontend to redirect
            res.json({ url: redirectUrl });
        } catch (error) {
            logger.error('Error in authorizeEpic:', error);
            next(error);
        }
    }

    /**
     * Handles the callback from Epic, exchanges code for token, fetches patient demographics,
     * and redirects to the frontend.
     */
    async epicCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { code, state } = req.query;

            if (!code || !state) {
                res.status(400).json({ success: false, message: 'Missing code or state parameter' });
                return;
            }

            // Exchange code for tokens and get state context (userId, profileId)
            const { token, stateData } = await oAuthService.exchangeCodeForToken(state as string, code as string);
            const { userId, profileId } = stateData;

            // Store connection in DB (replaces storeEpicSession)
            await oAuthService.storeConnection(userId, profileId, token);

            // Log success (but never log tokens!)
            logger.info(`Successfully completed Epic OAuth flow. Profile: ${profileId}`);

            // Redirect to frontend (NO session ID logic anymore)
            let frontendRedirect = process.env.FRONTEND_REDIRECT;

            if (!frontendRedirect) {
                logger.warn('FRONTEND_REDIRECT is not set in .env! Using default fallback.');
                frontendRedirect = 'https://frontend.example.com/epic/success';
            }

            // Clean redirect URL - append status or profileId but NOT full session token
            const targetUrl = `${frontendRedirect}?status=connected&profileId=${profileId}`;
            logger.info(`FINAL REDIRECT ATTEMPT: ${targetUrl}`);

            // Explicitly saving session before redirect if using express-session (not used here but good practice)
            // res.status(302).redirect(targetUrl); // Explicit 302
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
            logger.error('Error in epicCallback:', error);
            // We could redirect to a frontend error page here too, but for now standard error handling:
            next(error);
        }
    }


}

export const oAuthController = new OAuthController();
