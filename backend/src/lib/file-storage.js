import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  assertValidStoredFileUrl,
  createPresignedUploadUrl,
  finalizeObjectUpload,
  getS3Client,
  isCmsObjectKey,
  isObjectStorageEnabled,
  objectKeyFromStoredRef,
  uploadBufferToObjectStorage,
  uploadLocalFileToObjectStorage,
  UPLOAD_CATEGORIES,
} from "./object-storage.js";
import { logger } from "./logger.js";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
/** Screenshots must not be served by public `/uploads` static — proxy-only. */
const PRIVATE_SCREENSHOTS_DIR = path.join(process.cwd(), "private-uploads", "screenshots");
const PRIVATE_SCREENSHOT_URL_PREFIX = "/private/screenshots/";

function getStorageBackend() {
  return isObjectStorageEnabled() ? "object" : "local";
}

function ensureLocalUploadDir() {
  if (!fsSync.existsSync(UPLOAD_DIR)) {
    fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function ensurePrivateScreenshotsDir() {
  if (!fsSync.existsSync(PRIVATE_SCREENSHOTS_DIR)) {
    fsSync.mkdirSync(PRIVATE_SCREENSHOTS_DIR, { recursive: true });
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
  const filename = localFilename(originalName);
  if (category === "screenshots") {
    ensurePrivateScreenshotsDir();
    const filePath = path.join(PRIVATE_SCREENSHOTS_DIR, filename);
    await fs.writeFile(filePath, buffer);
    return {
      url: `${PRIVATE_SCREENSHOT_URL_PREFIX}${filename}`,
      key: `screenshots/${filename}`,
      storage: "local",
    };
  }
  ensureLocalUploadDir();
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

/**
 * Delete a file previously returned by storeUpload / storeGeneratedFile.
 * Object-storage deletes are confined to BUCKET_FOLDER_PATH (shared-bucket safety).
 */
async function deleteStoredFile(fileUrl) {
  if (!fileUrl) return;

  if (/^https?:\/\//i.test(fileUrl)) {
    if (!isObjectStorageEnabled()) return;

    const key = objectKeyFromStoredRef(fileUrl);
    if (!key) {
      logger.warn({ fileUrl }, "Skipping object delete: could not parse storage key");
      return;
    }
    if (!isCmsObjectKey(key)) {
      logger.error(
        { key, fileUrl },
        "Blocked object delete outside CMS folder (BUCKET_FOLDER_PATH)",
      );
      return;
    }

    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: process.env.LINODE_OBJECT_BUCKET, Key: key }),
    );
    return;
  }

  if (fileUrl.startsWith(PRIVATE_SCREENSHOT_URL_PREFIX)) {
    const relPath = fileUrl.slice(PRIVATE_SCREENSHOT_URL_PREFIX.length);
    await fs.unlink(path.join(PRIVATE_SCREENSHOTS_DIR, relPath));
    return;
  }

  if (fileUrl.startsWith("/uploads/")) {
    // Keep subpaths after /uploads/ — path.basename would drop directories.
    const relPath = fileUrl.slice("/uploads/".length);
    await fs.unlink(path.join(UPLOAD_DIR, relPath));
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
  // Private screenshot paths are served only via the auth'd content proxy.
  if (trimmed.startsWith(PRIVATE_SCREENSHOT_URL_PREFIX)) return;
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
  createPresignedUploadUrl,
  deleteStoredFile,
  ensureLocalUploadDir,
  finalizeObjectUpload,
  getStorageBackend,
  isObjectStorageEnabled,
  resolvePublicFileUrl,
  storeGeneratedFile,
  storeUpload,
  validateStoredFileUrl,
  validateStoredFileUrls,
};
