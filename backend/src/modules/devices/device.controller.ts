import { Request, Response, NextFunction } from "express";
import { deviceService } from "./device.service";
import {
  deviceIdParamSchema,
  createDeviceSchema,
  updateDeviceSchema,
  updateDeviceStatusSchema,
} from "./device.validation";

export class DeviceController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createDeviceSchema.parse(req.body);
      const userId = req.user!.id;
      const device = await deviceService.create(userId, validated);

      res.status(201).json({
        success: true,
        data: { device },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const devices = await deviceService.findAllByUser(userId);

      res.status(200).json({
        success: true,
        data: { devices },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = deviceIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const device = await deviceService.findById(id, userId);

      res.status(200).json({
        success: true,
        data: { device },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = deviceIdParamSchema.parse(req.params);
      const validated = updateDeviceSchema.parse(req.body);
      const userId = req.user!.id;
      const device = await deviceService.update(id, userId, validated);

      res.status(200).json({
        success: true,
        data: { device },
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
      const { id } = deviceIdParamSchema.parse(req.params);
      const validated = updateDeviceStatusSchema.parse(req.body);
      const userId = req.user!.id;
      const device = await deviceService.updateStatus(
        id,
        userId,
        validated.status
      );

      res.status(200).json({
        success: true,
        message: "Device status updated",
        data: { device },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = deviceIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const result = await deviceService.delete(id, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const deviceController = new DeviceController();