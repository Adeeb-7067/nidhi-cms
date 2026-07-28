import { Router } from "express";
import asyncHandler from "express-async-handler";
import * as presenceController from "../controllers/presence.controller.js";

const router = Router();

router.get("/presence", asyncHandler(presenceController.getPresence));
router.get("/presence/me", asyncHandler(presenceController.getPresenceMe));
router.post("/presence/heartbeat", asyncHandler(presenceController.postPresenceHeartbeat));

export default router;
