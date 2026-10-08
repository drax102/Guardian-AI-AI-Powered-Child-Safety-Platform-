import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../../app";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

describe("Alert Module Integration Tests", () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let childA1Id: string;
  let childA2Id: string;
  let childBId: string;
  let deviceA1Id: string;
  let deviceA2Id: string;
  let deviceAUnassignedId: string;
  let deviceBId: string;
  let alertAId: string;
  let alertBId: string;

  beforeAll(async () => {
    // Clean up test records
    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } },
    });

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create User A
    const dbUserA = await prisma.user.create({
      data: { name: "Alert Parent A", email: "alert_test_a@example.com", passwordHash },
    });
    const tokenA = jwt.sign(
      { sub: dbUserA.id, email: dbUserA.email, role: dbUserA.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userA = { id: dbUserA.id, email: dbUserA.email, token: tokenA };

    // Create Child A1 and Child A2 for User A
    const childA1 = await prisma.child.create({
      data: { name: "Child A1", age: 11, parentId: userA.id },
    });
    childA1Id = childA1.id;

    const childA2 = await prisma.child.create({
      data: { name: "Child A2", age: 14, parentId: userA.id },
    });
    childA2Id = childA2.id;

    // Device A1 assigned to Child A1
    const deviceA1 = await prisma.device.create({
      data: { name: "Phone A1", type: "SMARTPHONE", userId: userA.id, childId: childA1Id },
    });
    deviceA1Id = deviceA1.id;

    // Device A2 assigned to Child A2
    const deviceA2 = await prisma.device.create({
      data: { name: "Tablet A2", type: "TABLET", userId: userA.id, childId: childA2Id },
    });
    deviceA2Id = deviceA2.id;

    // Device A Unassigned (shared household hardware)
    const deviceAUnassigned = await prisma.device.create({
      data: { name: "Shared Desktop", type: "DESKTOP", userId: userA.id, childId: null },
    });
    deviceAUnassignedId = deviceAUnassigned.id;

    // Create User B
    const dbUserB = await prisma.user.create({
      data: { name: "Alert Parent B", email: "alert_test_b@example.com", passwordHash },
    });
    const tokenB = jwt.sign(
      { sub: dbUserB.id, email: dbUserB.email, role: dbUserB.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userB = { id: dbUserB.id, email: dbUserB.email, token: tokenB };

    // Create Child B and Device B
    const childB = await prisma.child.create({
      data: { name: "Child B", age: 13, parentId: userB.id },
    });
    childBId = childB.id;

    const deviceB = await prisma.device.create({
      data: { name: "Phone B", type: "SMARTPHONE", userId: userB.id, childId: childBId },
    });
    deviceBId = deviceB.id;

    // User B alert for tenant isolation tests
    const alertB = await prisma.alert.create({
      data: {
        type: "CYBERBULLYING",
        severity: "HIGH",
        message: "User B private alert",
        status: "UNREAD",
        userId: userB.id,
        childId: childBId,
        deviceId: deviceBId,
      },
    });
    alertBId = alertB.id;
  });

  afterAll(async () => {
    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["alert_test_a@example.com", "alert_test_b@example.com"] } },
    });
    await prisma.$disconnect();
  });

  describe("POST /api/alerts - Creation & Consistency", () => {
    it("should create alert with matching Child A1 and Device A1 (201)", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "SUSPICIOUS_MESSAGING",
          severity: "MEDIUM",
          message: "Suspicious conversation detected with unknown contact.",
          childId: childA1Id,
          deviceId: deviceA1Id,
          metadata: {
            confidence: 0.94,
            detector: "nlp-risk-v1",
            keywords: ["secret", "meet"],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alert).toBeDefined();
      expect(res.body.data.alert.childId).toBe(childA1Id);
      expect(res.body.data.alert.deviceId).toBe(deviceA1Id);
      expect(res.body.data.alert.metadata.detector).toBe("nlp-risk-v1");

      alertAId = res.body.data.alert.id;
    });

    it("should reject alert associating Child A1 with Device A2 assigned to Child A2 (400)", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "EXPLICIT_CONTENT",
          message: "Attempting mismatched child and device association.",
          childId: childA1Id,
          deviceId: deviceA2Id, // Assigned to Child A2
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("assigned to a different child");
    });

    it("should allow alert with Child A1 and an unassigned Device (201)", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "UNAUTHORIZED_APP",
          severity: "LOW",
          message: "Unauthorized app launched on shared household desktop.",
          childId: childA1Id,
          deviceId: deviceAUnassignedId, // childId is null
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alert.childId).toBe(childA1Id);
      expect(res.body.data.alert.deviceId).toBe(deviceAUnassignedId);
    });

    it("should reject alert creation with another user's child (404)", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "CYBERBULLYING",
          message: "Trying to attach to another parent child.",
          childId: childBId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Child not found");
    });

    it("should reject alert creation with another user's device (404)", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "EXPLICIT_CONTENT",
          message: "Trying to attach to another user device.",
          deviceId: deviceBId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Device not found");
    });

    it("should reject unknown/protected fields like userId injection (400)", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "ONLINE_PREDATION",
          message: "Attempting to inject userId",
          userId: userB.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject metadata with invalid oversized keys (400)", async () => {
      const longKey = "a".repeat(55);
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "CYBERBULLYING",
          message: "Testing metadata key length validation.",
          metadata: {
            [longKey]: "valid value",
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject unauthenticated request (401)", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .send({
          type: "CYBERBULLYING",
          message: "Unauthenticated alert",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/alerts", () => {
    it("should list only own alerts for User A with pagination (200)", async () => {
      const res = await request(app)
        .get("/api/alerts?page=1&limit=10")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.alerts)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();

      const alertIds = res.body.data.alerts.map((a: any) => a.id);
      expect(alertIds).toContain(alertAId);
      expect(alertIds).not.toContain(alertBId);
    });
  });

  describe("GET /api/alerts/:id", () => {
    it("should get own alert by id (200)", async () => {
      const res = await request(app)
        .get(`/api/alerts/${alertAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alert.id).toBe(alertAId);
    });

    it("should return 404 when USER A attempts to access USER B's alert", async () => {
      const res = await request(app)
        .get(`/api/alerts/${alertBId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Alert not found");
    });

    it("should return 400 for invalid UUID (400)", async () => {
      const res = await request(app)
        .get("/api/alerts/not-a-valid-uuid")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/alerts/:id/status", () => {
    it("should update own alert status (200)", async () => {
      const res = await request(app)
        .patch(`/api/alerts/${alertAId}/status`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ status: "REVIEWED" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alert.status).toBe("REVIEWED");
    });

    it("should return 404 when USER A attempts to update USER B's alert status", async () => {
      const res = await request(app)
        .patch(`/api/alerts/${alertBId}/status`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/alerts/:id", () => {
    it("should return 404 when USER A attempts to delete USER B's alert", async () => {
      const res = await request(app)
        .delete(`/api/alerts/${alertBId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should delete own alert for User A (200)", async () => {
      const res = await request(app)
        .delete(`/api/alerts/${alertAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/alerts/${alertAId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(checkRes.status).toBe(404);
    });
  });
});