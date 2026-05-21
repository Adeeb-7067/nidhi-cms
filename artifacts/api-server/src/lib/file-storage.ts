import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import type { Request } from "express";
import {
  assertValidStoredFileUrl,
  isObjectStorageEnabled,
  uploadBufferToObjectStorage,
  uploadLocalFileToObjectStorage,
  UPLOAD_CATEGORIES,
  type UploadCategory,
} from "./object-storage";

export { UPLOAD_CATEGORIES, type UploadCategory, isObjectStorageEnabled };

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export type StorageBackend = "object" | "local";

export function getStorageBackend(): StorageBackend {
  return isObjectStorageEnabled() ? "object" : "local";
}

export function ensureLocalUploadDir(): void {
  if (!fsSync.existsSync(UPLOAD_DIR)) {
    fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function localFilename(originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
}

/**
 * Store an uploaded file (multipart buffer). Uses the object bucket when configured.
 */
export async function storeUpload(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  category: UploadCategory = "misc",
): Promise<{ url: string; key: string; storage: StorageBackend }> {
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

/**
 * Store a server-generated file (PDF/XLSX). Writes to temp disk, then uploads to bucket.
 */
export async function storeGeneratedFile(
  localPath: string,
  originalName: string,
  mimetype: string,
  category: UploadCategory = "reports",
): Promise<{ url: string; key: string; storage: StorageBackend }> {
  if (isObjectStorageEnabled()) {
    const { url, key } = await uploadLocalFileToObjectStorage(localPath, originalName, mimetype, category);
    return { url, key, storage: "object" };
  }

  const filename = path.basename(localPath);
  return { url: `/uploads/${filename}`, key: filename, storage: "local" };
}

/** Turn relative /uploads/... paths into absolute URLs for API responses. */
export function resolvePublicFileUrl(storedUrl: string | null | undefined, req?: Request): string | null {
  if (!storedUrl) return null;
  if (/^https?:\/\//i.test(storedUrl)) return storedUrl;
  if (storedUrl.startsWith("/uploads/") && req) {
    return `${req.protocol}://${req.get("host")}${storedUrl}`;
  }
  return storedUrl;
}

/** Validate URLs persisted on entities (bugs, APK, inventory, avatars, tickets). */
export function validateStoredFileUrl(
  url: string | null | undefined,
  fieldName = "fileUrl",
): void {
  assertValidStoredFileUrl(url, fieldName);
}

export function validateStoredFileUrls(
  urls: string[] | null | undefined,
  fieldName = "attachments",
): void {
  if (!urls?.length) return;
  for (const url of urls) {
    assertValidStoredFileUrl(url, fieldName);
  }
}
