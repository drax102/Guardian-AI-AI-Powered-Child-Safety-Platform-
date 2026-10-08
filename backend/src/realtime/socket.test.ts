import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../app";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { realtimeService } from "./realtime.service";

describe("Socket.IO Realtime Integration Tests", () => {
  let testHttpServer: http.Server;
  let socketUrl: string;

  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let childAId: string;
  let childBId: string;
  let deviceAId: string;
  let deviceBId: string;

  beforeAll(async () => {
    // 1. Setup ephemeral test HTTP server with Socket.IO attached
    testHttpServer = http.createServer(app);
    realtimeService.initialize(testHttpServer);

    await new Promise<void>((resolve) => {
      testHttpServer.listen(0, () => {
        const port = (testHttpServer.address() as AddressInfo).port;
        socketUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 2. Clean up test users
    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } },
    });

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create User A
    const dbUserA = await prisma.user.create({
      data: { name: "Socket User A", email: "socket_test_a@example.com", passwordHash },
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

    const deviceA = await prisma.device.create({
      data: { name: "Phone A", type: "SMARTPHONE", userId: userA.id, childId: childAId },
    });
    deviceAId = deviceA.id;

    // Create User B
    const dbUserB = await prisma.user.create({
      data: { name: "Socket User B", email: "socket_test_b@example.com", passwordHash },
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

    const deviceB = await prisma.device.create({
      data: { name: "Phone B", type: "SMARTPHONE", userId: userB.id, childId: childBId },
    });
    deviceBId = deviceB.id;
  });

  afterAll(async () => {
    await realtimeService.close();
    await new Promise<void>((resolve) => {
      testHttpServer.close(() => resolve());
    });

    await prisma.alert.deleteMany({
      where: { user: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.device.deleteMany({
      where: { user: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.child.deleteMany({
      where: { parent: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["socket_test_a@example.com", "socket_test_b@example.com"] } },
    });
    await prisma.$disconnect();
  });

  function connectClient(token?: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ioClient(socketUrl, {
        auth: token !== undefined ? { token } : undefined,
        transports: ["websocket"],
        reconnection: false,
        timeout: 3000,
      });

      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (err) => reject(err));
    });
  }

  describe("Socket Authentication Security", () => {
    it("1. Missing JWT -> connection rejected", async () => {
      await expect(connectClient()).rejects.toThrow(
        "Authentication error: Token required"
      );
    });

    it("2. Invalid signature JWT -> connection rejected", async () => {
      const invalidToken = jwt.sign(
        { sub: userA.id, email: userA.email, type: "access" },
        "wrong_secret_key_12345"
      );
      await expect(connectClient(invalidToken)).rejects.toThrow(
        "Authentication error: Invalid or expired token"
      );
    });

    it("3. Expired JWT -> connection rejected", async () => {
      const expiredToken = jwt.sign(
        { sub: userA.id, email: userA.email, type: "access" },
        env.JWT_ACCESS_SECRET,
        { expiresIn: "-10s" }
      );
      await expect(connectClient(expiredToken)).rejects.toThrow(
        "Authentication error: Invalid or expired token"
      );
    });

    it("4. Wrong JWT type (refresh token passed) -> connection rejected", async () => {
      const refreshToken = jwt.sign(
        { sub: userA.id, type: "refresh" },
        env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );
      await expect(connectClient(refreshToken)).rejects.toThrow(
        "Authentication error: Invalid or expired token"
      );
    });

    it("5. Valid access JWT -> connection accepted", async () => {
      const socket = await connectClient(userA.token);
      expect(socket.connected).toBe(true);
      socket.disconnect();
    });
  });

  describe("Socket User Rooms & Tenant Isolation", () => {
    let clientA: ClientSocket;
    let clientB: ClientSocket;

    beforeAll(async () => {
      clientA = await connectClient(userA.token);
      clientB = await connectClient(userB.token);
    });

    afterAll(() => {
      if (clientA?.connected) clientA.disconnect();
      if (clientB?.connected) clientB.disconnect();
    });

    it("6. Authenticated socket joins only its own user room", () => {
      const io = realtimeService.getIO()!;
      const roomA = io.sockets.adapter.rooms.get(`user:${userA.id}`);
      const roomB = io.sockets.adapter.rooms.get(`user:${userB.id}`);

      expect(roomA).toBeDefined();
      expect(roomB).toBeDefined();

      // Client A's socket ID is in roomA, but NOT in roomB
      expect(roomA?.has(clientA.id!)).toBe(true);
      expect(roomB?.has(clientA.id!)).toBe(false);

      // Client B's socket ID is in roomB, but NOT in roomA
      expect(roomB?.has(clientB.id!)).toBe(true);
      expect(roomA?.has(clientB.id!)).toBe(false);
    });

    it("7. User A creates alert -> User A receives alert:created, User B receives nothing", async () => {
      let userBReceivedAlert = false;
      const bListener = () => {
        userBReceivedAlert = true;
      };
      clientB.on("alert:created", bListener);

      const alertPromiseA = new Promise<any>((resolve) => {
        clientA.once("alert:created", resolve);
      });

      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          type: "ONLINE_PREDATION",
          severity: "CRITICAL",
          message: "User A realtime alert test",
          childId: childAId,
          deviceId: deviceAId,
        });

      expect(res.status).toBe(201);

      const receivedAlertA = await alertPromiseA;
      expect(receivedAlertA).toBeDefined();
      expect(receivedAlertA.id).toBe(res.body.data.alert.id);
      expect(receivedAlertA.message).toBe("User A realtime alert test");

      // Give a moment to confirm User B received nothing
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(userBReceivedAlert).toBe(false);

      clientB.off("alert:created", bListener);
    });

    it("8. User B creates alert -> User B receives alert:created, User A receives nothing", async () => {
      let userAReceivedAlert = false;
      const aListener = () => {
        userAReceivedAlert = true;
      };
      clientA.on("alert:created", aListener);

      const alertPromiseB = new Promise<any>((resolve) => {
        clientB.once("alert:created", resolve);
      });

      const res = await request(app)
        .post("/api/alerts")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          type: "CYBERBULLYING",
          severity: "HIGH",
          message: "User B realtime alert test",
          childId: childBId,
          deviceId: deviceBId,
        });

      expect(res.status).toBe(201);

      const receivedAlertB = await alertPromiseB;
      expect(receivedAlertB).toBeDefined();
      expect(receivedAlertB.id).toBe(res.body.data.alert.id);
      expect(receivedAlertB.message).toBe("User B realtime alert test");

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(userAReceivedAlert).toBe(false);

      clientA.off("alert:created", aListener);
    });

    it("9. User A updates alert status -> User A receives alert:updated, User B receives nothing", async () => {
      // First get an alert belonging to User A
      const alertsRes = await request(app)
        .get("/api/alerts")
        .set("Authorization", `Bearer ${userA.token}`);
      const alertId = alertsRes.body.data.alerts[0].id;

      let userBReceivedUpdate = false;
      const bListener = () => {
        userBReceivedUpdate = true;
      };
      clientB.on("alert:updated", bListener);

      const updatePromiseA = new Promise<any>((resolve) => {
        clientA.once("alert:updated", resolve);
      });

      const res = await request(app)
        .patch(`/api/alerts/${alertId}/status`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ status: "REVIEWED" });

      expect(res.status).toBe(200);

      const updatedAlertA = await updatePromiseA;
      expect(updatedAlertA.id).toBe(alertId);
      expect(updatedAlertA.status).toBe("REVIEWED");

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(userBReceivedUpdate).toBe(false);

      clientB.off("alert:updated", bListener);
    });

    it("10. User A changes device status -> User A receives device:status_changed, User B receives nothing", async () => {
      let userBReceivedDeviceStatus = false;
      const bListener = () => {
        userBReceivedDeviceStatus = true;
      };
      clientB.on("device:status_changed", bListener);

      const statusPromiseA = new Promise<any>((resolve) => {
        clientA.once("device:status_changed", resolve);
      });

      const res = await request(app)
        .patch(`/api/devices/${deviceAId}/status`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ status: "SUSPENDED" });

      expect(res.status).toBe(200);

      const updatedDeviceA = await statusPromiseA;
      expect(updatedDeviceA.id).toBe(deviceAId);
      expect(updatedDeviceA.status).toBe("SUSPENDED");

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(userBReceivedDeviceStatus).toBe(false);

      clientB.off("device:status_changed", bListener);
    });

    it("11. User A updates device details -> User A receives device:updated, User B receives nothing", async () => {
      let userBReceivedDeviceUpdate = false;
      const bListener = () => {
        userBReceivedDeviceUpdate = true;
      };
      clientB.on("device:updated", bListener);

      const updatePromiseA = new Promise<any>((resolve) => {
        clientA.once("device:updated", resolve);
      });

      const res = await request(app)
        .patch(`/api/devices/${deviceAId}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ name: "Phone A Realtime Pro" });

      expect(res.status).toBe(200);

      const updatedDeviceA = await updatePromiseA;
      expect(updatedDeviceA.id).toBe(deviceAId);
      expect(updatedDeviceA.name).toBe("Phone A Realtime Pro");

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(userBReceivedDeviceUpdate).toBe(false);

      clientB.off("device:updated", bListener);
    });
  });
});