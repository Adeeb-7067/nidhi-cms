import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import searchRoutes from "./search.routes";
import usersRoutes from "./users.routes";
import clientsRoutes from "./clients.routes";
import companiesRoutes from "./companies.routes";
import projectsRoutes from "./projects.routes";
import logsRoutes from "./logs.routes";
import bugsRoutes from "./bugs.routes";
import tasksRoutes from "./tasks.routes";
import apkRoutes from "./apk.routes";
import commentsRoutes from "./comments.routes";
import notificationsRoutes from "./notifications.routes";
import requestsRoutes from "./requests.routes";
import analyticsRoutes from "./analytics.routes";
import reportsRoutes from "./reports.routes";
import settingsRoutes from "./settings.routes";
import uploadsRoutes from "./uploads.routes";
import ticketsRoutes from "./tickets.routes";
import inventoryRoutes from "./inventory.routes";

const router: IRouter = Router();

/** Paths that do not require a Bearer access token */
const PUBLIC_API_PATHS = new Set([
  "/healthz",
  "/auth/login",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
]);

router.use((req, res, next) => {
  if (req.method === "OPTIONS" || PUBLIC_API_PATHS.has(req.path)) {
    next();
    return;
  }
  asyncHandler(requireAuth)(req, res, next);
});

const featureRouters: IRouter[] = [
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
];

for (const featureRouter of featureRouters) {
  router.use(featureRouter);
}

export default router;
