import { Request, Response, NextFunction } from "express";
import { profileService } from "../services/profile/profile.service";
import { syncService } from "../services/sync/sync.service";
import logger from "../../config/logger.config";
import { addClient, removeClient } from "../sse/sseBus";
import { env } from "../../config/environment.config";
import prisma from "../../config/prisma.config";

export class EHRController {
  /**
   * Gets a generic EHR resource.
   * Route: GET /api/v1/ehr/:resource
   * Query: ?session_id=<session_id>
   */
  async getResource(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { resource } = req.params;
      const profileId = req.query.profileId as string;

      // Validate auth
      if (!(req as any).user || !(req as any).user.id) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      if (!profileId) {
        res.status(400).json({ success: false, message: "Missing profileId" });
        return;
      }

      if (!resource) {
        res
          .status(400)
          .json({ success: false, message: "Missing resource type" });
        return;
      }

      const mode = req.query.mode as string; // 'raw' | 'clean'

      if (mode === "clean") {
        const data = await profileService.getCleanResource(profileId, resource);
        res.json({
          success: true,
          resourceType: resource,
          mode: "clean",
          data,
        });
        return;
      }

      // Default behavior or Raw fetch not supported directly via this endpoint anymore
      res.json({ success: false, message: "Raw mode not supported via this endpoint" });

    } catch (error: any) {
      logger.error(`Error in getResource (${req.params.resource}):`, error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }

  /**
   * aggregated fetch for all profile data.
   * Route: GET /api/v1/ehr/data/:profileId
   */
  async getProfileData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { profileId } = req.params;

      // Validate auth
      if (!(req as any).user || !(req as any).user.id) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      if (!profileId) {
        res.status(400).json({ success: false, message: "Missing profileId" });
        return;
      }

      const data = await profileService.getProfileData(profileId);
      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      logger.error(`Error in getProfileData:`, error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }

  /**
   * Triggers a full background sync.
   * Route: POST /api/v1/ehr/sync
   * Body: { profileId, provider }
   */
  async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId = req.body.profileId;
      const provider = req.body.provider || "epic"; // Default to epic for now

      // Validate auth
      if (!(req as any).user || !(req as any).user.id) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const userId = (req as any).user.id;

      if (!profileId) {
        res.status(400).json({ success: false, message: "Missing profileId" });
        return;
      }

      const jobData = await syncService.createSyncJob(profileId, userId, provider);
      delete jobData.targetUrl;

      res.json({ success: true, data: jobData });
    } catch (error) {
      logger.error(`Error in sync:`, error);
      next(error);
    }
  }

  async sse(req: Request, res: Response) {
    const jobId = req.params.jobId;

    logger.info(`SSE connected: ${jobId}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', env.FRONTEND_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 🔑 STEP 1: Read authoritative state
    const status = await prisma.profileSyncJob.findUnique({
      where: { jobId }
    });

    // 🔑 STEP 2: If already terminal → respond immediately
    if (status && (status.status === 'success' || status.status === 'failed')) {
      res.write(`data: ${JSON.stringify({
        event: 'complete',
        status: status.status,
        error: status.error
      })}\n\n`);
      res.end();
      return;
    }

    // 🔑 STEP 3: Otherwise register SSE client
    addClient(jobId, res);

    res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);
    res.flush?.();

    req.on('close', () => {
      logger.info(`SSE disconnected: ${jobId}`);
      removeClient(jobId);
    });
  }

}

export const ehrController = new EHRController();
