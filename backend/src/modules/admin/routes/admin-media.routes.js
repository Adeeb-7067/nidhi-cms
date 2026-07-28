import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../../middlewares/auth.js";
import { requirePermission } from "../../../middlewares/permission.js";
import * as ctrl from "../controllers/admin-media.controller.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);
const p = (action = "view") => [requireAuth, requirePermission("admin_media", action)];

router.get("/admin/media/tree", ...p(), wrap(ctrl.listMediaTree));
router.get("/admin/media", ...p(), wrap(ctrl.listMedia));
router.get("/admin/media/:id/download", ...p(), wrap(ctrl.downloadMedia));
router.post("/admin/media/folders", ...p("create"), wrap(ctrl.createFolder));
router.post("/admin/media/files", ...p("create"), wrap(ctrl.registerFile));
router.patch("/admin/media/:id", ...p("edit"), wrap(ctrl.renameMedia));
router.post("/admin/media/:id/move", ...p("edit"), wrap(ctrl.moveMedia));
router.delete("/admin/media/:id", ...p("delete"), wrap(ctrl.deleteMedia));

export default router;
