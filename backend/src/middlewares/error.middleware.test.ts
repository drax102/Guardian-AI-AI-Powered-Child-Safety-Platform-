import { describe, it, expect } from "vitest";
import { errorHandler, AppError } from "./error.middleware";
import { Request, Response } from "express";

describe("Error Middleware - Production 500 Sanitization", () => {
  const createMockResponse = () => {
    const res: any = {};
    res.statusCode = 200;
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.body = data;
      return res;
    };
    return res;
  };

  it("should sanitize unexpected internal errors to 'Internal server error' in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const internalError = new Error("FATAL: connection to server at 'pg.internal' (10.0.0.4), port 5432 failed: FATAL: password authentication failed");
    const req = {} as Request;
    const res = createMockResponse();
    const next = () => {};

    errorHandler(internalError, req, res as Response, next);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Internal server error");
    expect(res.body.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("password");
    expect(JSON.stringify(res.body)).not.toContain("pg.internal");

    process.env.NODE_ENV = originalEnv;
  });

  it("should preserve client-safe AppError messages in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const appError = new AppError("Invalid credentials provided", 401);
    const req = {} as Request;
    const res = createMockResponse();
    const next = () => {};

    errorHandler(appError, req, res as Response, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid credentials provided");
    expect(res.body.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });
});
