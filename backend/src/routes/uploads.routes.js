import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "../middlewares/auth.js";
import * as uploadsController from "../controllers/uploads.controller.js";
import multer from "multer";
import { UPLOAD_MAX_BYTES } from "../config/upload-limits.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES },
});
const router = Router();
router.post("/upload", requireAuth, upload.single("file"), asyncHandler(uploadsController.postUpload));
var stdin_default = router;
export {
  stdin_default as default
};
