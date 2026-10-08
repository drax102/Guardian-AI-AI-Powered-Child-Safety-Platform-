import { z } from "zod";
import { DeviceType, DeviceStatus } from "@prisma/client";

export const deviceIdParamSchema = z.object({
  id: z.string().uuid("Invalid device ID format"),
});

export const createDeviceSchema = z
  .object({
    name: z
      .string({ required_error: "Device name is required" })
      .trim()
      .min(2, "Device name must be at least 2 characters long")
      .max(100, "Device name cannot exceed 100 characters"),
    type: z.nativeEnum(DeviceType).optional().default(DeviceType.SMARTPHONE),
    childId: z.string().uuid("Invalid child ID format").optional().nullable(),
  })
  .strict();

export const updateDeviceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Device name must be at least 2 characters long")
      .max(100, "Device name cannot exceed 100 characters")
      .optional(),
    type: z.nativeEnum(DeviceType).optional(),
    status: z.nativeEnum(DeviceStatus).optional(),
    childId: z.string().uuid("Invalid child ID format").optional().nullable(),
  })
  .strict();

export const updateDeviceStatusSchema = z
  .object({
    status: z.nativeEnum(DeviceStatus, {
      required_error: "Device status is required (ONLINE, OFFLINE, SUSPENDED)",
    }),
  })
  .strict();

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type UpdateDeviceStatusInput = z.infer<typeof updateDeviceStatusSchema>;