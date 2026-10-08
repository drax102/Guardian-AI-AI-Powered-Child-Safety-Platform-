import { z } from "zod";

export const riskIdParamSchema = z.object({
  id: z.string().uuid("Invalid risk assessment ID format"),
});

// Internal schema used by the AI/Risk Engine (not exposed via public HTTP POST)
export const engineRiskAssessmentSchema = z
  .object({
    childId: z
      .string({ required_error: "Child ID is required" })
      .uuid("Invalid child ID format"),
    safetyScore: z
      .number()
      .int("Safety score must be an integer")
      .min(0, "Safety score cannot be less than 0")
      .max(100, "Safety score cannot exceed 100")
      .default(100),
    cyberbullyingRisk: z
      .number()
      .int("Cyberbullying risk must be an integer")
      .min(0, "Risk score cannot be less than 0")
      .max(100, "Risk score cannot exceed 100")
      .default(0),
    contentRisk: z
      .number()
      .int("Content risk must be an integer")
      .min(0, "Risk score cannot be less than 0")
      .max(100, "Risk score cannot exceed 100")
      .default(0),
    predatorRisk: z
      .number()
      .int("Predator risk must be an integer")
      .min(0, "Risk score cannot be less than 0")
      .max(100, "Risk score cannot exceed 100")
      .default(0),
    screenTimeRisk: z
      .number()
      .int("Screen time risk must be an integer")
      .min(0, "Risk score cannot be less than 0")
      .max(100, "Risk score cannot exceed 100")
      .default(0),
    summaryNotes: z
      .string()
      .trim()
      .max(2000, "Summary notes cannot exceed 2000 characters")
      .optional()
      .nullable(),
  })
  .strict();

export const listRiskAssessmentsQuerySchema = z.object({
  childId: z.string().uuid("Invalid child ID format").optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type EngineRiskAssessmentInput = z.infer<typeof engineRiskAssessmentSchema>;
export type ListRiskAssessmentsQuery = z.infer<typeof listRiskAssessmentsQuerySchema>;