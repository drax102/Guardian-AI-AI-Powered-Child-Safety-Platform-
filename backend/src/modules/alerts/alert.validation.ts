import { z } from "zod";
import { AlertType, Severity, AlertStatus } from "@prisma/client";

export const alertIdParamSchema = z.object({
  id: z.string().uuid("Invalid alert ID format"),
});

// Bounded JSON-safe metadata value types
const jsonPrimitiveSchema = z.union([
  z.string().max(500, "Metadata string values cannot exceed 500 characters"),
  z.number(),
  z.boolean(),
  z.null(),
]);

const jsonArraySchema = z
  .array(jsonPrimitiveSchema)
  .max(25, "Metadata arrays cannot exceed 25 items");

const jsonValueSchema = z.union([
  jsonPrimitiveSchema,
  jsonArraySchema,
  z.record(
    z.string().max(50, "Metadata nested key names cannot exceed 50 characters"),
    jsonPrimitiveSchema
  ),
]);

export const alertMetadataSchema = z
  .record(
    z.string().max(50, "Metadata key names cannot exceed 50 characters"),
    jsonValueSchema
  )
  .refine(
    (obj) => Object.keys(obj).length <= 25,
    "Metadata object cannot contain more than 25 properties"
  );

export const createAlertSchema = z
  .object({
    type: z.nativeEnum(AlertType, {
      required_error: "Alert type is required",
    }),
    severity: z.nativeEnum(Severity).optional().default(Severity.MEDIUM),
    message: z
      .string({ required_error: "Alert message is required" })
      .trim()
      .min(3, "Alert message must be at least 3 characters long")
      .max(1000, "Alert message cannot exceed 1000 characters"),
    childId: z.string().uuid("Invalid child ID format").optional().nullable(),
    deviceId: z.string().uuid("Invalid device ID format").optional().nullable(),
    metadata: alertMetadataSchema.optional().nullable(),
  })
  .strict();

export const updateAlertStatusSchema = z
  .object({
    status: z.nativeEnum(AlertStatus, {
      required_error: "Alert status is required",
    }),
  })
  .strict();

export const listAlertsQuerySchema = z.object({
  status: z.nativeEnum(AlertStatus).optional(),
  severity: z.nativeEnum(Severity).optional(),
  type: z.nativeEnum(AlertType).optional(),
  childId: z.string().uuid("Invalid child ID format").optional(),
  deviceId: z.string().uuid("Invalid device ID format").optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertStatusInput = z.infer<typeof updateAlertStatusSchema>;
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;
export type AlertMetadataInput = z.infer<typeof alertMetadataSchema>;