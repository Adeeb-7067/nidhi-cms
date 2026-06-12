import { Router } from "express";
import asyncHandler from "express-async-handler";
import { PUBLIC_API_PATHS } from "../config/index.js";
import { requireAuth } from "../middlewares/auth.js";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import searchRoutes from "./search.routes.js";
import usersRoutes from "./users.routes.js";
import clientsRoutes from "./clients.routes.js";
import companiesRoutes from "./companies.routes.js";
import projectsRoutes from "./projects.routes.js";
import logsRoutes from "./logs.routes.js";
import bugsRoutes from "./bugs.routes.js";
import tasksRoutes from "./tasks.routes.js";
import apkRoutes from "./apk.routes.js";
import commentsRoutes from "./comments.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import requestsRoutes from "./requests.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import reportsRoutes from "./reports.routes.js";
import settingsRoutes from "./settings.routes.js";
import uploadsRoutes from "./uploads.routes.js";
import ticketsRoutes from "./tickets.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import presenceRoutes from "./presence.routes.js";
import screenshotsRoutes from "./screenshots.routes.js";
import monitoringRoutes from "./monitoring.routes.js";
import workSessionsRoutes from "./work-sessions.routes.js";
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
  if (req.method === "OPTIONS" || PUBLIC_API_PATHS.has(req.path)) {
    next();
    return;
  }
  asyncHandler(requireAuth)(req, res, next);
});
const featureRouters = [
  healthRoutes,
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
  inventoryRoutes,
  presenceRoutes,
  screenshotsRoutes,
  monitoringRoutes,
  workSessionsRoutes,
];
for (const featureRouter of featureRouters) {
  router.use(featureRouter);
}
var stdin_default = router;
export {
  stdin_default as default
};
