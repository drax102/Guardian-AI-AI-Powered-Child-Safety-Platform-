import { Request, Response, NextFunction } from "express";
import { riskService } from "./risk.service";
import {
  riskIdParamSchema,
  listRiskAssessmentsQuerySchema,
} from "./risk.validation";

export class RiskController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = listRiskAssessmentsQuerySchema.parse(req.query);
      const userId = req.user!.id;
      const result = await riskService.findAll(userId, validated);

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
      const { id } = riskIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const riskAssessment = await riskService.findById(id, userId);

      res.status(200).json({
        success: true,
        data: { riskAssessment },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = riskIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const result = await riskService.delete(id, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const riskController = new RiskController();