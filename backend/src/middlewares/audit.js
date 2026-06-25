import { auditLogsTable, getNextSequenceRange } from "../models/schema/index.js";
import { logger } from "../lib/logger.js";

// Batch audit writes: collect entries for up to FLUSH_INTERVAL_MS then insertMany.
// This reduces 2 DB ops per mutation to ~1 bulk insert per batch window.
const FLUSH_INTERVAL_MS = 1000;
const _auditQueue = [];
let _auditFlushTimer = null;

async function flushAuditQueue() {
  _auditFlushTimer = null;
  if (!_auditQueue.length) return;
  const batch = _auditQueue.splice(0);
  try {
    const ids = await getNextSequenceRange("audit_logs", batch.length);
    const docs = batch.map((entry, i) => ({ id: ids[i], ...entry }));
    await auditLogsTable.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.error({ err }, "Failed to flush audit log batch");
  }
}

function queueAuditEntry(entry) {
  _auditQueue.push(entry);
  if (!_auditFlushTimer) {
    _auditFlushTimer = setTimeout(flushAuditQueue, FLUSH_INTERVAL_MS);
  }
}

async function auditMiddleware(req, res, next) {
  const originalJson = res.json;
  const originalSend = res.send;
  res.json = function(body) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };
  res.send = function(body) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };
  res.on("finish", () => {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    const isApi = req.path.startsWith("/api");
    if (isMutation && isSuccess && isApi && req.user) {
      let action = `${req.method}_${req.path.split("/")[2] || "unknown"}`;
      if (req.path.includes("/login")) action = "login";
      if (req.path.includes("/logout")) action = "logout";
      if (req.path.includes("/impersonate")) action = "impersonate";
      if (req.path.includes("/stop-impersonate")) action = "stop_impersonate";
      queueAuditEntry({
        actorId: req.user.id,
        action,
        entityType: req.path.split("/")[2] || "api",
        entityId: res.locals.responseBody?.id || null,
        newVal: req.method !== "DELETE" ? req.body : null,
        oldVal: null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        metadata: { url: req.originalUrl, status: res.statusCode },
      });
    }
  });
  next();
}

export { auditMiddleware };
