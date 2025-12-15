import { Router } from "express";
import { oAuthController } from "../controllers/OAuth.controller";

import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Route: GET /api/v1/OAuth/epic/authorize
router.get("/epic/authorize", authenticate, oAuthController.authorizeEpic);

// Route: GET /api/v1/OAuth/epic/callback
router.get("/epic/callback", oAuthController.epicCallback);



export default router;
