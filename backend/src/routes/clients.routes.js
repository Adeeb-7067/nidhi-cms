import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as clientsController from "../controllers/clients.controller.js";
const router = Router();
router.get("/clients", requireAuth, asyncHandler(clientsController.getClients));
router.post("/clients", requireAuth, requireRole("super_admin"), asyncHandler(clientsController.postClients));
router.get("/clients/:id", requireAuth, asyncHandler(clientsController.getClientsById));
router.patch("/clients/:id", requireAuth, requireRole("super_admin"), asyncHandler(clientsController.patchClientsById));
router.delete("/clients/:id", requireAuth, requireRole("super_admin"), asyncHandler(clientsController.deleteClientsById));
var stdin_default = router;
export {
  stdin_default as default
};
