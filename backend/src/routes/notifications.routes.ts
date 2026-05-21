import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as notificationsController from "@/controllers/notifications.controller";
const router: IRouter = Router();
router.get("/notifications", requireAuth, asyncHandler(notificationsController.getNotifications));
router.post("/notifications/mark-all-read", requireAuth, asyncHandler(notificationsController.postNotificationsMarkAllRead));
router.post("/notifications/:id/read", requireAuth, asyncHandler(notificationsController.postNotificationsByIdRead));
router.post("/notifications/broadcast", requireAuth, requireRole("super_admin"), asyncHandler(notificationsController.postNotificationsBroadcast));

export default router;
