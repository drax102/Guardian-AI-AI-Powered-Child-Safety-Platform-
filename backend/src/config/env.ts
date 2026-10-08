import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z
      .string({
        required_error: "DATABASE_URL is required",
      })
      .min(1, "DATABASE_URL cannot be empty"),
    JWT_ACCESS_SECRET: z
      .string({
        required_error: "JWT_ACCESS_SECRET is required",
      })
      .min(16, "JWT_ACCESS_SECRET must be at least 16 characters long"),
    JWT_REFRESH_SECRET: z
      .string({
        required_error: "JWT_REFRESH_SECRET is required",
      })
      .min(16, "JWT_REFRESH_SECRET must be at least 16 characters long"),
    FRONTEND_URL: z
      .string({
        required_error: "FRONTEND_URL is required",
      })
      .url("FRONTEND_URL must be a valid URL"),
    CLOUDINARY_CLOUD_NAME: z.string().default(""),
    CLOUDINARY_API_KEY: z.string().default(""),
    CLOUDINARY_API_SECRET: z.string().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.CLOUDINARY_CLOUD_NAME || data.CLOUDINARY_CLOUD_NAME.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDINARY_CLOUD_NAME"],
          message: "CLOUDINARY_CLOUD_NAME is required in production",
        });
      }
      if (!data.CLOUDINARY_API_KEY || data.CLOUDINARY_API_KEY.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDINARY_API_KEY"],
          message: "CLOUDINARY_API_KEY is required in production",
        });
      }
      if (!data.CLOUDINARY_API_SECRET || data.CLOUDINARY_API_SECRET.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDINARY_API_SECRET"],
          message: "CLOUDINARY_API_SECRET is required in production",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[ENV ERROR] Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  throw new Error("Invalid environment variables configuration");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
