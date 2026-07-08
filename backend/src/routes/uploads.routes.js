import { randomUUID } from "crypto";
import path from "path";
import { Router } from "express";
import asyncHandler from "express-async-handler";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.js";
import * as uploadsController from "../controllers/uploads.controller.js";
import { UPLOAD_MAX_BYTES } from "../config/upload-limits.js";
import { ensureLocalUploadDir } from "../lib/file-storage.js";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const apkDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureLocalUploadDir();
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`);
  },
});

const memoryMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES },
});
const apkMulter = multer({
  storage: apkDiskStorage,
  limits: { fileSize: UPLOAD_MAX_BYTES },
});

function uploadMiddleware(req, res, next) {
  const raw = typeof req.query.category === "string" ? req.query.category.toLowerCase() : "";
  const handler = raw === "apk" ? apkMulter : memoryMulter;
  handler.single("file")(req, res, next);
}

const router = Router();
router.post("/upload", requireAuth, uploadMiddleware, asyncHandler(uploadsController.postUpload));
// Direct-to-bucket flow: presign a PUT URL, browser uploads straight to object
// storage, then finalize sets the ACL. Bypasses nginx/Node for the file bytes.
router.post("/upload/presign", requireAuth, asyncHandler(uploadsController.postUploadPresign));
router.post("/upload/finalize", requireAuth, asyncHandler(uploadsController.postUploadFinalize));

export default router;
