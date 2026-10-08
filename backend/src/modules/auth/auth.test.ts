import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../app";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

describe("Auth Module Integration Tests", () => {
  const testUser = {
    name: "Test Guardian",
    email: "testguardian@example.com",
    password: "Password123!",
  };

  let validAccessToken: string;
  let validRefreshToken: string;
  let currentUserId: string;

  beforeAll(async () => {
    // Clean up any test users from previous test runs
    await prisma.refreshToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    // Final cleanup and disconnect
    await prisma.refreshToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await prisma.$disconnect();
  });

  describe("POST /api/auth/signup", () => {
    it("should register a new user successfully (201)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      currentUserId = res.body.data.user.id;
      validAccessToken = res.body.data.accessToken;
      validRefreshToken = res.body.data.refreshToken;
    });

    it("should reject duplicate email registration (409)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already registered");
    });

    it("should reject signup with invalid email format (400)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Invalid Email",
          email: "not-a-valid-email",
          password: "Password123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed");
    });

    it("should reject signup with weak password (400)", async () => {
      // Too short (< 8 chars)
      const resShort = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Short Pass",
          email: "shortpass@example.com",
          password: "Short1",
        });

      expect(resShort.status).toBe(400);
      expect(resShort.body.success).toBe(false);

      // Missing numbers
      const resNoNum = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "No Num",
          email: "nonum@example.com",
          password: "PasswordWithoutNumber",
        });

      expect(resNoNum.status).toBe(400);
      expect(resNoNum.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials (200)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());

      // Update tokens for subsequent tests
      validAccessToken = res.body.data.accessToken;
      validRefreshToken = res.body.data.refreshToken;
    });

    it("should reject login with incorrect password (401)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "WrongPassword999!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should reject login with non-existent email (401)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nobody_here_12345@example.com",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid email or password");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user profile with valid access token (200)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${validAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe(currentUserId);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("should reject request with missing token (401)", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("token required");
    });

    it("should reject request with expired access token (401)", async () => {
      const expiredToken = jwt.sign(
        {
          sub: currentUserId,
          email: testUser.email,
          role: "PARENT",
          type: "access",
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: "-5s" }
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("expired");
    });

    it("should reject request when refresh token is provided instead of access token (401)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${validRefreshToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh", () => {
    let oldRefreshToken: string;
    let newRefreshToken: string;

    it("should refresh tokens successfully and rotate refresh token (200)", async () => {
      oldRefreshToken = validRefreshToken;

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: oldRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(oldRefreshToken);

      newRefreshToken = res.body.data.refreshToken;
      validAccessToken = res.body.data.accessToken;
      validRefreshToken = newRefreshToken;
    });

    it("should reject rotated old refresh token (401)", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: oldRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Revoked refresh token");
    });

    it("should reject an explicitly revoked token and revoke all active user sessions on replay (401)", async () => {
      // 1. Login to get a valid token pair (Session 1)
      const resLogin1 = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: testUser.password });
      const session1Refresh = resLogin1.body.data.refreshToken;

      // 2. Login from another device to get a second active session (Session 2)
      const resLogin2 = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: testUser.password });
      const session2Refresh = resLogin2.body.data.refreshToken;

      // 3. Rotate Session 1 legitimately
      const resRotate1 = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: session1Refresh });
      expect(resRotate1.status).toBe(200);

      // 4. Attacker replays old session1Refresh!
      const resReplay = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: session1Refresh });

      expect(resReplay.status).toBe(401);
      expect(resReplay.body.success).toBe(false);
      expect(resReplay.body.message).toMatch(/replay detected/i);

      // 5. Verify Session 2 was revoked due to replay detection
      const resSession2AfterReplay = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: session2Refresh });

      expect(resSession2AfterReplay.status).toBe(401);
      expect(resSession2AfterReplay.body.success).toBe(false);
    });

    it("should handle concurrent refresh attempts: only one succeeds, parallel request rejected (401)", async () => {
      // Login to get a fresh token
      const resLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: testUser.email, password: testUser.password });
      const currentRefresh = resLogin.body.data.refreshToken;

      // Send two concurrent requests with the identical refresh token
      const [res1, res2] = await Promise.all([
        request(app).post("/api/auth/refresh").send({ refreshToken: currentRefresh }),
        request(app).post("/api/auth/refresh").send({ refreshToken: currentRefresh }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (200) and the other must be rejected (401)
      expect(statuses).toEqual([200, 401]);
    });

    it("should reject expired refresh token (401)", async () => {
      const expiredRefreshToken = jwt.sign(
        {
          sub: currentUserId,
          jti: "expired-jti-test",
          type: "refresh",
        },
        env.JWT_REFRESH_SECRET,
        { expiresIn: "-10s" }
      );

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: expiredRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully (200)", async () => {
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Logged out successfully");
    });

    it("should reject old refresh token after logout (401)", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});