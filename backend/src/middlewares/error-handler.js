import { ZodError } from "zod";
import { isHttpError } from "../lib/http-error.js";
import { UPLOAD_MAX_BYTES } from "../config/upload-limits.js";
import { formatZodError, toApiErrorBody } from "../utils/route-errors.js";
import {
  duplicateKeyToApiBody,
  isMongoDuplicateKeyError,
} from "../utils/mongo-duplicate-error.js";

const UPLOAD_MAX_MB = Math.round(UPLOAD_MAX_BYTES / (1024 * 1024));
function duplicateKeyMessage(err) {
  return duplicateKeyToApiBody(err);
}
function isMongooseBufferingTimeout(err) {
  return (
    typeof err === "object" &&
    err !== null &&
    err.name === "MongooseError" &&
    typeof err.message === "string" &&
    err.message.includes("buffering timed out")
  );
}
function isCastError(err) {
  return typeof err === "object" && err !== null && err.name === "CastError";
}
function normalizeLegacyStatus(err) {
  const legacy = err;
  if (typeof legacy.statusCode === "number") return legacy.statusCode;
  if (typeof legacy.status === "number") return legacy.status;
  return void 0;
}
function notFoundHandler(req, res) {
  res.status(404).json({
    error: `The API route ${req.method} ${req.path} does not exist.`,
    code: "NOT_FOUND"
  });
}
function errorHandler(err, req, res, _next) {
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
      ...field && field !== "_root" ? { field } : {},
      details
    });
    return;
  }
  const multer = err;
  if (multer && typeof multer === "object" && multer.name === "MulterError") {
    const map = {
      LIMIT_FILE_SIZE: {
        status: 413,
        message: `File is too large. Maximum upload size is ${UPLOAD_MAX_MB} MB.`
      },
      LIMIT_FILE_COUNT: {
        status: 400,
        message: "Too many files. Upload one file at a time."
      },
      LIMIT_UNEXPECTED_FILE: {
        status: 400,
        message: 'Upload failed. Use the form field name "file".'
      }
    };
    const mapped = map[multer.code] ?? {
      status: 400,
      message: "File upload failed. Check the file and try again."
    };
    res.status(mapped.status).json({ error: mapped.message, code: "UPLOAD_ERROR" });
    return;
  }
  if (isMongoDuplicateKeyError(err)) {
    const { message, field } = duplicateKeyMessage(err);
    res.status(409).json({
      error: message,
      code: "CONFLICT",
      ...field ? { field } : {}
    });
    return;
  }
  if (isMongooseBufferingTimeout(err)) {
    req.log.warn({ err }, "Database query timed out while disconnected");
    res.status(503).json({
      error: "Database is temporarily unavailable. Please try again in a moment.",
      code: "DATABASE_UNAVAILABLE",
    });
    return;
  }
  if (isCastError(err)) {
    res.status(400).json({
      error: "Invalid ID or data format in your request.",
      code: "BAD_REQUEST"
    });
    return;
  }
  const legacyStatus = err instanceof Error ? normalizeLegacyStatus(err) : void 0;
  if (legacyStatus && legacyStatus >= 400 && legacyStatus < 600 && err instanceof Error) {
    req.log.warn({ err }, err.message);
    res.status(legacyStatus).json({
      error: err.message,
      code: legacyStatus === 400 ? "BAD_REQUEST" : legacyStatus === 403 ? "FORBIDDEN" : "ERROR"
    });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: isProd ? "Something went wrong on our side. Please try again in a moment." : err instanceof Error ? err.message : "Internal server error",
    code: "INTERNAL_ERROR"
  });
}
export {
  errorHandler,
  notFoundHandler
};
