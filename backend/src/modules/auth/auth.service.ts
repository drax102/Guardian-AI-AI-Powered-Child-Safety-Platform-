import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { SignupInput, LoginInput } from "./auth.validation";

export class AuthService {
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async signup(input: SignupInput) {
    const email = input.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const error: any = new Error("Email is already registered");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: "access",
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: crypto.randomUUID(),
        type: "refresh",
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput) {
    const email = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const error: any = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);

    if (!isMatch) {
      const error: any = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: "access",
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: crypto.randomUUID(),
        type: "refresh",
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err: any) {
      const error: any = new Error(
        err.name === "TokenExpiredError"
          ? "Refresh token has expired"
          : "Invalid refresh token"
      );
      error.statusCode = 401;
      throw error;
    }

    if (!decoded || decoded.type !== "refresh" || !decoded.sub) {
      const error: any = new Error("Invalid refresh token payload");
      error.statusCode = 401;
      throw error;
    }

    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      const error: any = new Error("Invalid refresh token");
      error.statusCode = 401;
      throw error;
    }

    if (storedToken.revokedAt !== null) {
      // Refresh token replay detected: revoke entire refresh token family/active sessions for this user
      await prisma.refreshToken.updateMany({
        where: {
          userId: storedToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      const error: any = new Error(
        "Revoked refresh token presented. Token replay detected; all active sessions revoked."
      );
      error.statusCode = 401;
      throw error;
    }

    if (storedToken.expiresAt < new Date()) {
      const error: any = new Error("Refresh token has expired");
      error.statusCode = 401;
      throw error;
    }

    // Atomic transaction: rotate the token and protect against concurrent race conditions
    const newTokens = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Concurrent race or already rotated by another parallel request!
        // Revoke active sessions for this user to mitigate compromise
        await tx.refreshToken.updateMany({
          where: {
            userId: storedToken.userId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        const error: any = new Error(
          "Concurrent refresh request detected or token already rotated."
        );
        error.statusCode = 401;
        throw error;
      }

      const newAccessToken = jwt.sign(
        {
          sub: storedToken.user.id,
          email: storedToken.user.email,
          role: storedToken.user.role,
          type: "access",
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
      );

      const newRefreshToken = jwt.sign(
        {
          sub: storedToken.user.id,
          jti: crypto.randomUUID(),
          type: "refresh",
        },
        env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      const newTokenHash = this.hashToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tx.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: storedToken.user.id,
          expiresAt: newExpiresAt,
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    });

    return newTokens;
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && storedToken.userId === userId && !storedToken.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }

    return {
      success: true,
      message: "Logged out successfully",
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      const error: any = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return user;
  }
}

export const authService = new AuthService();
