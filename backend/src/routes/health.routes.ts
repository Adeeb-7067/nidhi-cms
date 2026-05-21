import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import * as healthController from "@/controllers/health.controller";

const router: IRouter = Router();

router.get("/healthz", asyncHandler(healthController.getHealthz));

export default router;
