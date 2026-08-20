import { Router } from "express";
import {
  getPublicPageBySlug,
  getPublicNavigation,
  getPublicSitemap,
  submitPublicInquiry,
  submitPublicJobApplication,
} from "./controllers/website-public.controller.js";
import {
  listAdminPages,
  createAdminPage,
  getAdminPageById,
  updateAdminPageDraft,
  deleteAdminPage,
  publishAdminPageController,
  rollbackAdminPageController,
  scheduleAdminPagePublishController,
  listPageRevisionsController,
  generateAdminPreviewTokenController,
  requestPresignedUrlController,
  confirmMediaUploadController,
  listAdminMedia,
  deleteAdminMediaController,
  listAdminRedirects,
  createAdminRedirectController,
  deleteAdminRedirectController,
  getAdminSettingsController,
  updateAdminSettingsController,
  listAdminOutboxInquiries,
  seedDefaultPages,
} from "./controllers/website-admin.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requirePermission } from "../../middlewares/permission.js";

const router = Router();

// Helper middleware allowing admin/super_admin or explicit permission
const requireAdminOrPermission = (moduleName, action) => {
  return (req, res, next) => {
    if (req.user?.role === "admin" || req.user?.role === "super_admin" || req.user?.role === "manager") {
      return next();
    }
    return requirePermission(moduleName, action)(req, res, next);
  };
};

// ==========================================
// 1. PUBLIC WEBSITE ENDPOINTS (No Login Req)
// ==========================================
router.get("/v1/website/pages/by-slug", getPublicPageBySlug);
router.get("/v1/website/navigation", getPublicNavigation);
router.get("/v1/website/sitemap", getPublicSitemap);
router.post("/v1/website/inquire", submitPublicInquiry);
router.post("/v1/website/careers/apply", submitPublicJobApplication);

// ==========================================
// 2. ADMIN CONTROL PANEL ENDPOINTS (JWT Req)
// ==========================================
router.use("/v1/admin/website", requireAuth);

// Pages & Publishing
router.get("/v1/admin/website/pages", listAdminPages);
router.post("/v1/admin/website/pages", requireAdminOrPermission("website", "create"), createAdminPage);
router.post("/v1/admin/website/pages/seed-default", seedDefaultPages);
router.get("/v1/admin/website/pages/:id", getAdminPageById);
router.put("/v1/admin/website/pages/:id", requireAdminOrPermission("website", "edit"), updateAdminPageDraft);
router.delete("/v1/admin/website/pages/:id", requireAdminOrPermission("website", "delete"), deleteAdminPage);

router.post("/v1/admin/website/pages/:id/publish", requireAdminOrPermission("website", "publish"), publishAdminPageController);
router.post("/v1/admin/website/pages/:id/rollback", requireAdminOrPermission("website", "rollback"), rollbackAdminPageController);
router.post("/v1/admin/website/pages/:id/schedule", requireAdminOrPermission("website", "publish"), scheduleAdminPagePublishController);
router.get("/v1/admin/website/pages/:id/revisions", listPageRevisionsController);
router.post("/v1/admin/website/pages/:id/preview-token", generateAdminPreviewTokenController);

// Media Management (DigitalOcean Spaces)
router.post("/v1/admin/website/media/presigned-url", requestPresignedUrlController);
router.post("/v1/admin/website/media/confirm", confirmMediaUploadController);
router.get("/v1/admin/website/media", listAdminMedia);
router.delete("/v1/admin/website/media/:id", requireAdminOrPermission("website", "delete"), deleteAdminMediaController);

// Redirects Engine
router.get("/v1/admin/website/redirects", listAdminRedirects);
router.post("/v1/admin/website/redirects", requireAdminOrPermission("website", "edit"), createAdminRedirectController);
router.delete("/v1/admin/website/redirects/:id", requireAdminOrPermission("website", "delete"), deleteAdminRedirectController);

// Global Settings & Navigation Trees
router.get("/v1/admin/website/settings", getAdminSettingsController);
router.put("/v1/admin/website/settings", requireAdminOrPermission("website", "edit"), updateAdminSettingsController);

// Outbox Monitoring
router.get("/v1/admin/website/outbox", requireAdminOrPermission("website", "view"), listAdminOutboxInquiries);

export default router;
