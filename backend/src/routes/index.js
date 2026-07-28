import { Router } from "express";
import asyncHandler from "express-async-handler";
import { PUBLIC_API_PATHS, isPublicApiRequest } from "../config/api.js";
import { requireAuth } from "../middlewares/auth.js";
import healthRoutes from "../modules/platform/routes/health.routes.js";
import authRoutes from "../modules/identity/routes/auth.routes.js";
import searchRoutes from "../modules/crm/routes/search.routes.js";
import usersRoutes from "../modules/identity/routes/users.routes.js";
import clientsRoutes from "../modules/crm/routes/clients.routes.js";
import companiesRoutes from "../modules/crm/routes/companies.routes.js";
import projectsRoutes from "../modules/crm/routes/projects.routes.js";
import logsRoutes from "../modules/work/routes/logs.routes.js";
import bugsRoutes from "../modules/work/routes/bugs.routes.js";
import tasksRoutes from "../modules/work/routes/tasks.routes.js";
import apkRoutes from "../modules/work/routes/apk.routes.js";
import commentsRoutes from "../modules/collab/routes/comments.routes.js";
import notificationsRoutes from "../modules/collab/routes/notifications.routes.js";
import requestsRoutes from "../modules/work/routes/requests.routes.js";
import analyticsRoutes from "../modules/crm/routes/analytics.routes.js";
import reportsRoutes from "../modules/work/routes/reports.routes.js";
import settingsRoutes from "../modules/settings/routes/settings.routes.js";
import uploadsRoutes from "../modules/uploads/routes/uploads.routes.js";
import ticketsRoutes from "../modules/work/routes/tickets.routes.js";
import navBadgesRoutes from "../modules/work/routes/nav-badges.routes.js";
import alertsRoutes from "../modules/alerts/routes/alerts.routes.js";
import warningsRoutes from "../modules/work/routes/warnings.routes.js";
import inventoryRoutes from "../modules/inventory/routes/inventory.routes.js";
import presenceRoutes from "../modules/monitoring/routes/presence.routes.js";
import screenshotsRoutes from "../modules/monitoring/routes/screenshots.routes.js";
import monitoringRoutes from "../modules/monitoring/routes/monitoring.routes.js";
import workSessionsRoutes from "../modules/monitoring/routes/work-sessions.routes.js";
import clientTeamRoutes from "../modules/identity/routes/client-team.routes.js";
import directConversationsRoutes from "../modules/collab/routes/direct-conversations.routes.js";
import permissionsRoutes from "../modules/identity/routes/permissions.routes.js";
import hrmRoutes from "../modules/hrm/routes.js";
import salesRoutes from "../modules/sales/routes.js";
import financeRoutes from "../modules/finance/routes.js";
import marketingRoutes from "../modules/marketing/routes.js";
import caRoutes from "../modules/ca/routes.js";
import projectDocumentsRoutes from "../modules/admin/routes/project-documents.routes.js";
import adminMediaRoutes from "../modules/admin/routes/admin-media.routes.js";
import { requireDatabase } from "../middlewares/require-database.js";
const router = Router();

// Normalize ?token= query param to the Authorization header.
// Browser <img src> tags cannot send custom headers, so the screenshot
// content proxy embeds the bearer token in the query string instead.
// This must run before requireAuth so the token is visible to the auth check.
router.use((req, _res, next) => {
  if (!req.headers.authorization && typeof req.query.token === "string" && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

router.use((req, res, next) => {
  if (isPublicApiRequest(req)) {
    next();
    return;
  }
  asyncHandler(requireAuth)(req, res, next);
});
router.use(healthRoutes);
router.use(requireDatabase);
const featureRouters = [
  authRoutes,
  searchRoutes,
  usersRoutes,
  clientsRoutes,
  companiesRoutes,
  projectsRoutes,
  logsRoutes,
  bugsRoutes,
  tasksRoutes,
  apkRoutes,
  commentsRoutes,
  notificationsRoutes,
  requestsRoutes,
  analyticsRoutes,
  reportsRoutes,
  settingsRoutes,
  uploadsRoutes,
  ticketsRoutes,
  navBadgesRoutes,
  alertsRoutes,
  warningsRoutes,
  inventoryRoutes,
  presenceRoutes,
  screenshotsRoutes,
  monitoringRoutes,
  workSessionsRoutes,
  clientTeamRoutes,
  directConversationsRoutes,
  permissionsRoutes,
  hrmRoutes,
  salesRoutes,
  financeRoutes,
  marketingRoutes,
  caRoutes,
  projectDocumentsRoutes,
  adminMediaRoutes,
];
for (const featureRouter of featureRouters) {
  router.use(featureRouter);
}
var stdin_default = router;
export {
  stdin_default as default
};
