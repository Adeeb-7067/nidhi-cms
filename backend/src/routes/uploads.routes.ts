import { Router, type IRouter } from "express";
import asyncHandler from "express-async-handler";
import { requireAuth, requireRole } from "@/middlewares/auth";
import * as uploadsController from "@/controllers/uploads.controller";
import multer from "multer";
import { UPLOAD_CATEGORIES, type UploadCategory } from "@/lib/file-storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
const router: IRouter = Router();
router.post("/upload", requireAuth, upload.single("file"), asyncHandler(uploadsController.postUpload));

export default router;
