import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../../app";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

describe("Device Module Integration Tests", () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let userAChildId: string;
  let userBChildId: string;
  let userADeviceId: string;
  let userBDeviceId: string;

  beforeAll(async () => {
    // Clean up previous test entities
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } },
    });

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create User A & Child A
    const dbUserA = await prisma.user.create({
      data: { name: "User A", email: "device_test_a@example.com", passwordHash },
    });
    const tokenA = jwt.sign(
      { sub: dbUserA.id, email: dbUserA.email, role: dbUserA.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userA = { id: dbUserA.id, email: dbUserA.email, token: tokenA };

    const childA = await prisma.child.create({
      data: { name: "Child A", age: 10, parentId: userA.id },
    });
    userAChildId = childA.id;

    // Create User B & Child B
    const dbUserB = await prisma.user.create({
      data: { name: "User B", email: "device_test_b@example.com", passwordHash },
    });
    const tokenB = jwt.sign(
      { sub: dbUserB.id, email: dbUserB.email, role: dbUserB.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userB = { id: dbUserB.id, email: dbUserB.email, token: tokenB };

    const childB = await prisma.child.create({
      data: { name: "Child B", age: 12, parentId: userB.id },
    });
    userBChildId = childB.id;

    // User B creates a device for tenant tests
    const devB = await prisma.device.create({
      data: {
        name: "User B Phone",
        type: "SMARTPHONE",
        status: "ONLINE",
        userId: userB.id,
        childId: userBChildId,
      },
    });
    userBDeviceId = devB.id;
  });

  afterAll(async () => {
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["device_test_a@example.com", "device_test_b@example.com"] } },
    });
    await prisma.$disconnect();
  });

  describe("POST /api/devices", () => {
    it("should create unassigned device for authenticated user (201)", async () => {
      const res = await request(app)
        .post("/api/devices")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          name: "Home Tablet",
          type: "TABLET",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device).toBeDefined();
      expect(res.body.data.device.name).toBe("Home Tablet");
      expect(res.body.data.device.type).toBe("TABLET");
      expect(res.body.data.device.status).toBe("ONLINE");
      expect(res.body.data.device.userId).toBe(userA.id);
      expect(res.body.data.device.childId).toBeNull();
    });

    it("should create device assigned to own child (201)", async () => {
      const res = await request(app)
        .post("/api/devices")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          name: "Alice Phone",
          type: "SMARTPHONE",
          childId: userAChildId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device.childId).toBe(userAChildId);
      expect(res.body.data.device.child).toBeDefined();
      expect(res.body.data.device.child.name).toBe("Child A");

      userADeviceId = res.body.data.device.id;
    });

    it("should reject device assigned to another user's child with 404", async () => {
      const res = await request(app)
        .post("/api/devices")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          name: "Sneaky Device",
          type: "SMARTPHONE",
          childId: userBChildId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Child not found");
    });

    it("should reject unauthenticated access (401)", async () => {
      const res = await request(app)
        .post("/api/devices")
        .send({ name: "Rogue Phone" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/devices", () => {
    it("should list only own devices for User A (200)", async () => {
      const res = await request(app)
        .get("/api/devices")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.devices)).toBe(true);
      expect(res.body.data.devices.length).toBe(2);

      const deviceIds = res.body.data.devices.map((d: any) => d.id);
      expect(deviceIds).toContain(userADeviceId);
      expect(deviceIds).not.toContain(userBDeviceId);
    });
  });

  describe("GET /api/devices/:id", () => {
    it("should get own device for User A (200)", async () => {
      const res = await request(app)
        .get(`/api/devices/${userADeviceId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device.id).toBe(userADeviceId);
      expect(res.body.data.device.name).toBe("Alice Phone");
    });

    it("should return 404 when USER A attempts to access USER B's device", async () => {
      const res = await request(app)
        .get(`/api/devices/${userBDeviceId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Device not found");
    });
  });

  describe("PATCH /api/devices/:id", () => {
    it("should update own device for User A (200)", async () => {
      const res = await request(app)
        .patch(`/api/devices/${userADeviceId}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          name: "Alice Phone Pro",
          type: "SMARTPHONE",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device.name).toBe("Alice Phone Pro");
    });

    it("should return 404 when USER A attempts to update USER B's device", async () => {
      const res = await request(app)
        .patch(`/api/devices/${userBDeviceId}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Tampered Device" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify User B's device unchanged
      const checkRes = await request(app)
        .get(`/api/devices/${userBDeviceId}`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(checkRes.body.data.device.name).toBe("User B Phone");
    });
  });

  describe("PATCH /api/devices/:id/status", () => {
    it("should update device status and lastSeen for own device (200)", async () => {
      const beforeUpdate = new Date();
      const res = await request(app)
        .patch(`/api/devices/${userADeviceId}/status`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ status: "SUSPENDED" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device.status).toBe("SUSPENDED");
      expect(new Date(res.body.data.device.lastSeen).getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime() - 2000
      );
    });

    it("should return 404 when USER A attempts to update status of USER B's device", async () => {
      const res = await request(app)
        .patch(`/api/devices/${userBDeviceId}/status`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ status: "SUSPENDED" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/devices/:id", () => {
    it("should return 404 when USER A attempts to delete USER B's device", async () => {
      const res = await request(app)
        .delete(`/api/devices/${userBDeviceId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify User B device still exists
      const checkRes = await request(app)
        .get(`/api/devices/${userBDeviceId}`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.device.name).toBe("User B Phone");
    });

    it("should delete own device for User A (200)", async () => {
      const res = await request(app)
        .delete(`/api/devices/${userADeviceId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify device is deleted
      const checkRes = await request(app)
        .get(`/api/devices/${userADeviceId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(checkRes.status).toBe(404);
    });
  });
});