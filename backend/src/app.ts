import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { globalRateLimiter } from "./middlewares/rateLimiter";
import { isOriginAllowed } from "./config/cors";
import { errorHandler } from "./middlewares/error.middleware";
import authRouter from "./modules/auth/auth.routes";
import childRouter from "./modules/children/child.routes";
import deviceRouter from "./modules/devices/device.routes";
import alertRouter from "./modules/alerts/alert.routes";
import riskRouter from "./modules/risk/risk.routes";
import evidenceRouter from "./modules/evidence/evidence.routes";

export const app: Application = express();

// Trust reverse proxy (Render, AWS ALB, Cloudflare) - must be set before rate limiting
app.set("trust proxy", 1);

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Body Parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Rate Limiter
app.use(globalRateLimiter);

// Health Check Endpoint (verifies DB connectivity via SELECT 1 with fast timeout)
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await Promise.race([
      prisma.$queryRawUnsafe("SELECT 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database health check timed out")), 2000)
      ),
    ]);

    res.status(200).json({
      status: "ok",
      service: "guardianai-api",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      service: "guardianai-api",
      database: "disconnected",
    });
  }
});

// Auth Routes
app.use("/api/auth", authRouter);

// Child Routes
app.use("/api/children", childRouter);

// Device Routes
app.use("/api/devices", deviceRouter);

// Evidence Routes
app.use("/api", evidenceRouter);

// Alert Routes
app.use("/api/alerts", alertRouter);

// Risk Assessment Routes
app.use("/api/risk-assessments", riskRouter);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
