import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../middlewares/auth.js";
import * as searchController from "../controllers/search.controller.js";
const router = Router();
router.get("/search", requireAuth, asyncHandler(searchController.getSearch));
var stdin_default = router;
export {
  stdin_default as default
};
