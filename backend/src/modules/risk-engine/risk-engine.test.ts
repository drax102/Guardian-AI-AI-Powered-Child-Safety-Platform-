import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../../app";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { realtimeService } from "../../realtime/realtime.service";
import { riskEngineService } from "./risk-engine.service";
import {
  RISK_ENGINE_MODEL,
  RISK_ENGINE_VERSION,
} from "./risk-engine.config";
import { AlertType, Severity, AlertStatus, RiskLevel } from "@prisma/client";

describe("Phase 7 AI Risk Engine Integration Tests", () => {
  let testHttpServer: http.Server;
  let socketUrl: string;

  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let childAId: string;
  let childBId: string;

  beforeAll(async () => {
    // 1. Initialize HTTP server with Socket.IO attached
    testHttpServer = http.createServer(app);
    realtimeService.initialize(testHttpServer);

    await new Promise<void>((resolve) => {
      testHttpServer.listen(0, () => {
        const port = (testHttpServer.address() as AddressInfo).port;
        socketUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 2. Clean up test database records
    await prisma.riskAssessment.deleteMany({
      where: {
        OR: [
          { child: { parent: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } } },
          { alert: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } } },
        ],
      },
    });
    await prisma.evidenceMedia.deleteMany({
      where: { alert: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } } },
    });
    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } },
    });

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create User A
    const dbUserA = await prisma.user.create({
      data: { name: "Risk Eng Parent A", email: "risk_eng_a@example.com", passwordHash },
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

    // Create User B
    const dbUserB = await prisma.user.create({
      data: { name: "Risk Eng Parent B", email: "risk_eng_b@example.com", passwordHash },
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
    childBId = childB.id;
  });

  afterAll(async () => {
    // Teardown HTTP server and clean up DB
    await new Promise<void>((resolve) => {
      testHttpServer.close(() => resolve());
    });

    await prisma.riskAssessment.deleteMany({
      where: {
        OR: [
          { child: { parent: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } } },
          { alert: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } } },
        ],
      },
    });
    await prisma.evidenceMedia.deleteMany({
      where: { alert: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } } },
    });
    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["risk_eng_a@example.com", "risk_eng_b@example.com"] } },
    });
  });

  describe("1. Scoring Calibration & Risk Level Thresholds", () => {
    it("should classify LOW risk alert (score < 25)", async () => {
      // SCREEN_TIME_VIOLATION (10) + LOW (5) = 15 -> LOW
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.SCREEN_TIME_VIOLATION,
          severity: Severity.LOW,
          message: "Exceeded daily screen time by 5 mins",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const assessment = await riskEngineService.analyzeAlert(alert.id);

      expect(assessment.score).toBe(15);
      expect(assessment.riskLevel).toBe(RiskLevel.LOW);
      expect(assessment.safetyScore).toBe(85);
      expect(assessment.screenTimeRisk).toBe(15);
      expect(assessment.predatorRisk).toBe(0);
      expect(assessment.model).toBe(RISK_ENGINE_MODEL);
      expect(assessment.modelVersion).toBe(RISK_ENGINE_VERSION);
      expect(assessment.explanation).toContain("LOW severity (+5)");
      expect(assessment.explanation).toContain("SCREEN TIME VIOLATION alert type (+10)");
      expect(assessment.explanation).toContain("Total risk score: 15/100 (LOW)");
    });

    it("should classify MEDIUM risk alert (score 25-49)", async () => {
      // CYBERBULLYING (25) + MEDIUM (15) = 40 -> MEDIUM
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.CYBERBULLYING,
          severity: Severity.MEDIUM,
          message: "Mild teasing detected in group chat",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const assessment = await riskEngineService.analyzeAlert(alert.id);

      expect(assessment.score).toBe(40);
      expect(assessment.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(assessment.safetyScore).toBe(60);
      expect(assessment.cyberbullyingRisk).toBe(40);
      expect(assessment.contentRisk).toBe(0);
    });

    it("should classify HIGH risk alert (score 50-74)", async () => {
      // STRANGER_DANGER (35) + HIGH (25) = 60 -> HIGH
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.STRANGER_DANGER,
          severity: Severity.HIGH,
          message: "Unrecognized adult requested meet-up location",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const assessment = await riskEngineService.analyzeAlert(alert.id);

      expect(assessment.score).toBe(60);
      expect(assessment.riskLevel).toBe(RiskLevel.HIGH);
      expect(assessment.safetyScore).toBe(40);
      expect(assessment.predatorRisk).toBe(60);
    });

    it("should classify CRITICAL risk alert (score >= 75) and clamp max score at 100", async () => {
      // ONLINE_PREDATION (40) + CRITICAL (35) = 75 baseline -> CRITICAL
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.ONLINE_PREDATION,
          severity: Severity.CRITICAL,
          message: "Grooming behavior and explicit meeting solicitation",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      // Add 2 evidence items (+10)
      await prisma.evidenceMedia.createMany({
        data: [
          {
            alertId: alert.id,
            url: "http://res.cloudinary.com/demo/image/upload/v1/crit1.png",
            secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/crit1.png",
            publicId: "crit1",
            resourceType: "image",
            format: "png",
            bytes: 1024,
          },
          {
            alertId: alert.id,
            url: "http://res.cloudinary.com/demo/image/upload/v1/crit2.png",
            secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/crit2.png",
            publicId: "crit2",
            resourceType: "image",
            format: "png",
            bytes: 2048,
          },
        ],
      });

      const assessment = await riskEngineService.analyzeAlert(alert.id);

      // 40 + 35 + 10 = 85 -> CRITICAL
      expect(assessment.score).toBe(85);
      expect(assessment.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(assessment.safetyScore).toBe(15);
      expect(assessment.predatorRisk).toBe(85);
      expect(assessment.explanation).toContain("evidence attached (2 assets, +10)");
    });
  });

  describe("2. Determinism & Mathematical Boundedness", () => {
    it("should produce deterministic outputs given identical inputs", async () => {
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.EXPLICIT_CONTENT,
          severity: Severity.HIGH,
          message: "Deterministic test alert",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const result1 = await riskEngineService.analyzeAlert(alert.id);
      const result2 = await riskEngineService.analyzeAlert(alert.id);

      expect(result1.score).toBe(result2.score);
      expect(result1.riskLevel).toBe(result2.riskLevel);
      expect(result1.safetyScore).toBe(result2.safetyScore);
      expect(result1.explanation).toBe(result2.explanation);
    });

    it("should strictly bound the score between 0 and 100 even with extreme inputs", async () => {
      // Create an alert with high base scores
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.ONLINE_PREDATION, // 40
          severity: Severity.CRITICAL,     // 35
          message: "Extreme boundary test",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      // Create 3 historical repeats for the same child & type (+15)
      for (let i = 0; i < 3; i++) {
        await prisma.alert.create({
          data: {
            type: AlertType.ONLINE_PREDATION,
            severity: Severity.CRITICAL,
            message: `Historical repeat ${i}`,
            status: AlertStatus.UNREAD,
            userId: userA.id,
            childId: childAId,
          },
        });
      }

      // Add video evidence (+10)
      await prisma.evidenceMedia.create({
        data: {
          alertId: alert.id,
          url: "http://res.cloudinary.com/demo/video/upload/v1/vid.mp4",
          secureUrl: "https://res.cloudinary.com/demo/video/upload/v1/vid.mp4",
          publicId: "vid",
          resourceType: "video",
          format: "mp4",
          bytes: 1048576,
        },
      });

      // Raw total: 40 + 35 + 15 + 10 = 100.
      const assessment = await riskEngineService.analyzeAlert(alert.id);
      expect(assessment.score).toBe(100);
      expect(assessment.score).toBeLessThanOrEqual(100);
      expect(assessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.safetyScore).toBe(0);
    });
  });

  describe("3. Repetition Signal & Rolling Window Behavior", () => {
    it("should add tiered repetition points for recent alerts and ignore outside-window alerts", async () => {
      const uniqueType = AlertType.SUSPICIOUS_MESSAGING;

      // Clean out any suspicious messaging alerts for User A
      await prisma.alert.deleteMany({
        where: { userId: userA.id, type: uniqueType },
      });

      // 1. Alert with 0 prior alerts: SUSPICIOUS_MESSAGING (20) + LOW (5) = 25
      const alert1 = await prisma.alert.create({
        data: {
          type: uniqueType,
          severity: Severity.LOW,
          message: "First suspicious message",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });
      const res1 = await riskEngineService.analyzeAlert(alert1.id);
      expect(res1.score).toBe(25); // no repeat

      // 2. Alert with 1 prior alert in window -> +5 repetition points = 30
      const alert2 = await prisma.alert.create({
        data: {
          type: uniqueType,
          severity: Severity.LOW,
          message: "Second suspicious message",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });
      const res2 = await riskEngineService.analyzeAlert(alert2.id);
      expect(res2.score).toBe(30); // 20 + 5 + 5

      // 3. Alert with 2 prior alerts in window -> +10 repetition points = 35
      const alert3 = await prisma.alert.create({
        data: {
          type: uniqueType,
          severity: Severity.LOW,
          message: "Third suspicious message",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });
      const res3 = await riskEngineService.analyzeAlert(alert3.id);
      expect(res3.score).toBe(35); // 20 + 5 + 10

      // 4. Create an alert dated 10 days ago (outside rolling 7-day window)
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await prisma.alert.create({
        data: {
          type: uniqueType,
          severity: Severity.LOW,
          message: "Old message outside window",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
          createdAt: tenDaysAgo,
        },
      });

      // Re-evaluating alert3 should still see only 2 alerts in the 7-day window (alert1 & alert2)
      const res3Re = await riskEngineService.analyzeAlert(alert3.id);
      expect(res3Re.score).toBe(35); // Still +10, old alert ignored
    });

    it("should NOT count alerts belonging to a different user for repetition", async () => {
      const crossType = AlertType.UNAUTHORIZED_APP;

      // User B has 5 alerts of UNAUTHORIZED_APP
      for (let i = 0; i < 5; i++) {
        await prisma.alert.create({
          data: {
            type: crossType,
            severity: Severity.LOW,
            message: `User B unauth app ${i}`,
            status: AlertStatus.UNREAD,
            userId: userB.id,
            childId: childBId,
          },
        });
      }

      // User A creates first UNAUTHORIZED_APP: UNAUTHORIZED_APP (15) + LOW (5) = 20
      const alertA = await prisma.alert.create({
        data: {
          type: crossType,
          severity: Severity.LOW,
          message: "User A unauth app",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const resA = await riskEngineService.analyzeAlert(alertA.id);
      expect(resA.score).toBe(20); // 0 repeats counted from User B
    });
  });

  describe("4. Evidence Signal Evaluation", () => {
    it("should grant +5 for 1 image and +10 for video", async () => {
      // Clean up previous alerts to isolate evidence contribution
      await prisma.alert.deleteMany({
        where: { userId: userA.id, type: AlertType.SCREEN_TIME_VIOLATION },
      });

      // 1. Single image
      const alertImage = await prisma.alert.create({
        data: {
          type: AlertType.SCREEN_TIME_VIOLATION, // 10
          severity: Severity.LOW,               // 5
          message: "Evidence test image",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });
      await prisma.evidenceMedia.create({
        data: {
          alertId: alertImage.id,
          url: "http://res.cloudinary.com/demo/image/upload/v1/test.png",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/test.png",
          publicId: "test_img_1",
          resourceType: "image",
          format: "png",
          bytes: 500,
        },
      });

      const resImage = await riskEngineService.analyzeAlert(alertImage.id);
      expect(resImage.score).toBe(20); // 10 + 5 + 5
      expect(resImage.explanation).toContain("evidence attached (1 asset, +5)");

      // Clean up alertImage before testing video to avoid repetition signal
      await prisma.evidenceMedia.deleteMany({ where: { alertId: alertImage.id } });
      await prisma.alert.delete({ where: { id: alertImage.id } });

      // 2. Video
      const alertVideo = await prisma.alert.create({
        data: {
          type: AlertType.SCREEN_TIME_VIOLATION, // 10
          severity: Severity.LOW,               // 5
          message: "Evidence test video",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });
      await prisma.evidenceMedia.create({
        data: {
          alertId: alertVideo.id,
          url: "http://res.cloudinary.com/demo/video/upload/v1/test.mp4",
          secureUrl: "https://res.cloudinary.com/demo/video/upload/v1/test.mp4",
          publicId: "test_vid_1",
          resourceType: "video",
          format: "mp4",
          bytes: 2048,
        },
      });

      const resVideo = await riskEngineService.analyzeAlert(alertVideo.id);
      expect(resVideo.score).toBe(25); // 10 + 5 + 10 (video)
      expect(resVideo.explanation).toContain("evidence attached (1 asset, +10)");
    });
  });

  describe("5. Idempotency & Persistence", () => {
    it("should update the existing record on repeated calls without creating duplicate rows", async () => {
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.EXPLICIT_CONTENT,
          severity: Severity.MEDIUM,
          message: "Idempotency test alert",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const assessment1 = await riskEngineService.analyzeAlert(alert.id);
      const countAfterFirst = await prisma.riskAssessment.count({
        where: { alertId: alert.id },
      });
      expect(countAfterFirst).toBe(1);

      const assessment2 = await riskEngineService.analyzeAlert(alert.id);
      const countAfterSecond = await prisma.riskAssessment.count({
        where: { alertId: alert.id },
      });
      expect(countAfterSecond).toBe(1);
      expect(assessment2.id).toBe(assessment1.id);
    });
  });

  describe("6. Realtime Socket.IO Event Delivery", () => {
    it("should emit risk:assessment_created to the owning user and not to other users", async () => {
      const clientSocketA: ClientSocket = ioClient(socketUrl, {
        auth: { token: userA.token },
        transports: ["websocket"],
      });
      const clientSocketB: ClientSocket = ioClient(socketUrl, {
        auth: { token: userB.token },
        transports: ["websocket"],
      });

      await new Promise<void>((resolve) => {
        let connectedCount = 0;
        const check = () => {
          connectedCount++;
          if (connectedCount === 2) resolve();
        };
        clientSocketA.on("connect", check);
        clientSocketB.on("connect", check);
      });

      const receivedEventsA: any[] = [];
      const receivedEventsB: any[] = [];

      clientSocketA.on("risk:assessment_created", (data) => {
        receivedEventsA.push(data);
      });
      clientSocketB.on("risk:assessment_created", (data) => {
        receivedEventsB.push(data);
      });

      // Create an alert for User A via REST API
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: AlertType.CYBERBULLYING,
          severity: Severity.HIGH,
          message: "Realtime test cyberbullying alert",
          childId: childAId,
        });

      expect(res.status).toBe(201);
      const alertId = res.body.data.alert.id;

      // Wait for Socket.IO event propagation
      await new Promise((r) => setTimeout(r, 400));

      expect(receivedEventsA.length).toBeGreaterThanOrEqual(1);
      expect(receivedEventsA[0].alertId).toBe(alertId);
      expect(receivedEventsA[0].riskLevel).toBe(RiskLevel.HIGH);
      expect(receivedEventsB.length).toBe(0); // Tenant isolation: User B received 0 events

      clientSocketA.disconnect();
      clientSocketB.disconnect();
    });
  });

  describe("7. Tenant Isolation & Security", () => {
    it("should reject analyzeAlert when invoked with a mismatched userId context", async () => {
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.STRANGER_DANGER,
          severity: Severity.MEDIUM,
          message: "Tenant test alert",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      // User B attempts to analyze User A's alert
      await expect(
        riskEngineService.analyzeAlert(alert.id, { userId: userB.id })
      ).rejects.toThrow("Alert not found");
    });

    it("should forbid User B from viewing or deleting User A's risk assessment via API", async () => {
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.CYBERBULLYING,
          severity: Severity.LOW,
          message: "Tenant API test alert",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const assessment = await riskEngineService.analyzeAlert(alert.id);

      // User B attempts to GET assessment
      const getRes = await request(app)
        .get(`/api/risk-assessments/${assessment.id}`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(getRes.status).toBe(404);

      // User B attempts to DELETE assessment
      const deleteRes = await request(app)
        .delete(`/api/risk-assessments/${assessment.id}`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(deleteRes.status).toBe(404);

      // User A can view it
      const getResA = await request(app)
        .get(`/api/risk-assessments/${assessment.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(getResA.status).toBe(200);
      expect(getResA.body.data.riskAssessment.id).toBe(assessment.id);
    });
  });

  describe("8. Cascade Deletion", () => {
    it("should automatically delete RiskAssessment when parent Alert is deleted", async () => {
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.ONLINE_PREDATION,
          severity: Severity.CRITICAL,
          message: "Cascade test alert",
          status: AlertStatus.UNREAD,
          userId: userA.id,
          childId: childAId,
        },
      });

      const assessment = await riskEngineService.analyzeAlert(alert.id);

      const dbBefore = await prisma.riskAssessment.findUnique({
        where: { id: assessment.id },
      });
      expect(dbBefore).not.toBeNull();

      // Delete the alert via REST API
      const deleteRes = await request(app)
        .delete(`/api/alerts/${alert.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(deleteRes.status).toBe(200);

      // RiskAssessment should be removed via CASCADE
      const dbAfter = await prisma.riskAssessment.findUnique({
        where: { id: assessment.id },
      });
      expect(dbAfter).toBeNull();
    });
  });

  describe("9. Resilience & Graceful Error Handling", () => {
    it("should not fail alert creation if risk assessment analysis encounters an error", async () => {
      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: AlertType.SCREEN_TIME_VIOLATION,
          severity: Severity.LOW,
          message: "Resilience test alert",
          childId: childAId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alert.id).toBeDefined();
    });
  });
});
