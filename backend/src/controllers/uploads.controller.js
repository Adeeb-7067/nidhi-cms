import fs from "fs/promises";
import {
  getStorageBackend,
  resolvePublicFileUrl,
  storeGeneratedFile,
  storeUpload,
  UPLOAD_CATEGORIES,
  isObjectStorageEnabled,
} from "../lib/file-storage.js";
import { getUploadMaxBytesForCategory } from "../config/upload-limits.js";
import { badRequest } from "../utils/route-errors.js";
import { HttpError } from "../lib/http-error.js";
function parseCategory(raw) {
  if (typeof raw !== "string" || !raw) return "misc";
  const c = raw.toLowerCase();
  return UPLOAD_CATEGORIES.includes(c) ? c : "misc";
}
async function postUpload(req, res) {
  if (!req.file) {
    badRequest('No file was uploaded. Choose a file and use the field name "file".', "file");
  }
  const category = parseCategory(req.query.category);
  const maxBytes = getUploadMaxBytesForCategory(category);
  const fileSize = req.file.size ?? req.file.buffer?.length ?? 0;
  if (fileSize > maxBytes) {
    if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    badRequest(`File is too large. Maximum size for ${category} uploads is ${maxMb} MB.`, "file");
  }
  let stored;
  try {
    if (req.file.path) {
      stored = await storeGeneratedFile(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        category,
      );
    } else {
      stored = await storeUpload(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        category,
      );
    }
  } catch (err) {
    if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
    if (err instanceof HttpError) throw err;
    const storageHint = isObjectStorageEnabled()
      ? "Cloud storage upload failed. Check object storage credentials and bucket permissions."
      : "Could not save the uploaded file. Check that the uploads folder is writable.";
    throw new HttpError(500, storageHint, { code: "UPLOAD_FAILED", field: "file" });
  }
  const publicUrl = resolvePublicFileUrl(stored.url, req) ?? stored.url;
  res.status(200).json({
    message: "File uploaded successfully",
    url: stored.url,
    publicUrl,
    storage: stored.storage,
    backend: getStorageBackend(),
    category,
    key: stored.key,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
}
export {
  postUpload
};
