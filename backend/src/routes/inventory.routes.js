import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import * as inventoryController from "@/controllers/inventory";
const router = Router();
router.get("/projects/:projectId/inventory/summary", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventorySummary));
router.get("/projects/:projectId/inventory/activities", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventoryActivities));
router.get("/projects/:projectId/inventory/folders", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventoryFolders));
router.post("/projects/:projectId/inventory/folders", requireAuth, asyncHandler(inventoryController.postProjectsByProjectIdInventoryFolders));
router.get("/projects/:projectId/inventory/resources", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventoryResources));
router.post("/projects/:projectId/inventory/resources", requireAuth, asyncHandler(inventoryController.postProjectsByProjectIdInventoryResources));
router.patch("/projects/:projectId/inventory/resources/:id", requireAuth, asyncHandler(inventoryController.patchProjectsByProjectIdInventoryResourcesById));
router.delete("/projects/:projectId/inventory/resources/:id", requireAuth, asyncHandler(inventoryController.deleteProjectsByProjectIdInventoryResourcesById));
router.get("/projects/:projectId/inventory/credentials", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventoryCredentials));
router.post("/projects/:projectId/inventory/credentials", requireAuth, asyncHandler(inventoryController.postProjectsByProjectIdInventoryCredentials));
router.post("/projects/:projectId/inventory/credentials/:id/reveal", requireAuth, asyncHandler(inventoryController.postProjectsByProjectIdInventoryCredentialsByIdReveal));
router.delete("/projects/:projectId/inventory/credentials/:id", requireAuth, asyncHandler(inventoryController.deleteProjectsByProjectIdInventoryCredentialsById));
router.get("/projects/:projectId/inventory/environments", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventoryEnvironments));
router.post("/projects/:projectId/inventory/environments", requireAuth, asyncHandler(inventoryController.postProjectsByProjectIdInventoryEnvironments));
router.patch("/projects/:projectId/inventory/environments/:id", requireAuth, asyncHandler(inventoryController.patchProjectsByProjectIdInventoryEnvironmentsById));
router.get("/projects/:projectId/inventory/devices", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventoryDevices));
router.post("/projects/:projectId/inventory/devices", requireAuth, asyncHandler(inventoryController.postProjectsByProjectIdInventoryDevices));
router.get("/projects/:projectId/inventory/subscriptions", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventorySubscriptions));
router.post("/projects/:projectId/inventory/subscriptions", requireAuth, asyncHandler(inventoryController.postProjectsByProjectIdInventorySubscriptions));
router.get("/projects/:projectId/inventory/builds", requireAuth, asyncHandler(inventoryController.getProjectsByProjectIdInventoryBuilds));
var stdin_default = router;
export {
  stdin_default as default
};
