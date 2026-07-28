import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import * as notificationsController from "../controllers/notifications.controller.js";
const router = Router();
router.get("/notifications", requireAuth, asyncHandler(notificationsController.getNotifications));
router.post("/notifications/mark-all-read", requireAuth, asyncHandler(notificationsController.postNotificationsMarkAllRead));
router.post("/notifications/:id/read", requireAuth, asyncHandler(notificationsController.postNotificationsByIdRead));
router.post("/notifications/broadcast", requireAuth, requireRole("super_admin"), asyncHandler(notificationsController.postNotificationsBroadcast));
var stdin_default = router;
export {
  stdin_default as default
};
