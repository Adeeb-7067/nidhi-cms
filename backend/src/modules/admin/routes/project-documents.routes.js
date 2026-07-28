import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../../../middlewares/auth.js";
import { requirePermission } from "../../../middlewares/permission.js";
import * as ctrl from "../controllers/project-documents.controller.js";

const router = Router();
const wrap = (fn) => asyncHandler(fn);
const p = (action = "view") => [requireAuth, requirePermission("admin_project_documents", action)];

router.get("/project-documents", ...p("view"), wrap(ctrl.listProjectDocuments));
router.get("/project-documents/projects-without", ...p("create"), wrap(ctrl.listProjectsWithoutDocument));
router.get("/project-documents/by-project/:projectId", ...p("view"), wrap(ctrl.getProjectDocumentByProjectId));
router.get("/project-documents/:id", ...p("view"), wrap(ctrl.getProjectDocumentById));
router.post("/project-documents", ...p("create"), wrap(ctrl.createProjectDocument));
router.patch("/project-documents/:id", ...p("edit"), wrap(ctrl.updateProjectDocument));
router.delete("/project-documents/:id", ...p("delete"), wrap(ctrl.deleteProjectDocument));

export default router;
