import { Router } from "express";
import { oAuthController } from "../controllers/oauth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Route: GET /api/v1/OAuth/:provider/connect
router.get("/:provider/connect", authenticate, oAuthController.connect);

// Route: GET /api/v1/OAuth/:provider/callback
router.get("/:provider/callback", oAuthController.callback);

export default router;
