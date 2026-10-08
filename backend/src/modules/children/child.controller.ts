import { Request, Response, NextFunction } from "express";
import { childService } from "./child.service";
import {
  childIdParamSchema,
  createChildSchema,
  updateChildSchema,
} from "./child.validation";

export class ChildController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createChildSchema.parse(req.body);
      const parentId = req.user!.id;
      const child = await childService.create(parentId, validated);

      res.status(201).json({
        success: true,
        data: { child },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parentId = req.user!.id;
      const children = await childService.findAllByParent(parentId);

      res.status(200).json({
        success: true,
        data: { children },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = childIdParamSchema.parse(req.params);
      const parentId = req.user!.id;
      const child = await childService.findById(id, parentId);

      res.status(200).json({
        success: true,
        data: { child },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = childIdParamSchema.parse(req.params);
      const validated = updateChildSchema.parse(req.body);
      const parentId = req.user!.id;
      const child = await childService.update(id, parentId, validated);

      res.status(200).json({
        success: true,
        data: { child },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = childIdParamSchema.parse(req.params);
      const parentId = req.user!.id;
      const result = await childService.delete(id, parentId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const childController = new ChildController();