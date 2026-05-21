import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as clientsController from "@/controllers/clients.controller";
const router: IRouter = Router();
router.get("/clients", requireAuth, asyncHandler(clientsController.getClients));
router.post("/clients", requireAuth, requireRole("super_admin"), asyncHandler(clientsController.postClients));
router.get("/clients/:id", requireAuth, asyncHandler(clientsController.getClientsById));
router.patch("/clients/:id", requireAuth, requireRole("super_admin"), asyncHandler(clientsController.patchClientsById));

export default router;
