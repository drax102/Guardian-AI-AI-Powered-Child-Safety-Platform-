import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../../app";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

describe("Child Module Integration Tests", () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let userAChildId: string;
  let userBChildId: string;

  beforeAll(async () => {
    // Clean up test users
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } },
    });

    // Create User A
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const dbUserA = await prisma.user.create({
      data: {
        name: "Parent A",
        email: "child_test_a@example.com",
        passwordHash,
      },
    });
    const tokenA = jwt.sign(
      { sub: dbUserA.id, email: dbUserA.email, role: dbUserA.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userA = { id: dbUserA.id, email: dbUserA.email, token: tokenA };

    // Create User B
    const dbUserB = await prisma.user.create({
      data: {
        name: "Parent B",
        email: "child_test_b@example.com",
        passwordHash,
      },
    });
    const tokenB = jwt.sign(
      { sub: dbUserB.id, email: dbUserB.email, role: dbUserB.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userB = { id: dbUserB.id, email: dbUserB.email, token: tokenB };
  });

  afterAll(async () => {
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["child_test_a@example.com", "child_test_b@example.com"] } },
    });
    await prisma.$disconnect();
  });

  describe("POST /api/children", () => {
    it("should create a child for authenticated User A (201)", async () => {
      const res = await request(app)
        .post("/api/children")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          name: "Alice",
          age: 10,
          avatarUrl: "https://example.com/alice.jpg",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.child).toBeDefined();
      expect(res.body.data.child.name).toBe("Alice");
      expect(res.body.data.child.age).toBe(10);
      expect(res.body.data.child.parentId).toBe(userA.id);

      userAChildId = res.body.data.child.id;
    });

    it("should create a child for authenticated User B (201)", async () => {
      const res = await request(app)
        .post("/api/children")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          name: "Bob",
          age: 12,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.child.name).toBe("Bob");
      expect(res.body.data.child.parentId).toBe(userB.id);

      userBChildId = res.body.data.child.id;
    });

    it("should reject invalid child data (400)", async () => {
      // Empty / short name
      const resEmpty = await request(app)
        .post("/api/children")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "", age: 8 });
      expect(resEmpty.status).toBe(400);

      // Negative age
      const resNeg = await request(app)
        .post("/api/children")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Child", age: -1 });
      expect(resNeg.status).toBe(400);

      // Age > 18
      const resOld = await request(app)
        .post("/api/children")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Adult", age: 19 });
      expect(resOld.status).toBe(400);

      // Invalid avatar URL
      const resUrl = await request(app)
        .post("/api/children")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Child", age: 8, avatarUrl: "not-a-valid-url" });
      expect(resUrl.status).toBe(400);
    });

    it("should reject unauthenticated access (401)", async () => {
      const res = await request(app)
        .post("/api/children")
        .send({ name: "Unauth Child", age: 9 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/children", () => {
    it("should list only User A's children for User A (200)", async () => {
      const res = await request(app)
        .get("/api/children")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.children)).toBe(true);
      expect(res.body.data.children.length).toBe(1);
      expect(res.body.data.children[0].id).toBe(userAChildId);
      expect(res.body.data.children[0].name).toBe("Alice");
    });

    it("should list only User B's children for User B (200)", async () => {
      const res = await request(app)
        .get("/api/children")
        .set("Authorization", `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.children.length).toBe(1);
      expect(res.body.data.children[0].id).toBe(userBChildId);
      expect(res.body.data.children[0].name).toBe("Bob");
    });
  });

  describe("GET /api/children/:id", () => {
    it("should get own child for User A (200)", async () => {
      const res = await request(app)
        .get(`/api/children/${userAChildId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.child.id).toBe(userAChildId);
    });

    it("should return 404 when USER A attempts to access USER B's child", async () => {
      const res = await request(app)
        .get(`/api/children/${userBChildId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /api/children/:id", () => {
    it("should update own child for User A (200)", async () => {
      const res = await request(app)
        .patch(`/api/children/${userAChildId}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Alice Cooper", age: 11 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.child.name).toBe("Alice Cooper");
      expect(res.body.data.child.age).toBe(11);
    });

    it("should return 404 when USER A attempts to update USER B's child", async () => {
      const res = await request(app)
        .patch(`/api/children/${userBChildId}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Malicious Tamper" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify User B's child is unchanged
      const checkRes = await request(app)
        .get(`/api/children/${userBChildId}`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(checkRes.body.data.child.name).toBe("Bob");
    });
  });

  describe("DELETE /api/children/:id", () => {
    it("should return 404 when USER A attempts to delete USER B's child", async () => {
      const res = await request(app)
        .delete(`/api/children/${userBChildId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify User B's child still exists
      const checkRes = await request(app)
        .get(`/api/children/${userBChildId}`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.child.name).toBe("Bob");
    });

    it("should delete own child for User A (200)", async () => {
      const res = await request(app)
        .delete(`/api/children/${userAChildId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify child is deleted
      const checkRes = await request(app)
        .get(`/api/children/${userAChildId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(checkRes.status).toBe(404);
    });
  });
});