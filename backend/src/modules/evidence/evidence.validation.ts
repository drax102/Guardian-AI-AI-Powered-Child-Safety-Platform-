import { z } from "zod";

export const alertIdParamSchema = z.object({
  alertId: z.string().uuid("Invalid alert ID format"),
});

export const evidenceIdParamSchema = z.object({
  id: z.string().uuid("Invalid evidence ID format"),
});

export type AlertIdParam = z.infer<typeof alertIdParamSchema>;
export type EvidenceIdParam = z.infer<typeof evidenceIdParamSchema>;
