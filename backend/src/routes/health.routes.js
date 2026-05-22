import { Router } from "express";
import asyncHandler from "express-async-handler";
import * as healthController from "@/controllers/health.controller";
const router = Router();
router.get("/healthz", asyncHandler(healthController.getHealthz));
var stdin_default = router;
export {
  stdin_default as default
};
