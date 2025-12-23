import { Request, Response } from 'express';
import { profileService } from '../services/profile/profile.service';
import { createProfileSchema } from '../utils/validation/profile.schema';
import { z } from 'zod';

interface AuthRequest extends Request {
    user?: { id: string };
}

export class ProfileController {
    create = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const data = createProfileSchema.parse(req.body);
            const profile = await profileService.createProfile(req.user.id, data);
            res.status(201).json(profile);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation Error', details: error.message });
            }
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };

    list = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const profiles = await profileService.getProfiles(req.user.id);
            res.status(200).json(profiles);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };
}

export const profileController = new ProfileController();
