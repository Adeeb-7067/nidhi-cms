import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as commentsController from "@/controllers/comments.controller";
const router: IRouter = Router();
router.get("/comments", requireAuth, asyncHandler(commentsController.getComments));
router.post("/comments", requireAuth, asyncHandler(commentsController.postComments));
router.patch("/comments/:id", requireAuth, asyncHandler(commentsController.patchCommentsById));

export default router;
