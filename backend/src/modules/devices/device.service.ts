import { DeviceStatus, DeviceType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { realtimeService } from "../../realtime/realtime.service";
import {
  CreateDeviceInput,
  UpdateDeviceInput,
} from "./device.validation";

export class DeviceService {
  async create(userId: string, input: CreateDeviceInput) {
    if (input.childId) {
      const child = await prisma.child.findFirst({
        where: { id: input.childId, parentId: userId },
      });
      if (!child) {
        throw new AppError("Child not found", 404);
      }
    }

    return prisma.device.create({
      data: {
        name: input.name,
        type: input.type,
        status: DeviceStatus.ONLINE,
        lastSeen: new Date(),
        userId,
        childId: input.childId || null,
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            age: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findAllByUser(userId: string) {
    return prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            age: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findById(id: string, userId: string) {
    const device = await prisma.device.findFirst({
      where: { id, userId },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            age: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!device) {
      throw new AppError("Device not found", 404);
    }

    return device;
  }

  async update(id: string, userId: string, input: UpdateDeviceInput) {
    // Verify device ownership first; throws 404 if not found
    await this.findById(id, userId);

    if (input.childId) {
      const child = await prisma.child.findFirst({
        where: { id: input.childId, parentId: userId },
      });
      if (!child) {
        throw new AppError("Child not found", 404);
      }
    }

    const updateData: {
      name?: string;
      type?: DeviceType;
      status?: DeviceStatus;
      lastSeen?: Date;
      childId?: string | null;
    } = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) {
      updateData.status = input.status;
      updateData.lastSeen = new Date();
    }
    if (input.childId !== undefined) {
      updateData.childId = input.childId || null;
    }

    const device = await prisma.device.update({
      where: { id },
      data: updateData,
      include: {
        child: {
          select: {
            id: true,
            name: true,
            age: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (Object.keys(updateData).length > 0) {
      realtimeService.emitToUser(userId, "device:updated", device);
    }

    return device;
  }

  async updateStatus(id: string, userId: string, status: DeviceStatus) {
    // Verify device ownership first; throws 404 if not found
    await this.findById(id, userId);

    const device = await prisma.device.update({
      where: { id },
      data: {
        status,
        lastSeen: new Date(),
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            age: true,
            avatarUrl: true,
          },
        },
      },
    });

    realtimeService.emitToUser(userId, "device:status_changed", device);

    return device;
  }

  async delete(id: string, userId: string) {
    // Verify device ownership first; throws 404 if not found
    await this.findById(id, userId);

    await prisma.device.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Device deleted successfully",
    };
  }
}

export const deviceService = new DeviceService();