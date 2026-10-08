import { Request, Response, NextFunction } from "express";
import { alertService } from "./alert.service";
import {
  alertIdParamSchema,
  createAlertSchema,
  updateAlertStatusSchema,
  listAlertsQuerySchema,
} from "./alert.validation";

export class AlertController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createAlertSchema.parse(req.body);
      const userId = req.user!.id;
      const alert = await alertService.create(userId, validated);

      res.status(201).json({
        success: true,
        data: { alert },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = listAlertsQuerySchema.parse(req.query);
      const userId = req.user!.id;
      const result = await alertService.findAll(userId, validated);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = alertIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const alert = await alertService.findById(id, userId);

      res.status(200).json({
        success: true,
        data: { alert },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = alertIdParamSchema.parse(req.params);
      const validated = updateAlertStatusSchema.parse(req.body);
      const userId = req.user!.id;
      const alert = await alertService.updateStatus(id, userId, validated.status);

      res.status(200).json({
        success: true,
        message: "Alert status updated",
        data: { alert },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = alertIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const result = await alertService.delete(id, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const alertController = new AlertController();