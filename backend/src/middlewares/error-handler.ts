import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { MulterError } from "multer";
import { HttpError, isHttpError } from "@/lib/http-error";
import { formatZodError, toApiErrorBody } from "@/lib/route-errors";

type MongoErr = Error & { code?: number; keyPattern?: Record<string, unknown> };

function isMongoDuplicateKey(err: unknown): err is MongoErr {
  return typeof err === "object" && err !== null && (err as MongoErr).code === 11000;
}

function duplicateKeyMessage(err: MongoErr): { message: string; field?: string } {
  const keys = err.keyPattern ? Object.keys(err.keyPattern) : [];
  if (keys.includes("email")) {
    return {
      message: "This email is already registered. Use a different email or sign in to the existing account.",
      field: "email",
    };
  }
  if (keys.includes("employeeId")) {
    return {
      message: "This employee ID is already in use.",
      field: "employeeId",
    };
  }
  if (keys.includes("id")) {
    return { message: "A record with this identifier already exists." };
  }
  return { message: "This value is already in use. Please change it and try again." };
}

function isCastError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "CastError";
}

function normalizeLegacyStatus(err: Error): number | undefined {
  const legacy = err as Error & { status?: number; statusCode?: number };
  if (typeof legacy.statusCode === "number") return legacy.statusCode;
  if (typeof legacy.status === "number") return legacy.status;
  return undefined;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `The API route ${req.method} ${req.path} does not exist.`,
    code: "NOT_FOUND",
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    req.log.error({ err }, "Error after response started");
    return;
  }

  if (isHttpError(err)) {
    if (err.statusCode >= 500) {
      req.log.error({ err, code: err.code }, err.message);
    } else {
      req.log.warn({ err: { code: err.code, field: err.field } }, err.message);
    }
    res.status(err.statusCode).json(toApiErrorBody(err));
    return;
  }

  if (err instanceof ZodError) {
    const { message, details } = formatZodError(err);
    const field = Object.keys(details)[0];
    req.log.warn({ details }, "Validation failed");
    res.status(422).json({
      error: message,
      code: "VALIDATION_ERROR",
      ...(field && field !== "_root" ? { field } : {}),
      details,
    });
    return;
  }

  const multer = err as MulterError;
  if (multer && typeof multer === "object" && multer.name === "MulterError") {
    const map: Record<string, { status: number; message: string }> = {
      LIMIT_FILE_SIZE: {
        status: 413,
        message: "File is too large. Maximum upload size is 50 MB.",
      },
      LIMIT_FILE_COUNT: {
        status: 400,
        message: "Too many files. Upload one file at a time.",
      },
      LIMIT_UNEXPECTED_FILE: {
        status: 400,
        message: 'Upload failed. Use the form field name "file".',
      },
    };
    const mapped = map[multer.code] ?? {
      status: 400,
      message: "File upload failed. Check the file and try again.",
    };
    res.status(mapped.status).json({ error: mapped.message, code: "UPLOAD_ERROR" });
    return;
  }

  if (isMongoDuplicateKey(err)) {
    const { message, field } = duplicateKeyMessage(err);
    res.status(409).json({
      error: message,
      code: "CONFLICT",
      ...(field ? { field } : {}),
    });
    return;
  }

  if (isCastError(err)) {
    res.status(400).json({
      error: "Invalid ID or data format in your request.",
      code: "BAD_REQUEST",
    });
    return;
  }

  const legacyStatus = err instanceof Error ? normalizeLegacyStatus(err) : undefined;
  if (legacyStatus && legacyStatus >= 400 && legacyStatus < 600 && err instanceof Error) {
    req.log.warn({ err }, err.message);
    res.status(legacyStatus).json({
      error: err.message,
      code: legacyStatus === 400 ? "BAD_REQUEST" : legacyStatus === 403 ? "FORBIDDEN" : "ERROR",
    });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: isProd
      ? "Something went wrong on our side. Please try again in a moment."
      : err instanceof Error
        ? err.message
        : "Internal server error",
    code: "INTERNAL_ERROR",
  });
}
