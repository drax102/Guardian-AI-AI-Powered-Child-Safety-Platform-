import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (process.env.NODE_ENV !== "test" && (!err.statusCode || err.statusCode >= 500) && !(err instanceof ZodError)) {
    console.error("Internal Server Error:", err);
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      success: false,
      message: "Malformed JSON payload in request body",
    });
    return;
  }

  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  let message = err.message || "Internal server error";

  // In production, sanitize unexpected 500-level errors to prevent leaking database, SQL, or internal details
  if (process.env.NODE_ENV === "production" && statusCode >= 500 && !(err instanceof AppError)) {
    message = "Internal server error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
