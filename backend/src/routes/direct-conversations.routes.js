import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../middlewares/auth.js";
import * as directConversationsController from "../controllers/direct-conversations.controller.js";

const router = Router();

router.get(
  "/direct-conversations",
  requireAuth,
  asyncHandler(directConversationsController.getDirectConversations),
);
router.get(
  "/direct-conversations/contacts",
  requireAuth,
  asyncHandler(directConversationsController.getDirectConversationContacts),
);
router.post(
  "/direct-conversations",
  requireAuth,
  asyncHandler(directConversationsController.postDirectConversation),
);

export default router;
