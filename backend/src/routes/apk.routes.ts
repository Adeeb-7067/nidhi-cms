import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as apkController from "@/controllers/apk.controller";
const router: IRouter = Router();
router.post("/projects/:id/apk-releases", requireAuth, asyncHandler(apkController.postProjectsByIdApkReleases));
router.get("/apk-releases/:id", requireAuth, asyncHandler(apkController.getApkReleasesById));

export default router;
