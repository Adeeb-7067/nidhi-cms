import { Router } from "express";
import { monitorableStaffRoles } from "../constants/user-roles.js";
import asyncHandler from "express-async-handler";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as workSessionsController from "../controllers/work-sessions.controller.js";

const clockInLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user.id),
  message: { error: "Too many clock-in attempts. Please wait a minute." },
});

const router = Router();

// Clock-in/out is only valid for monitored employee roles — admins and clients never clock in.
router.post(
  "/work-sessions/clock-in",
  requireAuth,
  requireRole(...monitorableStaffRoles),
  clockInLimiter,
  asyncHandler(workSessionsController.handleClockIn)
);
router.post("/work-sessions/clock-out", requireAuth, requireRole(...monitorableStaffRoles), asyncHandler(workSessionsController.handleClockOut));
router.post("/work-sessions/heartbeat", requireAuth, requireRole(...monitorableStaffRoles), asyncHandler(workSessionsController.handleHeartbeat));
router.get("/work-sessions/active", requireAuth, asyncHandler(workSessionsController.handleGetActive));
// Super-admin only: list all currently active sessions across every employee
router.get("/work-sessions/active-all", requireAuth, requireRole("super_admin"), asyncHandler(workSessionsController.handleListActiveSessions));
router.get("/work-sessions/daily-totals", requireAuth, asyncHandler(workSessionsController.handleListDailyTotals));
router.get("/work-sessions", requireAuth, asyncHandler(workSessionsController.handleListSessions));
// Super-admin: force-terminate a specific session (e.g. policy change, suspected account compromise)
router.post(
  "/work-sessions/:sessionId/terminate",
  requireAuth,
  requireRole("super_admin"),
  asyncHandler(workSessionsController.handleForceTerminate)
);

export default router;
