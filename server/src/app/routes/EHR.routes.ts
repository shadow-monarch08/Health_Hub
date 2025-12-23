import { Router } from "express";
import { ehrController } from "../controllers/EHR.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// router.use(authenticate);

// Route: GET /api/v1/ehr/:resource
// Example: /api/v1/ehr/Observation?profileId=...
router.get("/:resource", ehrController.getResource);

// Route: GET /api/v1/ehr/data/:profileId
router.get("/data/:profileId", ehrController.getProfileData);

// Route: POST /api/v1/ehr/sync
router.post("/sync", ehrController.sync);

// Route: GET /api/v1/ehr/sse/:jobId
router.get("/sse/:jobId", ehrController.sse);

export default router;
