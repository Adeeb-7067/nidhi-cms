import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import * as commentsController from "@/controllers/comments.controller";
const router = Router();
router.get("/comments", requireAuth, asyncHandler(commentsController.getComments));
router.post("/comments", requireAuth, asyncHandler(commentsController.postComments));
router.patch("/comments/:id", requireAuth, asyncHandler(commentsController.patchCommentsById));
var stdin_default = router;
export {
  stdin_default as default
};
