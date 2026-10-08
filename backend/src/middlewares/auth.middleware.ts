import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authorization token required",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authorization token required",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;

    if (!decoded || decoded.type !== "access" || !decoded.sub) {
      res.status(401).json({
        success: false,
        message: "Invalid token type or payload",
      });
      return;
    }

    req.user = {
      id: decoded.sub as string,
      email: decoded.email as string,
      role: decoded.role as string,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Access token has expired",
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: "Invalid or malformed access token",
    });
  }
};
