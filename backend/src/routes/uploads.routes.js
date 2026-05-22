import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth } from "@/middlewares/auth";
import * as uploadsController from "@/controllers/uploads.controller";
import multer from "multer";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
const router = Router();
router.post("/upload", requireAuth, upload.single("file"), asyncHandler(uploadsController.postUpload));
var stdin_default = router;
export {
  stdin_default as default
};
