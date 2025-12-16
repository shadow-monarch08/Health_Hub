
import { Router } from 'express';
import { ehrController } from '../controllers/EHR.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Route: GET /api/v1/ehr/:resource
// Example: /api/v1/ehr/Observation?profileId=...
router.get('/:resource', ehrController.getResource);

// Route: POST /api/v1/ehr/sync
router.post('/sync', ehrController.sync);

export default router;
