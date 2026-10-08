
import multer from "multer";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import FileType from "file-type";
import fs from "fs";
import os from "os";
import path from "path";
import { AppError } from "./error.middleware";

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 uploads per window
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many upload requests, please try again after 15 minutes.",
  },
});

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm"];
export const ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE = MAX_VIDEO_SIZE;

const UPLOAD_TEMP_DIR = path.join(os.tmpdir(), "guardianai-uploads");
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

export const cleanupFile = (filePath?: string): void => {
  if (!filePath) return;
  fs.unlink(filePath, () => {
    // safely ignore unlink errors (already deleted or ENOENT)
  });
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

const multerUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(
        new AppError(
          `Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, MP4, WebM`,
          400
        )
      );
    }
    cb(null, true);
  },
});

export const singleUpload = (fieldName: string = "file") => {
  return (req: Request, res: Response, next: NextFunction) => {
    multerUpload.single(fieldName)(req, res, async (err: any) => {
      // Ensure uploaded temp file is cleaned up on response end or client abort
      const cleanupOnFinish = () => {
        if (req.file?.path) {
          cleanupFile(req.file.path);
        }
      };
      res.on("finish", cleanupOnFinish);
      res.on("close", cleanupOnFinish);

      if (err) {
        if (req.file?.path) {
          cleanupFile(req.file.path);
        }
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return next(
              new AppError("File size exceeds maximum allowed limit of 50MB", 400)
            );
          }
          return next(new AppError(`Upload error: ${err.message}`, 400));
        }
        return next(err);
      }

      if (!req.file) {
        return next(new AppError("No file uploaded", 400));
      }

      try {
        // Deep byte signature validation (magic numbers) from first 4100 bytes of temporary file
        let detected: { ext: string; mime: string } | undefined;
        if (req.file.path && fs.existsSync(req.file.path)) {
          const fd = await fs.promises.open(req.file.path, "r");
          try {
            const sampleBuf = Buffer.alloc(4100);
            const { bytesRead } = await fd.read(sampleBuf, 0, 4100, 0);
            detected = await FileType.fromBuffer(sampleBuf.subarray(0, bytesRead));
          } finally {
            await fd.close();
          }
        } else if (req.file.buffer) {
          detected = await FileType.fromBuffer(req.file.buffer);
        }

        if (!detected) {
          cleanupFile(req.file.path);
          return next(
            new AppError(
              "Invalid file content: unable to determine file type or file content is corrupt",
              400
            )
          );
        }

        // Validate detected actual type against allowed list
        if (!ALLOWED_MIMES.includes(detected.mime)) {
          cleanupFile(req.file.path);
          return next(
            new AppError(
              `Unsupported file content type: ${detected.mime}. Allowed types: JPEG, PNG, WebP, MP4, WebM`,
              400
            )
          );
        }

        // Reject if declared MIME type != detected actual file type
        if (req.file.mimetype !== detected.mime) {
          cleanupFile(req.file.path);
          return next(
            new AppError(
              `File type mismatch: declared MIME type "${req.file.mimetype}" does not match detected file type "${detected.mime}"`,
              400
            )
          );
        }

        // Enforce specific size limits based on validated MIME
        if (ALLOWED_IMAGE_MIMES.includes(detected.mime) && req.file.size > MAX_IMAGE_SIZE) {
          cleanupFile(req.file.path);
          return next(
            new AppError("Image file size exceeds maximum limit of 10MB", 400)
          );
        }

        if (ALLOWED_VIDEO_MIMES.includes(detected.mime) && req.file.size > MAX_VIDEO_SIZE) {
          cleanupFile(req.file.path);
          return next(
            new AppError("Video file size exceeds maximum limit of 50MB", 400)
          );
        }

        next();
      } catch (signatureErr) {
        cleanupFile(req.file.path);
        next(signatureErr);
      }
    });
  };
};
