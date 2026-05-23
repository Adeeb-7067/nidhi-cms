import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as requestsController from "../controllers/requests.controller.js";
const router = Router();
router.get("/requests", requireAuth, asyncHandler(requestsController.getRequests));
router.post("/requests", requireAuth, asyncHandler(requestsController.postRequests));
router.get("/requests/:id", requireAuth, asyncHandler(requestsController.getRequestsById));
router.patch("/requests/:id", requireAuth, requireRole("super_admin"), asyncHandler(requestsController.patchRequestsById));
var stdin_default = router;
export {
  stdin_default as default
};
