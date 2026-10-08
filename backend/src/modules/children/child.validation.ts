import { z } from "zod";

export const childIdParamSchema = z.object({
  id: z.string().uuid("Invalid child ID format"),
});

export const createChildSchema = z
  .object({
    name: z
      .string({ required_error: "Child name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .max(100, "Name cannot exceed 100 characters"),
    age: z
      .number({ required_error: "Child age is required" })
      .int("Age must be an integer")
      .min(1, "Age must be at least 1 year")
      .max(18, "Child age must not exceed 18 years"),
    avatarUrl: z
      .string()
      .url("Invalid avatar URL format")
      .optional()
      .or(z.literal(""))
      .nullable(),
  })
  .strict();

export const updateChildSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),
    age: z
      .number()
      .int("Age must be an integer")
      .min(1, "Age must be at least 1 year")
      .max(18, "Child age must not exceed 18 years")
      .optional(),
    avatarUrl: z
      .string()
      .url("Invalid avatar URL format")
      .optional()
      .or(z.literal(""))
      .nullable(),
  })
  .strict();

export type CreateChildInput = z.infer<typeof createChildSchema>;
export type UpdateChildInput = z.infer<typeof updateChildSchema>;