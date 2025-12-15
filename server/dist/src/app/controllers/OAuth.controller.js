"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oAuthController = exports.OAuthController = void 0;
const OAuth_service_1 = require("../services/OAuth.service");
const logger_1 = __importDefault(require("../../config/logger"));
class OAuthController {
    /**
     * Initiates the Epic OAuth2 flow by redirecting the user to Epic's authorization page.
     */
    /**
     * Initiates the Epic OAuth2 flow by redirecting the user to Epic's authorization page.
     */
    authorizeEpic(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate user authentication
                if (!req.user || !req.user.id) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                const userId = req.user.id;
                // Get profileId
                const profileId = req.query.profileId || req.body.profileId;
                if (!profileId) {
                    res.status(400).json({ success: false, message: 'Missing profileId' });
                    return;
                }
                // TODO: Validate that profileId belongs to userId (optional here since we check again in callback, but good for UX)
                const redirectUrl = yield OAuth_service_1.oAuthService.createAuthorizationRedirect(userId, profileId);
                // Redirecting...
                res.redirect(redirectUrl);
            }
            catch (error) {
                logger_1.default.error('Error in authorizeEpic:', error);
                next(error);
            }
        });
    }
    /**
     * Handles the callback from Epic, exchanges code for token, fetches patient demographics,
     * and redirects to the frontend.
     */
    epicCallback(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, state } = req.query;
                if (!code || !state) {
                    res.status(400).json({ success: false, message: 'Missing code or state parameter' });
                    return;
                }
                // Exchange code for tokens and get state context (userId, profileId)
                const { token, stateData } = yield OAuth_service_1.oAuthService.exchangeCodeForToken(state, code);
                const { userId, profileId } = stateData;
                // Store connection in DB (replaces storeEpicSession)
                yield OAuth_service_1.oAuthService.storeConnection(userId, profileId, token);
                // Log success (but never log tokens!)
                logger_1.default.info(`Successfully completed Epic OAuth flow. Profile: ${profileId}`);
                // Redirect to frontend (NO session ID logic anymore)
                let frontendRedirect = process.env.FRONTEND_REDIRECT;
                if (!frontendRedirect) {
                    logger_1.default.warn('FRONTEND_REDIRECT is not set in .env! Using default fallback.');
                    frontendRedirect = 'https://frontend.example.com/epic/success';
                }
                // Clean redirect URL - append status or profileId but NOT full session token
                const targetUrl = `${frontendRedirect}?status=connected&profileId=${profileId}`;
                logger_1.default.info(`FINAL REDIRECT ATTEMPT: ${targetUrl}`);
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
            }
            catch (error) {
                logger_1.default.error('Error in epicCallback:', error);
                // We could redirect to a frontend error page here too, but for now standard error handling:
                next(error);
            }
        });
    }
    /**
     * Fetches patient demographics for the authenticated session.
     */
    getDemographics(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get session ID from query or header
                const sessionId = req.query.session_id || req.headers['x-epic-session-id'];
                if (!sessionId) {
                    res.status(400).json({ success: false, message: 'Missing session_id' });
                    return;
                }
                const result = yield OAuth_service_1.oAuthService.fetchDemographics(sessionId);
                console.log(result);
                res.json(result);
            }
            catch (error) {
                logger_1.default.error('Error in getDemographics:', error);
                if (error.message.includes('Session not found')) {
                    res.status(404).json({ success: false, message: 'Session not found or expired' });
                }
                else if (error.message.includes('Unauthorized')) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                }
                else {
                    res.status(500).json({ success: false, message: 'Internal Server Error' });
                }
            }
        });
    }
}
exports.OAuthController = OAuthController;
exports.oAuthController = new OAuthController();
