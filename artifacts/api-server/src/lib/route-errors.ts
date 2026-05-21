import type { ZodError } from "zod";
import { HttpError } from "./http-error";

export type ApiErrorBody = {
  error: string;
  code: string;
  field?: string;
  details?: Record<string, string[]>;
};

export function badRequest(message: string, field?: string): never {
  throw new HttpError(400, message, { code: "BAD_REQUEST", field });
}

export function unauthorized(message = "Please sign in to continue."): never {
  throw new HttpError(401, message, { code: "UNAUTHORIZED" });
}

export function forbidden(message = "You do not have permission to perform this action."): never {
  throw new HttpError(403, message, { code: "FORBIDDEN" });
}

export function notFound(resource = "Resource"): never {
  throw new HttpError(404, `${resource} was not found. Check the ID and try again.`, {
    code: "NOT_FOUND",
  });
}

export function conflict(message: string, field?: string): never {
  throw new HttpError(409, message, { code: "CONFLICT", field });
}

export function validationError(message: string, field?: string): never {
  throw new HttpError(422, message, { code: "VALIDATION_ERROR", field });
}

export function tooManyRequests(message: string): never {
  throw new HttpError(429, message, { code: "TOO_MANY_REQUESTS" });
}

export function internalError(message = "Something went wrong on our side. Please try again."): never {
  throw new HttpError(500, message, { code: "INTERNAL_ERROR" });
}

/** Required body fields — returns trimmed record or throws with field name. */
export function requireBodyFields<T extends string>(
  body: Record<string, unknown>,
  fields: readonly T[],
): Record<T, string> {
  const out = {} as Record<T, string>;
  for (const key of fields) {
    const raw = body[key];
    if (raw === undefined || raw === null || (typeof raw === "string" && !raw.trim())) {
      badRequest(`${humanizeField(key)} is required.`, key);
    }
    out[key] = typeof raw === "string" ? raw.trim() : String(raw);
  }
  return out;
}

export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

export function parseIdParam(
  raw: string | string[] | undefined,
  label = "id",
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(id) || id < 1) {
    badRequest(`Invalid ${label}. Use a positive number.`, label);
  }
  return id;
}

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

export function parsePagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  let limit = Number.parseInt(String(query.limit ?? DEFAULT_PAGE_LIMIT), 10) || DEFAULT_PAGE_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_PAGE_LIMIT;
  if (limit > MAX_PAGE_LIMIT) limit = MAX_PAGE_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}

export function formatZodError(err: ZodError): { message: string; details: Record<string, string[]> } {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.length ? issue.path.join(".") : "_root";
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  const firstPath = Object.keys(details)[0];
  const firstMsg = firstPath ? details[firstPath][0] : "Invalid request data.";
  const field = firstPath && firstPath !== "_root" ? firstPath : undefined;
  const message = field ? `${humanizeField(field)}: ${firstMsg}` : firstMsg;
  return { message, details };
}

function humanizeField(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function toApiErrorBody(err: HttpError): ApiErrorBody {
  return {
    error: err.message,
    code: err.code,
    ...(err.field ? { field: err.field } : {}),
    ...(err.details ? { details: err.details } : {}),
  };
}
