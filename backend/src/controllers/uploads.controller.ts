import type { Request, Response } from "express";
﻿import {
  getStorageBackend,
  resolvePublicFileUrl,
  storeUpload,
  UPLOAD_CATEGORIES,
  type UploadCategory,
} from "@/lib/file-storage";
import { badRequest } from "@/lib/route-errors";

function parseCategory(raw: unknown): UploadCategory {
  if (typeof raw !== "string" || !raw) return "misc";
  const c = raw.toLowerCase();
  return UPLOAD_CATEGORIES.includes(c as UploadCategory) ? (c as UploadCategory) : "misc";
}

/**
 * POST /api/upload?category=bugs|apk|inventory|avatars|reports|misc
 * Body: multipart field "file"
 */
export async function postUpload(req: Request, res: Response) {
  if (!req.file) {
    badRequest('No file was uploaded. Choose a file and use the field name "file".', "file");
  }

  const category = parseCategory(req.query.category);
  const stored = await storeUpload(
    req.file!.buffer,
    req.file!.originalname,
    req.file!.mimetype,
    category,
  );

  const fileUrl = resolvePublicFileUrl(stored.url, req) ?? stored.url;

  res.status(200).json({
    message: "File uploaded successfully",
    url: fileUrl,
    storage: stored.storage,
    backend: getStorageBackend(),
    category,
    key: stored.key,
    originalName: req.file!.originalname,
    mimetype: req.file!.mimetype,
    size: req.file!.size,
  });
}

