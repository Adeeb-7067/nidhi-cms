import { HttpError } from "../lib/http-error.js";
function badRequest(message, field) {
  throw new HttpError(400, message, { code: "BAD_REQUEST", field });
}
function unauthorized(message = "Please sign in to continue.") {
  throw new HttpError(401, message, { code: "UNAUTHORIZED" });
}
function forbidden(message = "You do not have permission to perform this action.") {
  throw new HttpError(403, message, { code: "FORBIDDEN" });
}
function notFound(resource = "Resource") {
  throw new HttpError(404, `${resource} was not found. Check the ID and try again.`, {
    code: "NOT_FOUND"
  });
}
function conflict(message, field) {
  throw new HttpError(409, message, { code: "CONFLICT", field });
}
function validationError(message, field) {
  throw new HttpError(422, message, { code: "VALIDATION_ERROR", field });
}
function tooManyRequests(message) {
  throw new HttpError(429, message, { code: "TOO_MANY_REQUESTS" });
}
function internalError(message = "Something went wrong on our side. Please try again.") {
  throw new HttpError(500, message, { code: "INTERNAL_ERROR" });
}
function requireBodyFields(body, fields) {
  const out = {};
  for (const key of fields) {
    const raw = body[key];
    if (raw === void 0 || raw === null || typeof raw === "string" && !raw.trim()) {
      badRequest(`${humanizeField(key)} is required.`, key);
    }
    out[key] = typeof raw === "string" ? raw.trim() : String(raw);
  }
  return out;
}
function optionalString(value) {
  if (value === void 0 || value === null) return void 0;
  const s = String(value).trim();
  return s || void 0;
}
function parseIdParam(raw, label = "id") {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(id) || id < 1) {
    badRequest(`Invalid ${label}. Use a positive number.`, label);
  }
  return id;
}
const MAX_PAGE_LIMIT = 500;
const DEFAULT_PAGE_LIMIT = 20;
function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  let limit = Number.parseInt(String(query.limit ?? DEFAULT_PAGE_LIMIT), 10) || DEFAULT_PAGE_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_PAGE_LIMIT;
  if (limit > MAX_PAGE_LIMIT) limit = MAX_PAGE_LIMIT;
  return { page, limit, skip: (page - 1) * limit };
}
function formatZodError(err) {
  const details = {};
  for (const issue of err.issues) {
    const path = issue.path.length ? issue.path.join(".") : "_root";
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  const firstPath = Object.keys(details)[0];
  const firstMsg = firstPath ? details[firstPath][0] : "Invalid request data.";
  const field = firstPath && firstPath !== "_root" ? firstPath : void 0;
  const message = field ? `${humanizeField(field)}: ${firstMsg}` : firstMsg;
  return { message, details };
}
function humanizeField(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase()).trim();
}
function toApiErrorBody(err) {
  return {
    error: err.message,
    code: err.code,
    ...err.field ? { field: err.field } : {},
    ...err.details ? { details: err.details } : {}
  };
}
export {
  badRequest,
  conflict,
  forbidden,
  formatZodError,
  internalError,
  notFound,
  optionalString,
  parseIdParam,
  parsePagination,
  requireBodyFields,
  toApiErrorBody,
  tooManyRequests,
  unauthorized,
  validationError
};
