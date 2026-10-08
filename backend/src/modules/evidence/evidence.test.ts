import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PassThrough } from "stream";
import { app } from "../../app";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { realtimeService } from "../../realtime/realtime.service";
import { cloudinary } from "../../config/cloudinary";
import { AlertType, Severity } from "@prisma/client";

// Binary fixture signatures
export const VALID_JPEG_BUFFER = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00,
]);

export const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
]);

export const VALID_WEBP_BUFFER = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBPVP8 "),
]);

export const VALID_MP4_BUFFER = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
]);

export const VALID_WEBM_BUFFER = Buffer.from([
  0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81, 0x01, 0x42, 0xF2, 0x81, 0x04, 0x42, 0xF3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D,
]);

export const VALID_PDF_BUFFER = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj<</Type/Catalog>>endobj\n");

// Mock Cloudinary SDK
vi.mock("../../config/cloudinary", () => {
  return {
    cloudinary: {
      uploader: {
        upload_stream: vi.fn((options, callback) => {
          const stream = new PassThrough();
          let buffer = Buffer.alloc(0);
          stream.on("data", (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
          });
          stream.on("finish", () => {
            const resourceType = options.resource_type || "image";
            callback(null, {
              public_id: `guardianai/evidence/mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              url: `http://res.cloudinary.com/guardianai/${resourceType}/upload/mock_sample.${resourceType === "video" ? "mp4" : "jpg"}`,
              secure_url: `https://res.cloudinary.com/guardianai/${resourceType}/upload/mock_sample.${resourceType === "video" ? "mp4" : "jpg"}`,
              format: resourceType === "video" ? "mp4" : "jpg",
              resource_type: resourceType,
              bytes: buffer.length || 2048,
              width: 1280,
              height: 720,
            });
          });
          return stream;
        }),
        destroy: vi.fn().mockResolvedValue({ result: "ok" }),
      },
    },
  };
});

describe("Evidence Media Integration Tests", () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let alertAId: string;
  let alertBId: string;
  let evidenceAId: string;

  beforeAll(async () => {
    // Clean up any test records
    await prisma.evidenceMedia.deleteMany({
      where: {
        alert: {
          user: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } },
        },
      },
    });
    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } },
    });

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create User A
    const dbUserA = await prisma.user.create({
      data: { name: "Evidence User A", email: "evidence_test_a@example.com", passwordHash },
    });
    const tokenA = jwt.sign(
      { sub: dbUserA.id, email: dbUserA.email, role: dbUserA.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userA = { id: dbUserA.id, email: dbUserA.email, token: tokenA };

    // Create User B
    const dbUserB = await prisma.user.create({
      data: { name: "Evidence User B", email: "evidence_test_b@example.com", passwordHash },
    });
    const tokenB = jwt.sign(
      { sub: dbUserB.id, email: dbUserB.email, role: dbUserB.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userB = { id: dbUserB.id, email: dbUserB.email, token: tokenB };

    // Create Alert for User A
    const dbAlertA = await prisma.alert.create({
      data: {
        userId: userA.id,
        type: AlertType.CYBERBULLYING,
        severity: Severity.HIGH,
        message: "Threatening message detected in chat",
      },
    });
    alertAId = dbAlertA.id;

    // Create Alert for User B
    const dbAlertB = await prisma.alert.create({
      data: {
        userId: userB.id,
        type: AlertType.ONLINE_PREDATION,
        severity: Severity.CRITICAL,
        message: "Suspicious contact initiated",
      },
    });
    alertBId = dbAlertB.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.evidenceMedia.deleteMany({
      where: {
        alert: {
          user: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } },
        },
      },
    });
    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["evidence_test_a@example.com", "evidence_test_b@example.com"] } },
    });
  });

  describe("POST /api/alerts/:alertId/evidence (Upload & Signature Validation)", () => {
    it("should successfully upload a valid JPEG image and emit evidence:created to owner room", async () => {
      const emitSpy = vi.spyOn(realtimeService, "emitToUser");

      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", VALID_JPEG_BUFFER, {
          filename: "screenshot.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evidence).toBeDefined();
      expect(res.body.data.evidence.alertId).toBe(alertAId);
      expect(res.body.data.evidence.resourceType).toBe("image");
      expect(res.body.data.evidence.publicId).toContain("guardianai/evidence/");
      expect(res.body.data.evidence.secureUrl).toContain("https://");

      evidenceAId = res.body.data.evidence.id;

      // Verify realtime event emitted to User A only
      expect(emitSpy).toHaveBeenCalledWith(
        userA.id,
        "evidence:created",
        expect.objectContaining({ id: evidenceAId, alertId: alertAId })
      );
      expect(emitSpy).not.toHaveBeenCalledWith(
        userB.id,
        "evidence:created",
        expect.anything()
      );

      emitSpy.mockRestore();
    });

    it("should successfully upload a valid PNG image", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", VALID_PNG_BUFFER, {
          filename: "snapshot.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evidence.resourceType).toBe("image");
    });

    it("should successfully upload a valid WebP image", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", VALID_WEBP_BUFFER, {
          filename: "capture.webp",
          contentType: "image/webp",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evidence.resourceType).toBe("image");
    });

    it("should successfully upload a valid MP4 video with resourceType 'video'", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", VALID_MP4_BUFFER, {
          filename: "recording.mp4",
          contentType: "video/mp4",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evidence.resourceType).toBe("video");
      expect(res.body.data.evidence.format).toBe("mp4");
    });

    it("should successfully upload a valid WebM video with resourceType 'video'", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", VALID_WEBM_BUFFER, {
          filename: "recording.webm",
          contentType: "video/webm",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evidence.resourceType).toBe("video");
    });

    it("should reject fake JPEG with corrupt/text bytes (400)", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", Buffer.from("this is definitely not a real jpeg file"), {
          filename: "fake.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid file content|unable to determine file type/i);
    });

    it("should reject fake PNG with corrupt/text bytes (400)", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", Buffer.from("plain text claiming to be a png"), {
          filename: "fake.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid file content|unable to determine file type/i);
    });

    it("should reject unsupported binary disguised as image (e.g. PDF bytes with image/jpeg) (400)", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", VALID_PDF_BUFFER, {
          filename: "document.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/unsupported file content type|mismatch/i);
    });

    it("should reject mismatched declared MIME vs detected MIME (valid PNG bytes with image/jpeg) (400)", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", VALID_PNG_BUFFER, {
          filename: "sneaky.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/file type mismatch/i);
    });

    it("should reject image exceeding 10MB limit (400)", async () => {
      // 10MB + valid PNG signature
      const largeBuffer = Buffer.concat([VALID_PNG_BUFFER, Buffer.alloc(10 * 1024 * 1024)]);

      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`)
        .attach("file", largeBuffer, {
          filename: "giant.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exceeds maximum limit of 10MB/i);
    }, 15000);

    it("should reject request when no file is attached", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no file uploaded/i);
    });

    it("should reject request with unauthenticated token (401)", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .attach("file", VALID_JPEG_BUFFER, {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(401);
    });

    it("should enforce tenant isolation: User B cannot upload evidence to User A's alert (404)", async () => {
      const res = await request(app)
        .post(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userB.token}`)
        .attach("file", VALID_JPEG_BUFFER, {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Alert not found");
    });

    it("should rollback and destroy Cloudinary asset if DB insertion fails", async () => {
      const destroySpy = vi.spyOn(cloudinary.uploader, "destroy");
      const originalCreate = prisma.evidenceMedia.create;
      prisma.evidenceMedia.create = vi
        .fn()
        .mockRejectedValueOnce(new Error("Simulated database failure")) as any;

      try {
        const res = await request(app)
          .post(`/api/alerts/${alertAId}/evidence`)
          .set("Authorization", `Bearer ${userA.token}`)
          .attach("file", VALID_JPEG_BUFFER, {
            filename: "test-rollback.jpg",
            contentType: "image/jpeg",
          });

        expect(res.status).toBe(500);
        expect(destroySpy).toHaveBeenCalled();
      } finally {
        prisma.evidenceMedia.create = originalCreate;
        destroySpy.mockRestore();
      }
    });
  });

  describe("GET /api/alerts/:alertId/evidence (List by Alert)", () => {
    it("should return all evidence items for user's own alert", async () => {
      const res = await request(app)
        .get(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.evidence)).toBe(true);
      expect(res.body.data.evidence.length).toBeGreaterThanOrEqual(1);
    });

    it("should enforce tenant isolation: User B cannot list evidence for User A's alert (404)", async () => {
      const res = await request(app)
        .get(`/api/alerts/${alertAId}/evidence`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Alert not found");
    });

    it("should return 404 for non-existent alert ID", async () => {
      const fakeAlertId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/alerts/${fakeAlertId}/evidence`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Alert not found");
    });
  });

  describe("GET /api/evidence/:id (Get by ID)", () => {
    it("should return evidence record by ID for the owning user", async () => {
      const res = await request(app)
        .get(`/api/evidence/${evidenceAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evidence.id).toBe(evidenceAId);
      expect(res.body.data.evidence.alertId).toBe(alertAId);
    });

    it("should enforce tenant isolation: User B cannot retrieve User A's evidence (404)", async () => {
      const res = await request(app)
        .get(`/api/evidence/${evidenceAId}`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Evidence not found");
    });

    it("should return 404 for non-existent evidence ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/evidence/${fakeId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Evidence not found");
    });
  });

  describe("DELETE /api/evidence/:id (Delete Semantics & Outcomes)", () => {
    it("should enforce tenant isolation: User B cannot delete User A's evidence (404)", async () => {
      const res = await request(app)
        .delete(`/api/evidence/${evidenceAId}`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Evidence not found");

      // Verify record still exists in DB
      const record = await prisma.evidenceMedia.findUnique({
        where: { id: evidenceAId },
      });
      expect(record).not.toBeNull();
    });

    it("Outcome C: should NOT delete DB record if Cloudinary throws an unexpected network error (502)", async () => {
      const destroySpy = vi
        .spyOn(cloudinary.uploader, "destroy")
        .mockRejectedValueOnce(new Error("Network connection timeout to Cloudinary"));

      const res = await request(app)
        .delete(`/api/evidence/${evidenceAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/failed to delete media asset/i);

      // Verify DB record is retained
      const record = await prisma.evidenceMedia.findUnique({
        where: { id: evidenceAId },
      });
      expect(record).not.toBeNull();

      destroySpy.mockRestore();
    });

    it("Outcome C: should NOT delete DB record if Cloudinary returns unexpected error response (502)", async () => {
      const destroySpy = vi
        .spyOn(cloudinary.uploader, "destroy")
        .mockResolvedValueOnce({ result: "error", error: { message: "Internal API failure" } } as any);

      const res = await request(app)
        .delete(`/api/evidence/${evidenceAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);

      // Verify DB record is retained
      const record = await prisma.evidenceMedia.findUnique({
        where: { id: evidenceAId },
      });
      expect(record).not.toBeNull();

      destroySpy.mockRestore();
    });

    it("Outcome B: should treat 'not found' from Cloudinary as idempotent and delete DB record (200)", async () => {
      // Create a temporary evidence record for idempotent test
      const tempEvidence = await prisma.evidenceMedia.create({
        data: {
          publicId: `guardianai/evidence/temp_missing_${Date.now()}`,
          url: "https://res.cloudinary.com/demo/image/upload/missing.jpg",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/missing.jpg",
          format: "jpg",
          resourceType: "image",
          bytes: 1024,
          alertId: alertAId,
        },
      });

      const destroySpy = vi
        .spyOn(cloudinary.uploader, "destroy")
        .mockResolvedValueOnce({ result: "not found" });

      const res = await request(app)
        .delete(`/api/evidence/${tempEvidence.id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify DB record was deleted
      const record = await prisma.evidenceMedia.findUnique({
        where: { id: tempEvidence.id },
      });
      expect(record).toBeNull();

      destroySpy.mockRestore();
    });

    it("Outcome A: should successfully delete evidence when Cloudinary succeeds ('ok'), delete DB record, and emit realtime event (200)", async () => {
      const emitSpy = vi.spyOn(realtimeService, "emitToUser");
      const destroySpy = vi
        .spyOn(cloudinary.uploader, "destroy")
        .mockResolvedValueOnce({ result: "ok" });

      const res = await request(app)
        .delete(`/api/evidence/${evidenceAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted successfully/i);

      // Verify Cloudinary destroy called with correct resourceType
      expect(destroySpy).toHaveBeenCalledWith(
        expect.stringContaining("guardianai/evidence/"),
        { resource_type: "image" }
      );

      // Verify deleted in DB
      const record = await prisma.evidenceMedia.findUnique({
        where: { id: evidenceAId },
      });
      expect(record).toBeNull();

      // Verify realtime event emitted to User A only
      expect(emitSpy).toHaveBeenCalledWith(userA.id, "evidence:deleted", {
        id: evidenceAId,
        alertId: alertAId,
      });
      expect(emitSpy).not.toHaveBeenCalledWith(
        userB.id,
        "evidence:deleted",
        expect.anything()
      );

      emitSpy.mockRestore();
      destroySpy.mockRestore();
    });

    it("should return 404 when attempting to delete already deleted evidence", async () => {
      const res = await request(app)
        .delete(`/api/evidence/${evidenceAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Evidence not found");
    });
  });

  describe("Alert Deletion & Cloudinary Orphan Cleanup", () => {
    it("should delete alert with no evidence without calling Cloudinary destroy", async () => {
      const alertNoEvidence = await prisma.alert.create({
        data: {
          userId: userA.id,
          type: AlertType.SCREEN_TIME_VIOLATION,
          severity: Severity.LOW,
          message: "Screen time exceeded",
        },
      });

      const destroySpy = vi.spyOn(cloudinary.uploader, "destroy");

      const res = await request(app)
        .delete(`/api/alerts/${alertNoEvidence.id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(destroySpy).not.toHaveBeenCalled();

      destroySpy.mockRestore();
    });

    it("should clean up Cloudinary asset when deleting alert with 1 evidence item", async () => {
      // Create alert with 1 evidence item
      const alert1 = await prisma.alert.create({
        data: {
          userId: userA.id,
          type: AlertType.EXPLICIT_CONTENT,
          severity: Severity.HIGH,
          message: "Inappropriate image detected",
        },
      });

      const ev1 = await prisma.evidenceMedia.create({
        data: {
          publicId: `guardianai/evidence/alert1_${Date.now()}`,
          url: "https://res.cloudinary.com/demo/image/upload/alert1.jpg",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/alert1.jpg",
          format: "jpg",
          resourceType: "image",
          bytes: 2048,
          alertId: alert1.id,
        },
      });

      const destroySpy = vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" });

      const res = await request(app)
        .delete(`/api/alerts/${alert1.id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(destroySpy).toHaveBeenCalledWith(ev1.publicId, { resource_type: "image" });

      // Verify DB cascade
      const evCheck = await prisma.evidenceMedia.findUnique({ where: { id: ev1.id } });
      expect(evCheck).toBeNull();

      destroySpy.mockRestore();
    });

    it("should clean up all Cloudinary assets when deleting alert with multiple evidence items", async () => {
      // Create alert with 2 evidence items (1 image, 1 video)
      const alertMulti = await prisma.alert.create({
        data: {
          userId: userA.id,
          type: AlertType.STRANGER_DANGER,
          severity: Severity.CRITICAL,
          message: "Multiple evidence items attached",
        },
      });

      const evImage = await prisma.evidenceMedia.create({
        data: {
          publicId: `guardianai/evidence/multi_img_${Date.now()}`,
          url: "https://res.cloudinary.com/demo/image/upload/multi_img.jpg",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/multi_img.jpg",
          format: "jpg",
          resourceType: "image",
          bytes: 4096,
          alertId: alertMulti.id,
        },
      });

      const evVideo = await prisma.evidenceMedia.create({
        data: {
          publicId: `guardianai/evidence/multi_vid_${Date.now()}`,
          url: "https://res.cloudinary.com/demo/video/upload/multi_vid.mp4",
          secureUrl: "https://res.cloudinary.com/demo/video/upload/multi_vid.mp4",
          format: "mp4",
          resourceType: "video",
          bytes: 1048576,
          alertId: alertMulti.id,
        },
      });

      const destroySpy = vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" });

      const res = await request(app)
        .delete(`/api/alerts/${alertMulti.id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(destroySpy).toHaveBeenCalledWith(evImage.publicId, { resource_type: "image" });
      expect(destroySpy).toHaveBeenCalledWith(evVideo.publicId, { resource_type: "video" });

      // Verify DB cascade deleted both
      const imgCheck = await prisma.evidenceMedia.findUnique({ where: { id: evImage.id } });
      const vidCheck = await prisma.evidenceMedia.findUnique({ where: { id: evVideo.id } });
      expect(imgCheck).toBeNull();
      expect(vidCheck).toBeNull();

      destroySpy.mockRestore();
    });

    it("should handle partial Cloudinary failure during alert deletion gracefully", async () => {
      const alertPartial = await prisma.alert.create({
        data: {
          userId: userA.id,
          type: AlertType.SUSPICIOUS_MESSAGING,
          severity: Severity.MEDIUM,
          message: "Partial failure test",
        },
      });

      const evFail = await prisma.evidenceMedia.create({
        data: {
          publicId: `guardianai/evidence/partial_fail_${Date.now()}`,
          url: "https://res.cloudinary.com/demo/image/upload/fail.jpg",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/fail.jpg",
          format: "jpg",
          resourceType: "image",
          bytes: 1024,
          alertId: alertPartial.id,
        },
      });

      const destroySpy = vi
        .spyOn(cloudinary.uploader, "destroy")
        .mockRejectedValueOnce(new Error("Temporary Cloudinary outage"));

      const res = await request(app)
        .delete(`/api/alerts/${alertPartial.id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      // Alert deletion still succeeds to prevent locking user
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // DB record is cascaded
      const evCheck = await prisma.evidenceMedia.findUnique({ where: { id: evFail.id } });
      expect(evCheck).toBeNull();

      destroySpy.mockRestore();
    });

    it("should enforce tenant isolation: User B cannot delete User A's alert to cause evidence deletion (404)", async () => {
      const alertIso = await prisma.alert.create({
        data: {
          userId: userA.id,
          type: AlertType.CYBERBULLYING,
          severity: Severity.HIGH,
          message: "Isolation alert",
        },
      });

      const evIso = await prisma.evidenceMedia.create({
        data: {
          publicId: `guardianai/evidence/iso_${Date.now()}`,
          url: "https://res.cloudinary.com/demo/image/upload/iso.jpg",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/iso.jpg",
          format: "jpg",
          resourceType: "image",
          bytes: 1024,
          alertId: alertIso.id,
        },
      });

      const res = await request(app)
        .delete(`/api/alerts/${alertIso.id}`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Alert not found");

      // Verify evidence was NOT deleted
      const evCheck = await prisma.evidenceMedia.findUnique({ where: { id: evIso.id } });
      expect(evCheck).not.toBeNull();
    });
  });
});
