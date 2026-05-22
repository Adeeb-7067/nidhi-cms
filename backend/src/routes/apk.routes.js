import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import * as apkController from "@/controllers/apk.controller";
const router = Router();
router.post("/projects/:id/apk-releases", requireAuth, asyncHandler(apkController.postProjectsByIdApkReleases));
router.get("/apk-releases/:id", requireAuth, asyncHandler(apkController.getApkReleasesById));
var stdin_default = router;
export {
  stdin_default as default
};
