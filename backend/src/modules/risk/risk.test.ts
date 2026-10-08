import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../../app";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { riskService } from "./risk.service";

describe("Risk Assessment Module Integration Tests (Phase 4.1 Hardened)", () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let childAId: string;
  let childBId: string;
  let riskAssessmentAId: string;
  let riskAssessmentBId: string;

  beforeAll(async () => {
    // Clean up test records
    await prisma.riskAssessment.deleteMany({
      where: { child: { parent: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } },
    });

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create User A & Child A
    const dbUserA = await prisma.user.create({
      data: { name: "Risk Parent A", email: "risk_test_a@example.com", passwordHash },
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
    childAId = childA.id;

    // Create User B & Child B
    const dbUserB = await prisma.user.create({
      data: { name: "Risk Parent B", email: "risk_test_b@example.com", passwordHash },
    });
    const tokenB = jwt.sign(
      { sub: dbUserB.id, email: dbUserB.email, role: dbUserB.role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );
    userB = { id: dbUserB.id, email: dbUserB.email, token: tokenB };

    const childB = await prisma.child.create({
      data: { name: "Child B", age: 14, parentId: userB.id },
    });
    childBId = childB.id;

    // Seed assessments via internal Engine method
    const assessmentA = await riskService.createAssessmentFromEngine({
      childId: childAId,
      safetyScore: 92,
      cyberbullyingRisk: 5,
      contentRisk: 8,
      predatorRisk: 0,
      screenTimeRisk: 15,
      summaryNotes: "Engine generated baseline score for Child A",
    });
    riskAssessmentAId = assessmentA.id;

    const assessmentB = await riskService.createAssessmentFromEngine({
      childId: childBId,
      safetyScore: 80,
      cyberbullyingRisk: 15,
      contentRisk: 10,
      predatorRisk: 0,
      screenTimeRisk: 25,
      summaryNotes: "Engine generated baseline score for Child B",
    });
    riskAssessmentBId = assessmentB.id;
  });

  afterAll(async () => {
    await prisma.riskAssessment.deleteMany({
      where: { child: { parent: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["risk_test_a@example.com", "risk_test_b@example.com"] } },
    });
    await prisma.$disconnect();
  });

  describe("Security: Ordinary Client Cannot Fabricate AI/Model Output", () => {
    it("should reject public POST /api/risk-assessments with 404 (Route not found)", async () => {
      const res = await request(app)
        .post("/api/risk-assessments")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          childId: childAId,
          safetyScore: 99,
          cyberbullyingRisk: 0,
        });

      // Route removed from public API to prevent unauthorized client fabrication
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Route not found");
    });
  });

  describe("GET /api/risk-assessments - Reading Assessments", () => {
    it("should list only own risk assessments for User A (200)", async () => {
      const res = await request(app)
        .get("/api/risk-assessments")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.assessments)).toBe(true);
      expect(res.body.data.assessments.length).toBe(1);
      expect(res.body.data.assessments[0].id).toBe(riskAssessmentAId);

      const ids = res.body.data.assessments.map((r: any) => r.id);
      expect(ids).not.toContain(riskAssessmentBId);
    });

    it("should list risk assessments filtered by own childId (200)", async () => {
      const res = await request(app)
        .get(`/api/risk-assessments?childId=${childAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assessments.length).toBe(1);
    });

    it("should return 404 when filtering by another parent's childId", async () => {
      const res = await request(app)
        .get(`/api/risk-assessments?childId=${childBId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Child not found");
    });

    it("should reject unauthenticated request (401)", async () => {
      const res = await request(app).get("/api/risk-assessments");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/risk-assessments/:id", () => {
    it("should get own risk assessment by id (200)", async () => {
      const res = await request(app)
        .get(`/api/risk-assessments/${riskAssessmentAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.riskAssessment.id).toBe(riskAssessmentAId);
      expect(res.body.data.riskAssessment.safetyScore).toBe(92);
      expect(res.body.data.riskAssessment.child.name).toBe("Child A");
    });

    it("should return 404 when USER A attempts to access USER B's risk assessment", async () => {
      const res = await request(app)
        .get(`/api/risk-assessments/${riskAssessmentBId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Risk assessment not found");
    });

    it("should return 400 for invalid UUID parameter (400)", async () => {
      const res = await request(app)
        .get("/api/risk-assessments/not-a-valid-uuid")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/risk-assessments/:id", () => {
    it("should return 404 when USER A attempts to delete USER B's risk assessment", async () => {
      const res = await request(app)
        .delete(`/api/risk-assessments/${riskAssessmentBId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should delete own risk assessment for User A (200)", async () => {
      const res = await request(app)
        .delete(`/api/risk-assessments/${riskAssessmentAId}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/risk-assessments/${riskAssessmentAId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(checkRes.status).toBe(404);
    });
  });
});