import { Request, Response, NextFunction } from "express";
import { evidenceService } from "./evidence.service";
import { cleanupFile } from "../../middlewares/upload.middleware";
import {
  alertIdParamSchema,
  evidenceIdParamSchema,
} from "./evidence.validation";

export class EvidenceController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { alertId } = alertIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const evidence = await evidenceService.uploadEvidence(
        userId,
        alertId,
        req.file!
      );

      res.status(201).json({
        success: true,
        message: "Evidence uploaded successfully",
        data: { evidence },
      });
    } catch (error) {
      next(error);
    } finally {
      if (req.file?.path) {
        cleanupFile(req.file.path);
      }
    }
  }

  async listByAlert(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { alertId } = alertIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const evidence = await evidenceService.findEvidenceByAlert(userId, alertId);

      res.status(200).json({
        success: true,
        data: { evidence },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = evidenceIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const evidence = await evidenceService.findById(userId, id);

      res.status(200).json({
        success: true,
        data: { evidence },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = evidenceIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const result = await evidenceService.deleteEvidence(userId, id);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const evidenceController = new EvidenceController();
