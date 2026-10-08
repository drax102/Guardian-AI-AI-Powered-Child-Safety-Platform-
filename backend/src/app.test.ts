import { describe, it, expect, vi, afterAll } from "vitest";
import request from "supertest";
import { app } from "./app";
import { prisma } from "./config/prisma";
import { isOriginAllowed } from "./config/cors";

describe("Application Production Configuration & Middleware Tests", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Trust Proxy Configuration", () => {
    it("should respect X-Forwarded-For client IP through reverse proxy", async () => {
      const res = await request(app)
        .get("/health")
        .set("X-Forwarded-For", "203.0.113.195, 10.0.0.1");

      expect(res.status).toBe(200);
      expect(app.get("trust proxy")).toBe(1);
    });
  });

  describe("GET /health (Database Connectivity Check)", () => {
    it("should return 200 with database: connected when PostgreSQL is healthy", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: "ok",
        service: "guardianai-api",
        database: "connected",
      });
    });

    it("should return 503 and not leak DB errors if query fails", async () => {
      const querySpy = vi
        .spyOn(prisma, "$queryRawUnsafe")
        .mockRejectedValueOnce(new Error("FATAL: password authentication failed for user postgres at pg.internal:5432"));

      const res = await request(app).get("/health");

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        status: "error",
        service: "guardianai-api",
        database: "disconnected",
      });
      // Ensure no raw SQL or DB connection string/host leaked
      expect(JSON.stringify(res.body)).not.toContain("password authentication failed");
      expect(JSON.stringify(res.body)).not.toContain("pg.internal");

      querySpy.mockRestore();
    });
  });

  describe("CORS Policy & Normalization", () => {
    it("should allow configured FRONTEND_URL without trailing slash", () => {
      expect(isOriginAllowed("http://localhost:5173")).toBe(true);
      expect(isOriginAllowed("http://localhost:5173/")).toBe(true);
      expect(isOriginAllowed("https://malicious-attacker.com")).toBe(false);
    });
  });
});
