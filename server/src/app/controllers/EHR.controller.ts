
import { Request, Response, NextFunction } from 'express';
import { ehrService } from '../services/EHR.service';
import logger from '../../config/logger';

export class EHRController {
    /**
     * Gets a generic EHR resource.
     * Route: GET /api/v1/ehr/:resource
     * Query: ?session_id=<session_id>
     */
    async getResource(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { resource } = req.params;
            const profileId = req.query.profileId as string;

            // Validate auth
            if (!(req as any).user || !(req as any).user.id) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const userId = (req as any).user.id;

            if (!profileId) {
                res.status(400).json({ success: false, message: 'Missing profileId' });
                return;
            }

            if (!resource) {
                res.status(400).json({ success: false, message: 'Missing resource type' });
                return;
            }

            const result = await ehrService.fetchResource(userId, profileId, resource);
            res.json(result);

        } catch (error: any) {
            logger.error(`Error in getResource (${req.params.resource}):`, error);
            if (error.message.includes('Profile not connected')) {
                res.status(404).json({ success: false, message: 'Profile not connected to provider' });
            } else if (error.message.includes('Unauthorized')) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
            } else if (error.message.includes('Forbidden')) {
                res.status(403).json({ success: false, message: 'Forbidden' });
            } else {
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
        }
    }
}

export const ehrController = new EHRController();
