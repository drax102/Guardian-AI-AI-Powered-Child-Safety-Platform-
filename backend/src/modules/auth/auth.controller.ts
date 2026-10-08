import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "./auth.validation";

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = signupSchema.parse(req.body);
      const result = await authService.signup(validated);
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);
      res.status(200).json({
        success: true,
        message: "Logged in successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = refreshSchema.parse(req.body);
      const result = await authService.refresh(validated.refreshToken);
      res.status(200).json({
        success: true,
        message: "Tokens refreshed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = logoutSchema.parse(req.body);
      const userId = req.user!.id;
      const result = await authService.logout(userId, validated.refreshToken);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await authService.getMe(userId);
      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();