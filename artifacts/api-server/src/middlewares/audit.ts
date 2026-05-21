import type { Request, Response, NextFunction } from "express";
import { auditLogsTable, getNextSequence } from "@workspace/db/schema";
import { logger } from "../lib/logger";

export async function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const originalSend = res.send;

  // Intercept the response to log after it's sent
  res.json = function (body: any) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };

  res.send = function (body: any) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };

  res.on("finish", async () => {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    const isApi = req.path.startsWith("/api");

    if (isMutation && isSuccess && isApi && req.user) {
      try {
        const auditId = await getNextSequence("audit_logs");
        let action = `${req.method}_${req.path.split("/")[2] || "unknown"}`;
        
        // Refine action name if possible
        if (req.path.includes("/login")) action = "login";
        if (req.path.includes("/logout")) action = "logout";
        if (req.path.includes("/impersonate")) action = "impersonate";
        if (req.path.includes("/stop-impersonate")) action = "stop_impersonate";

        await auditLogsTable.create({
          id: auditId,
          actorId: req.user.id,
          action,
          entityType: req.path.split("/")[2] || "api",
          entityId: res.locals.responseBody?.id || null,
          newVal: req.method !== "DELETE" ? req.body : null,
          oldVal: null, // Hard to capture generically without pre-fetching
          ipAddress: req.ip || req.socket.remoteAddress || null,
          metadata: {
            url: req.originalUrl,
            status: res.statusCode
          }
        });
      } catch (err) {
        logger.error({ err }, "Failed to create audit log");
      }
    }
  });

  next();
}
