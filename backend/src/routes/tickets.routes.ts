import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as ticketsController from "@/controllers/tickets.controller";
const router: IRouter = Router();
router.get("/tickets", requireAuth, asyncHandler(ticketsController.getTickets));
router.post("/tickets", requireAuth, asyncHandler(ticketsController.postTickets));
router.patch("/tickets/:id", requireAuth, asyncHandler(ticketsController.patchTicketsById));

export default router;
