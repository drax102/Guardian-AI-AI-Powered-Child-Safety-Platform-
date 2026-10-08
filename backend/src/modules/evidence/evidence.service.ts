import fs from "fs";
import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../config/cloudinary";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { realtimeService } from "../../realtime/realtime.service";

export class EvidenceService {
  async uploadEvidence(userId: string, alertId: string, file: Express.Multer.File) {
    // 1. Verify parent Alert belongs to authenticated user (Tenant Isolation)
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    // 2. Determine Cloudinary resource type
    const resourceType: "image" | "video" = file.mimetype.startsWith("video/")
      ? "video"
      : "image";

    // 3. Upload file stream to Cloudinary
    let uploadResult: UploadApiResponse;
    try {
      uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `guardianai/evidence/${alertId}`,
            resource_type: resourceType,
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error("Cloudinary upload failed"));
            }
            resolve(result);
          }
        );

        if (file.path && fs.existsSync(file.path)) {
          const fileReadStream = fs.createReadStream(file.path);
          fileReadStream.on("error", (err) => reject(err));
          fileReadStream.pipe(uploadStream);
        } else if (file.buffer) {
          uploadStream.end(file.buffer);
        } else {
          reject(new Error("No file content available for upload"));
        }
      });
    } catch (uploadErr: any) {
      // If Cloudinary credentials are not configured or invalid in local development, fall back to dev simulation
      if (
        process.env.NODE_ENV === "development" &&
        (uploadErr?.http_code === 401 ||
          uploadErr?.message?.includes("cloud_name") ||
          uploadErr?.message?.includes("api_key") ||
          uploadErr?.message?.includes("Must supply"))
      ) {
        console.warn(
          "[CLOUDINARY DEV FALLBACK] Cloudinary unconfigured or credentials rejected. Using dev simulation."
        );
        uploadResult = {
          public_id: `guardianai/evidence/${alertId}/${Date.now()}_${Math.random().toString(36).substring(7)}`,
          url: `http://res.cloudinary.com/demo/${resourceType}/upload/mock_sample.${resourceType === "video" ? "mp4" : "jpg"}`,
          secure_url: `https://res.cloudinary.com/demo/${resourceType}/upload/mock_sample.${resourceType === "video" ? "mp4" : "jpg"}`,
          format: resourceType === "video" ? "mp4" : "jpg",
          resource_type: resourceType,
          bytes: file.size,
          width: 1280,
          height: 720,
        } as UploadApiResponse;
      } else {
        console.error("[CLOUDINARY UPLOAD ERROR]", uploadErr);
        throw new AppError("Failed to upload evidence to storage", 502);
      }
    }

    // 4. Persist metadata in PostgreSQL with compensation rollback on error
    let evidenceRecord;
    try {
      evidenceRecord = await prisma.evidenceMedia.create({
        data: {
          publicId: uploadResult.public_id,
          url: uploadResult.url,
          secureUrl: uploadResult.secure_url,
          format: uploadResult.format || file.mimetype.split("/")[1] || "unknown",
          resourceType,
          bytes: uploadResult.bytes || file.size,
          width: uploadResult.width || null,
          height: uploadResult.height || null,
          alertId,
        },
      });
    } catch (dbError) {
      // Rollback: delete the uploaded asset in Cloudinary if DB record creation fails
      try {
        await cloudinary.uploader.destroy(uploadResult.public_id, {
          resource_type: resourceType,
        });
      } catch (cleanupError) {
        console.error(
          "[EVIDENCE ROLLBACK ERROR] Failed to clean up Cloudinary asset after DB error:",
          cleanupError
        );
      }
      throw dbError;
    }

    // 5. Emit realtime event to owning parent's room
    realtimeService.emitToUser(userId, "evidence:created", evidenceRecord);

    return evidenceRecord;
  }

  async findEvidenceByAlert(userId: string, alertId: string) {
    // Verify alert belongs to authenticated user
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    return prisma.evidenceMedia.findMany({
      where: { alertId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async findById(userId: string, evidenceId: string) {
    const evidence = await prisma.evidenceMedia.findUnique({
      where: { id: evidenceId },
      include: { alert: true },
    });

    if (!evidence || evidence.alert.userId !== userId) {
      throw new AppError("Evidence not found", 404);
    }

    const { alert, ...evidenceData } = evidence;
    return evidenceData;
  }

  async destroyCloudinaryAsset(
    publicId: string,
    resourceType: string
  ): Promise<"deleted" | "not_found"> {
    // Check if Cloudinary credentials are unconfigured in development
    const isCloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (process.env.NODE_ENV === "development" && !isCloudinaryConfigured) {
      console.warn(
        `[CLOUDINARY DEV FALLBACK] Cloudinary credentials unconfigured in development. Simulated destroy for ${publicId}`
      );
      return "deleted";
    }

    let result: any;
    try {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as "image" | "video",
      });
    } catch (cloudErr: any) {
      if (
        process.env.NODE_ENV === "development" &&
        (cloudErr?.http_code === 401 ||
          cloudErr?.http_code === 404 ||
          cloudErr?.message?.includes("cloud_name") ||
          cloudErr?.message?.includes("api_key") ||
          cloudErr?.message?.includes("Must supply") ||
          cloudErr?.message?.includes("Unexpected token") ||
          cloudErr?.message?.includes("SyntaxError"))
      ) {
        console.warn(
          `[CLOUDINARY DEV FALLBACK] Cloudinary unconfigured or credentials rejected. Simulated destroy for ${publicId}`
        );
        return "deleted";
      }

      console.error(
        `[CLOUDINARY DESTROY ERROR] Failed destroying ${publicId}:`,
        cloudErr
      );
      throw new AppError("Failed to delete media asset from storage", 502);
    }

    if (result?.result === "ok") {
      return "deleted";
    }

    if (result?.result === "not found") {
      // Idempotent deletion: asset already gone from Cloudinary
      return "not_found";
    }

    console.error(
      `[CLOUDINARY DESTROY REJECTED] Unexpected result for ${publicId}:`,
      result
    );
    throw new AppError("Failed to delete media asset from storage", 502);
  }

  async deleteEvidence(userId: string, evidenceId: string) {
    const evidence = await prisma.evidenceMedia.findUnique({
      where: { id: evidenceId },
      include: { alert: true },
    });

    if (!evidence || evidence.alert.userId !== userId) {
      throw new AppError("Evidence not found", 404);
    }

    const alertId = evidence.alertId;

    // 1. Destroy asset on Cloudinary (Throws 502 on unexpected failure, leaving DB intact)
    await this.destroyCloudinaryAsset(evidence.publicId, evidence.resourceType);

    // 2. Delete database record ONLY after Cloudinary succeeds or reports not found
    await prisma.evidenceMedia.delete({
      where: { id: evidenceId },
    });

    // 3. Emit realtime event to owning user
    realtimeService.emitToUser(userId, "evidence:deleted", {
      id: evidenceId,
      alertId,
    });

    return {
      success: true,
      message: "Evidence deleted successfully",
    };
  }
}

export const evidenceService = new EvidenceService();
