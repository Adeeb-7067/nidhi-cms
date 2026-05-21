import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as searchController from "@/controllers/search.controller";
const router: IRouter = Router();
router.get("/search", requireAuth, asyncHandler(searchController.getSearch));

export default router;
