import { Request, Response, NextFunction } from "express";
import { ehrService } from "../services/EHR.service";
import prisma from "../../config/prisma.config";
import logger from "../../config/logger.config";
import { uuid } from "zod";
import { syncQueue } from "../../jobs/queues/sync.queue";
import { addClient, removeClient } from "../sse/sseManager";

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
      const userId = (req as any).user.id;

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
        // Fetch from Clean Table
        // We need to access prisma directly or add a method to EHRService.
        // Let's import prisma client here or use a service method.
        // adhering to pattern: let's use ehrService to fetch clean data.
        const data = await ehrService.getCleanResource(profileId, resource);
        res.json({
          success: true,
          resourceType: resource,
          mode: "clean",
          data,
        });
        return;
      }

      // const result = await ehrService.fetchResource(
      //   userId,
      //   profileId,
      //   resource
      // );
      // res.json(result);
    } catch (error: any) {
      logger.error(`Error in getResource (${req.params.resource}):`, error);
      if (error.message.includes("Profile not connected")) {
        res.status(404).json({
          success: false,
          message: "Profile not connected to provider",
        });
      } else if (error.message.includes("Unauthorized")) {
        res.status(401).json({ success: false, message: "Unauthorized" });
      } else if (error.message.includes("Forbidden")) {
        res.status(403).json({ success: false, message: "Forbidden" });
      } else {
        res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }
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

      const data = await ehrService.getProfileData(profileId);
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
   * Body: { profileId }
   */
  async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId = req.body.profileId;
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

      // Trigger sync (fire and forget or await?)
      // Awaiting it ensures we know if it *started* okay, but the service logic is largely async inside if we want.
      // The service `syncProfile` awaits all fetches.
      // For a "Background" job, we should probably not await the whole thing if it takes long.
      // But for now, let's await it to give immediate feedback on success/fail.
      const jobId = uuid({
        version: "v4"
      }).toString();

      await prisma.profileSyncJob.create({
        data: {
          jobId,
          profileId,
          provider: "epic",
          status: "pending",
        },
      });

      await syncQueue.add("sync-ehrData", {
        jobId,
        profileId,
        userId,
        provider: "epic"
      }, {
        jobId,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: true
      })

      res.json({ success: true, data: { jobId } });
    } catch (error) {
      logger.error(`Error in sync:`, error);
      next(error);
    }
  }

  sse(req: Request, res: Response, next: NextFunction): void {
    const jobId = req.params.jobId;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders();

    addClient(jobId, res);

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);

    req.on("close", () => {
      removeClient(jobId);
    });
  }
}

export const ehrController = new EHRController();
