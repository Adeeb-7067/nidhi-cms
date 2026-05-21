import { Router, type IRouter } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../middlewares/auth";
import { wrapRouterHandlers } from "../middlewares/wrap-router";
import healthRouter from "./health";
import authRouter from "./auth";
import searchRouter from "./search";
import usersRouter from "./users";
import clientsRouter from "./clients";
import companiesRouter from "./companies";
import projectsRouter from "./projects";
import logsRouter from "./logs";
import bugsRouter from "./bugs";
import tasksRouter from "./tasks";
import apkRouter from "./apk";
import commentsRouter from "./comments";
import notificationsRouter from "./notifications";
import requestsRouter from "./requests";
import analyticsRouter from "./analytics";
import reportsRouter from "./reports";
import settingsRouter from "./settings";
import uploadsRouter from "./uploads";
import ticketsRouter from "./tickets";
import inventoryRouter from "./inventory";

const router: IRouter = Router();

/** Paths that do not require a Bearer access token */
const PUBLIC_API_PATHS = new Set([
  "/healthz",
  "/auth/login",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
]);

router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS" || PUBLIC_API_PATHS.has(req.path)) {
    next();
    return;
  }
  void requireAuth(req, res, next);
});

const featureRouters: IRouter[] = [
  healthRouter,
  authRouter,
  searchRouter,
  usersRouter,
  clientsRouter,
  companiesRouter,
  projectsRouter,
  logsRouter,
  bugsRouter,
  tasksRouter,
  apkRouter,
  commentsRouter,
  notificationsRouter,
  requestsRouter,
  analyticsRouter,
  reportsRouter,
  settingsRouter,
  uploadsRouter,
  ticketsRouter,
  inventoryRouter,
];

for (const featureRouter of featureRouters) {
  router.use(wrapRouterHandlers(featureRouter));
}

export default router;
