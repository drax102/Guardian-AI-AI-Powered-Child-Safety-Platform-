import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import {
  EngineRiskAssessmentInput,
  engineRiskAssessmentSchema,
  ListRiskAssessmentsQuery,
} from "./risk.validation";

export class RiskService {
  /**
   * Internal method for creating risk assessments.
   * Invoked strictly by the future AI / Risk Analysis Engine (not exposed via public HTTP POST).
   */
  async createAssessmentFromEngine(input: EngineRiskAssessmentInput) {
    const validated = engineRiskAssessmentSchema.parse(input);

    const child = await prisma.child.findUnique({
      where: { id: validated.childId },
    });

    if (!child) {
      throw new AppError("Child not found", 404);
    }

    return prisma.riskAssessment.create({
      data: {
        childId: validated.childId,
        safetyScore: validated.safetyScore,
        cyberbullyingRisk: validated.cyberbullyingRisk,
        contentRisk: validated.contentRisk,
        predatorRisk: validated.predatorRisk,
        screenTimeRisk: validated.screenTimeRisk,
        summaryNotes: validated.summaryNotes || null,
      },
      include: {
        child: {
          select: { id: true, name: true, age: true },
        },
      },
    });
  }

  async findAll(userId: string, query: ListRiskAssessmentsQuery) {
    if (query.childId) {
      const child = await prisma.child.findFirst({
        where: { id: query.childId, parentId: userId },
      });
      if (!child) {
        throw new AppError("Child not found", 404);
      }
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RiskAssessmentWhereInput = {
      OR: [
        { child: { parentId: userId } },
        { alert: { userId } },
      ],
      ...(query.childId && { childId: query.childId }),
    };

    const [total, assessments] = await Promise.all([
      prisma.riskAssessment.count({ where }),
      prisma.riskAssessment.findMany({
        where,
        orderBy: { calculatedAt: "desc" },
        skip,
        take: limit,
        include: {
          child: {
            select: { id: true, name: true, age: true },
          },
          alert: {
            select: { id: true, type: true, severity: true, message: true },
          },
        },
      }),
    ]);

    return {
      assessments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string, userId: string) {
    const assessment = await prisma.riskAssessment.findFirst({
      where: {
        id,
        OR: [
          { child: { parentId: userId } },
          { alert: { userId } },
        ],
      },
      include: {
        child: {
          select: { id: true, name: true, age: true },
        },
        alert: {
          select: { id: true, type: true, severity: true, message: true },
        },
      },
    });

    if (!assessment) {
      throw new AppError("Risk assessment not found", 404);
    }

    return assessment;
  }

  async delete(id: string, userId: string) {
    // Verify ownership first; throws 404 if not found
    await this.findById(id, userId);

    await prisma.riskAssessment.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Risk assessment deleted successfully",
    };
  }
}

export const riskService = new RiskService();