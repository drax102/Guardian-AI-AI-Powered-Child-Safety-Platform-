import { AlertStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { realtimeService } from "../../realtime/realtime.service";
import { CreateAlertInput, ListAlertsQuery } from "./alert.validation";
import { evidenceService } from "../evidence/evidence.service";
import { riskEngineService } from "../risk-engine/risk-engine.service";

export class AlertService {
  async create(userId: string, input: CreateAlertInput) {
    let verifiedChildId: string | null = null;
    let verifiedDeviceId: string | null = null;

    // 1. If childId is provided, verify child belongs to authenticated user
    if (input.childId) {
      const child = await prisma.child.findFirst({
        where: { id: input.childId, parentId: userId },
      });
      if (!child) {
        throw new AppError("Child not found", 404);
      }
      verifiedChildId = child.id;
    }

    // 2. If deviceId is provided, verify device belongs to authenticated user
    if (input.deviceId) {
      const device = await prisma.device.findFirst({
        where: { id: input.deviceId, userId },
      });
      if (!device) {
        throw new AppError("Device not found", 404);
      }
      verifiedDeviceId = device.id;

      // 3. Child/Device Consistency check:
      // If both childId and deviceId are provided:
      // If device is assigned to a child, require device.childId === input.childId.
      // If device is unassigned (childId === null), allow explicit child association
      // since unassigned/shared hardware may be operated by any child during an incident.
      if (verifiedChildId && device.childId !== null && device.childId !== verifiedChildId) {
        throw new AppError(
          "Device is currently assigned to a different child",
          400
        );
      }
    }

    const alert = await prisma.alert.create({
      data: {
        type: input.type,
        severity: input.severity,
        message: input.message,
        status: AlertStatus.UNREAD,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        userId,
        childId: verifiedChildId,
        deviceId: verifiedDeviceId,
      },
      include: {
        child: {
          select: { id: true, name: true },
        },
        device: {
          select: { id: true, name: true, type: true },
        },
        evidence: true,
      },
    });

    // Realtime notification to owning parent's room
    realtimeService.emitToUser(userId, "alert:created", alert);

    // Trigger AI Risk Engine analysis gracefully (does not break alert creation on error)
    try {
      await riskEngineService.analyzeAlert(alert.id, { userId });
    } catch (riskErr) {
      console.error(
        `[RISK ENGINE TRIGGER ERROR] Failed analyzing alert ${alert.id}:`,
        riskErr
      );
    }

    return alert;
  }

  async findAll(userId: string, query: ListAlertsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AlertWhereInput = { userId };
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.type) where.type = query.type;
    if (query.childId) where.childId = query.childId;
    if (query.deviceId) where.deviceId = query.deviceId;

    const [total, alerts] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          child: {
            select: { id: true, name: true },
          },
          device: {
            select: { id: true, name: true, type: true },
          },
          evidence: true,
        },
      }),
    ]);

    return {
      alerts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string, userId: string) {
    const alert = await prisma.alert.findFirst({
      where: { id, userId },
      include: {
        child: {
          select: { id: true, name: true, age: true, avatarUrl: true },
        },
        device: {
          select: { id: true, name: true, type: true, status: true },
        },
        evidence: true,
      },
    });

    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    return alert;
  }

  async updateStatus(id: string, userId: string, status: AlertStatus) {
    // Verify ownership first; throws 404 if not found
    await this.findById(id, userId);

    const alert = await prisma.alert.update({
      where: { id },
      data: { status },
      include: {
        child: {
          select: { id: true, name: true },
        },
        device: {
          select: { id: true, name: true, type: true },
        },
        evidence: true,
      },
    });

    // Realtime notification to owning parent's room
    realtimeService.emitToUser(userId, "alert:updated", alert);

    return alert;
  }

  async delete(id: string, userId: string) {
    // 1. Verify ownership and load associated evidence metadata
    const alert = await prisma.alert.findFirst({
      where: { id, userId },
      include: { evidence: true },
    });

    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    // 2. Clean up associated Cloudinary assets before database deletion
    if (alert.evidence && alert.evidence.length > 0) {
      const cleanupResults = await Promise.allSettled(
        alert.evidence.map((item) =>
          evidenceService.destroyCloudinaryAsset(item.publicId, item.resourceType)
        )
      );

      // Track any partial failures for operational logging and asynchronous reconciliation
      const failedCleanups = cleanupResults
        .map((res, index) => ({ res, item: alert.evidence[index] }))
        .filter(({ res }) => res.status === "rejected");

      if (failedCleanups.length > 0) {
        console.warn(
          `[ALERT CLEANUP WARNING] Alert ${id} deleted with ${failedCleanups.length} uncleaned Cloudinary asset(s) requiring reconciliation:`,
          failedCleanups.map(({ item }) => ({
            publicId: item.publicId,
            resourceType: item.resourceType,
          }))
        );
      }
    }

    // 3. Delete Alert record (PostgreSQL cascades and removes DB evidence rows)
    await prisma.alert.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Alert deleted successfully",
    };
  }
}

export const alertService = new AlertService();