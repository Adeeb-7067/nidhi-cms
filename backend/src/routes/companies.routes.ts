import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as companiesController from "@/controllers/companies.controller";
const router: IRouter = Router();
router.get("/companies", requireAuth, asyncHandler(companiesController.getCompanies));
router.post("/companies", requireAuth, requireRole("super_admin"), asyncHandler(companiesController.postCompanies));
router.get("/companies/:id", requireAuth, asyncHandler(companiesController.getCompaniesById));
router.patch("/companies/:id", requireAuth, requireRole("super_admin"), asyncHandler(companiesController.patchCompaniesById));
router.get("/companies/:id/projects", requireAuth, asyncHandler(companiesController.getCompaniesByIdProjects));
router.get("/companies/:id/tickets", requireAuth, asyncHandler(companiesController.getCompaniesByIdTickets));
router.get("/companies/:id/activity", requireAuth, asyncHandler(companiesController.getCompaniesByIdActivity));

export default router;
