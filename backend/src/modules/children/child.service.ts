import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { CreateChildInput, UpdateChildInput } from "./child.validation";

export class ChildService {
  async create(parentId: string, input: CreateChildInput) {
    return prisma.child.create({
      data: {
        name: input.name,
        age: input.age,
        avatarUrl: input.avatarUrl || null,
        parentId,
      },
      include: {
        devices: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSeen: true,
          },
        },
      },
    });
  }

  async findAllByParent(parentId: string) {
    return prisma.child.findMany({
      where: { parentId },
      orderBy: { createdAt: "desc" },
      include: {
        devices: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSeen: true,
          },
        },
      },
    });
  }

  async findById(id: string, parentId: string) {
    const child = await prisma.child.findFirst({
      where: { id, parentId },
      include: {
        devices: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSeen: true,
          },
        },
      },
    });

    if (!child) {
      throw new AppError("Child not found", 404);
    }

    return child;
  }

  async update(id: string, parentId: string, input: UpdateChildInput) {
    // Verify ownership first; throws 404 if not found
    await this.findById(id, parentId);

    const updateData: {
      name?: string;
      age?: number;
      avatarUrl?: string | null;
    } = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.age !== undefined) updateData.age = input.age;
    if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl || null;

    return prisma.child.update({
      where: { id },
      data: updateData,
      include: {
        devices: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSeen: true,
          },
        },
      },
    });
  }

  async delete(id: string, parentId: string) {
    // Verify ownership first; throws 404 if not found
    await this.findById(id, parentId);

    await prisma.child.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Child deleted successfully",
    };
  }
}

export const childService = new ChildService();