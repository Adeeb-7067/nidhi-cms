import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import logsRouter from "./logs";
import bugsRouter from "./bugs";
import apkRouter from "./apk";
import commentsRouter from "./comments";
import notificationsRouter from "./notifications";
import requestsRouter from "./requests";
import analyticsRouter from "./analytics";
import reportsRouter from "./reports";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(logsRouter);
router.use(bugsRouter);
router.use(apkRouter);
router.use(commentsRouter);
router.use(notificationsRouter);
router.use(requestsRouter);
router.use(analyticsRouter);
router.use(reportsRouter);
router.use(settingsRouter);

export default router;
