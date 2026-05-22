import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import * as ticketsController from "@/controllers/tickets.controller";
const router = Router();
router.get("/tickets", requireAuth, asyncHandler(ticketsController.getTickets));
router.post("/tickets", requireAuth, asyncHandler(ticketsController.postTickets));
router.patch("/tickets/:id", requireAuth, asyncHandler(ticketsController.patchTicketsById));
var stdin_default = router;
export {
  stdin_default as default
};
