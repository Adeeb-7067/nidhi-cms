import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  assertValidStoredFileUrl,
  getS3Client,
  isObjectStorageEnabled,
  uploadBufferToObjectStorage,
  uploadLocalFileToObjectStorage,
  UPLOAD_CATEGORIES
} from "./object-storage.js";
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
function getStorageBackend() {
  return isObjectStorageEnabled() ? "object" : "local";
}
function ensureLocalUploadDir() {
  if (!fsSync.existsSync(UPLOAD_DIR)) {
    fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}
function localFilename(originalName) {
  const safe = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
}
async function storeUpload(buffer, originalName, mimetype, category = "misc") {
  if (isObjectStorageEnabled()) {
    const { url, key } = await uploadBufferToObjectStorage(buffer, originalName, mimetype, category);
    return { url, key, storage: "object" };
  }
  ensureLocalUploadDir();
  const filename = localFilename(originalName);
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return { url: `/uploads/${filename}`, key: filename, storage: "local" };
}
async function storeGeneratedFile(localPath, originalName, mimetype, category = "reports") {
  if (isObjectStorageEnabled()) {
    const { url, key } = await uploadLocalFileToObjectStorage(localPath, originalName, mimetype, category);
    return { url, key, storage: "object" };
  }
  const filename = path.basename(localPath);
  return { url: `/uploads/${filename}`, key: filename, storage: "local" };
}
/** Delete a file previously returned by storeUpload/storeGeneratedFile — local disk or object storage. */
async function deleteStoredFile(fileUrl) {
  if (!fileUrl) return;
  if (/^https?:\/\//i.test(fileUrl)) {
    if (!isObjectStorageEnabled()) return;
    const key = new URL(fileUrl).pathname.slice(1);
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: process.env.LINODE_OBJECT_BUCKET, Key: key })
    );
  } else if (fileUrl.startsWith("/uploads/")) {
    // Preserve the full subpath after /uploads/ — path.basename would strip subdirectories.
    const relPath = fileUrl.slice("/uploads/".length);
    const filePath = path.join(UPLOAD_DIR, relPath);
    await fs.unlink(filePath);
  }
}
function resolvePublicFileUrl(storedUrl, req) {
  if (!storedUrl) return null;
  if (/^https?:\/\//i.test(storedUrl)) return storedUrl;
  if (storedUrl.startsWith("/uploads/") && req) {
    return `${req.protocol}://${req.get("host")}${storedUrl}`;
  }
  return storedUrl;
}
function validateStoredFileUrl(url, fieldName = "fileUrl") {
  if (!url) return;
  const trimmed = String(url).trim();
  // Existing records may still reference local uploads served by the API.
  if (trimmed.startsWith("/uploads/")) return;
  assertValidStoredFileUrl(trimmed, fieldName);
}
function validateStoredFileUrls(urls, fieldName = "attachments") {
  if (!urls?.length) return;
  for (const url of urls) {
    assertValidStoredFileUrl(url, fieldName);
  }
}
export {
  UPLOAD_CATEGORIES,
  deleteStoredFile,
  ensureLocalUploadDir,
  getStorageBackend,
  isObjectStorageEnabled,
  resolvePublicFileUrl,
  storeGeneratedFile,
  storeUpload,
  validateStoredFileUrl,
  validateStoredFileUrls
};
