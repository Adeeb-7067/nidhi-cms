import { isDatabaseConnected } from "../lib/db.js";

/** Fail fast with 503 when MongoDB is not connected (avoids 10s query buffering timeouts). */
export function requireDatabase(req, res, next) {
  if (isDatabaseConnected()) {
    next();
    return;
  }
  req.log?.warn?.({ path: req.path }, "Database unavailable — request rejected");
  res.status(503).json({
    error: "Database is temporarily unavailable. Please try again in a moment.",
    code: "DATABASE_UNAVAILABLE",
  });
}
