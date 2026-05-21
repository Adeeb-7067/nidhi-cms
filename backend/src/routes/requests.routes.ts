import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as requestsController from "@/controllers/requests.controller";
const router: IRouter = Router();
router.get("/requests", requireAuth, asyncHandler(requestsController.getRequests));
router.post("/requests", requireAuth, asyncHandler(requestsController.postRequests));
router.get("/requests/:id", requireAuth, asyncHandler(requestsController.getRequestsById));
router.patch("/requests/:id", requireAuth, requireRole("super_admin"), asyncHandler(requestsController.patchRequestsById));

export default router;
