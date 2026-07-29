import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../middlewares/auth.js";
import { requirePermission, requireAnyPermission } from "../../middlewares/permission.js";
import { requireDigitalModuleAccess } from "../../middlewares/digital-access.js";
import * as dashboardCtrl from "./controllers/dashboard.controller.js";
import * as accountsCtrl from "./controllers/accounts.controller.js";
import * as tasksCtrl from "./controllers/tasks.controller.js";
import * as mediaCtrl from "./controllers/media.controller.js";
import * as workflowCtrl from "./controllers/workflow.controller.js";
import * as queuesCtrl from "./controllers/queues.controller.js";
import * as insightsCtrl from "./controllers/insights.controller.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);
/**
 * Permission + Digital sub-role access gate.
 * 1. requireAuth         — user must be logged in
 * 2. requirePermission   — role template must grant module:action
 * 3. requireDigitalModuleAccess — digital sub-role must allow the module
 */
const p = (module, action = "view") => [
  requireAuth,
  requirePermission(module, action),
  requireDigitalModuleAccess(module),
];

// ── Dashboard ────────────────────────────────────────────────────────────
router.get("/marketing/dashboard", ...p("marketing_dashboard"), wrap(dashboardCtrl.getDashboard));

// ── Digital accounts (clients) ───────────────────────────────────────────
router.get("/marketing/accounts", ...p("marketing_clients"), wrap(accountsCtrl.listAccounts));
router.post("/marketing/accounts", ...p("marketing_clients", "create"), wrap(accountsCtrl.createAccount));
router.get("/marketing/accounts/:id", ...p("marketing_clients"), wrap(accountsCtrl.getAccountById));
router.patch("/marketing/accounts/:id", ...p("marketing_clients", "edit"), wrap(accountsCtrl.updateAccount));
router.delete("/marketing/accounts/:id", ...p("marketing_clients", "delete"), wrap(accountsCtrl.deleteAccount));
router.get(
  "/marketing/accounts/:id/campaigns",
  ...p("marketing_clients"),
  wrap(accountsCtrl.listAccountCampaigns),
);

// ── Tasks ────────────────────────────────────────────────────────────────
router.get("/marketing/tasks", ...p("marketing_tasks"), wrap(tasksCtrl.listTasks));
router.post("/marketing/tasks", ...p("marketing_tasks", "create"), wrap(tasksCtrl.createTask));
router.patch("/marketing/tasks/:id", ...p("marketing_tasks", "edit"), wrap(tasksCtrl.updateTask));
router.delete("/marketing/tasks/:id", ...p("marketing_tasks", "delete"), wrap(tasksCtrl.deleteTask));

// ── Media vault ──────────────────────────────────────────────────────────
router.get("/marketing/media", ...p("marketing_media"), wrap(mediaCtrl.listMedia));
router.get("/marketing/media/tree", ...p("marketing_media"), wrap(mediaCtrl.listMediaTree));
router.get("/marketing/media/:id/download", ...p("marketing_media"), wrap(mediaCtrl.downloadMedia));
router.post("/marketing/media/folders", ...p("marketing_media", "create"), wrap(mediaCtrl.createFolder));
router.post("/marketing/media/files", ...p("marketing_media", "create"), wrap(mediaCtrl.registerFile));
router.patch("/marketing/media/:id", ...p("marketing_media", "edit"), wrap(mediaCtrl.renameMedia));
router.post("/marketing/media/:id/move", ...p("marketing_media", "edit"), wrap(mediaCtrl.moveMedia));
router.delete(
  "/marketing/media/:id",
  requireAuth,
  requireAnyPermission(
    ["marketing_media", "delete"],
    ["marketing_media", "edit"],
  ),
  requireDigitalModuleAccess("marketing_media"),
  wrap(mediaCtrl.deleteMedia),
);

// ── Calendar posts + approvals ───────────────────────────────────────────
router.get("/marketing/posts", ...p("marketing_calendar"), wrap(workflowCtrl.listPosts));
router.post("/marketing/posts", ...p("marketing_calendar", "create"), wrap(workflowCtrl.createPost));
router.patch("/marketing/posts/:id", ...p("marketing_calendar", "edit"), wrap(workflowCtrl.updatePost));
// Creators may remove their own schedules with create/edit; module delete still
// covers elevated/org-admin deletes (ownership enforced in the controller).
router.delete(
  "/marketing/posts/:id",
  requireAuth,
  requireAnyPermission(
    ["marketing_calendar", "delete"],
    ["marketing_calendar", "create"],
    ["marketing_calendar", "edit"],
  ),
  requireDigitalModuleAccess("marketing_calendar"),
  wrap(workflowCtrl.deletePost),
);

router.get("/marketing/approvals", ...p("marketing_approvals"), wrap(workflowCtrl.listApprovals));
router.patch(
  "/marketing/approvals/:id/stage",
  ...p("marketing_approvals", "edit"),
  wrap(workflowCtrl.updateApprovalStage),
);
router.patch(
  "/marketing/approvals/:id",
  ...p("marketing_approvals", "edit"),
  wrap(workflowCtrl.updateApproval),
);
router.delete(
  "/marketing/approvals/:id",
  ...p("marketing_approvals", "delete"),
  wrap(workflowCtrl.deleteApproval),
);

// ── Graphics / Videos / Content queues ───────────────────────────────────
router.get("/marketing/graphics", ...p("marketing_content"), wrap(queuesCtrl.listGraphics));
router.post("/marketing/graphics", ...p("marketing_content", "create"), wrap(queuesCtrl.createGraphic));
router.patch("/marketing/graphics/:id", ...p("marketing_content", "edit"), wrap(queuesCtrl.updateGraphic));
router.delete("/marketing/graphics/:id", ...p("marketing_content", "delete"), wrap(queuesCtrl.deleteGraphic));

router.get("/marketing/videos", ...p("marketing_content"), wrap(queuesCtrl.listVideos));
router.post("/marketing/videos", ...p("marketing_content", "create"), wrap(queuesCtrl.createVideo));
router.patch("/marketing/videos/:id", ...p("marketing_content", "edit"), wrap(queuesCtrl.updateVideo));
router.delete("/marketing/videos/:id", ...p("marketing_content", "delete"), wrap(queuesCtrl.deleteVideo));

router.get("/marketing/content", ...p("marketing_content"), wrap(queuesCtrl.listContent));
router.post("/marketing/content", ...p("marketing_content", "create"), wrap(queuesCtrl.createContent));
router.patch("/marketing/content/:id", ...p("marketing_content", "edit"), wrap(queuesCtrl.updateContent));
router.delete("/marketing/content/:id", ...p("marketing_content", "delete"), wrap(queuesCtrl.deleteContent));

// ── Ads + analytics + reports ────────────────────────────────────────────
router.get("/marketing/campaigns", ...p("marketing_ads"), wrap(insightsCtrl.listCampaigns));
router.post("/marketing/campaigns", ...p("marketing_ads", "create"), wrap(insightsCtrl.createCampaign));
router.patch("/marketing/campaigns/:id", ...p("marketing_ads", "edit"), wrap(insightsCtrl.updateCampaign));
router.delete("/marketing/campaigns/:id", ...p("marketing_ads", "delete"), wrap(insightsCtrl.deleteCampaign));

router.get("/marketing/social", ...p("marketing_analytics"), wrap(insightsCtrl.listSocialMetrics));
router.post(
  "/marketing/social",
  requireAuth,
  requireAnyPermission(
    ["marketing_analytics", "create"],
    ["marketing_analytics", "edit"],
  ),
  requireDigitalModuleAccess("marketing_analytics"),
  wrap(insightsCtrl.upsertSocialMetric),
);
router.delete(
  "/marketing/social/:id",
  ...p("marketing_analytics", "delete"),
  wrap(insightsCtrl.deleteSocialMetric),
);

router.get("/marketing/seo", ...p("marketing_seo"), wrap(insightsCtrl.getSeoPanel));
router.post("/marketing/seo/keywords", ...p("marketing_seo", "create"), wrap(insightsCtrl.createSeoKeyword));
router.patch(
  "/marketing/seo/keywords/:id",
  ...p("marketing_seo", "edit"),
  wrap(insightsCtrl.updateSeoKeyword),
);
router.delete(
  "/marketing/seo/keywords/:id",
  ...p("marketing_seo", "delete"),
  wrap(insightsCtrl.deleteSeoKeyword),
);

router.get("/marketing/performance", ...p("marketing_analytics"), wrap(insightsCtrl.getTeamPerformance));

router.get("/marketing/reports", ...p("marketing_reports"), wrap(insightsCtrl.listReports));
router.post("/marketing/reports", ...p("marketing_reports", "create"), wrap(insightsCtrl.createReport));
router.patch("/marketing/reports/:id", ...p("marketing_reports", "edit"), wrap(insightsCtrl.updateReport));
router.delete("/marketing/reports/:id", ...p("marketing_reports", "delete"), wrap(insightsCtrl.deleteReport));

export default router;
