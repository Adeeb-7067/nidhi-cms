import { Router } from "express";
import asyncHandler from "express-async-handler";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { UPLOAD_MAX_BYTES_DEFAULT } from "../config/upload-limits.js";
import { monitorableStaffRoles } from "../constants/user-roles.js";
import * as screenshotsController from "../controllers/screenshots.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: UPLOAD_MAX_BYTES_DEFAULT } });

const uploadLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user.id),
  message: { error: "Too many screenshot uploads. Please wait." },
});

const router = Router();

// Upload is restricted to monitored roles only — screenshot capture runs exclusively in
// the Electron desktop app. Admins and clients have no scheduler and must not upload.
router.post(
  "/screenshots",
  requireAuth,
  requireRole(...monitorableStaffRoles),
  uploadLimiter,
  upload.single("file"),
  asyncHandler(screenshotsController.create)
);
// List and delete: admins only for mutations; list enforced in service.
router.get("/screenshots", requireAuth, asyncHandler(screenshotsController.list));
router.delete("/screenshots/:id", requireAuth, asyncHandler(screenshotsController.remove));
router.post("/screenshots/bulk-delete", requireAuth, asyncHandler(screenshotsController.bulkDelete));
// Authenticated content proxy — ?token= is extracted globally in routes/index.js
// so <img src="...?token="> works without a custom Authorization header.
router.get(
  "/screenshots/:id/content",
  requireAuth,
  asyncHandler(screenshotsController.serveContent)
);

export default router;
