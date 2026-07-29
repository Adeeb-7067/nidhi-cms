import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { S3Client, PutObjectCommand, PutObjectAclCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger.js";
import { HttpError } from "./http-error.js";
const UPLOAD_CATEGORIES = [
  "bugs",
  "apk",
  "inventory",
  "avatars",
  "reports",
  "misc",
  "hrm",
  "screenshots",
  "marketing",
  "admin",
  "ca",
];
// Screenshots are access-controlled via backend proxy — never serve directly from S3.
const PRIVATE_CATEGORIES = new Set(["screenshots"]);
/** Default object-key prefix when BUCKET_FOLDER_PATH is missing/empty (shared-bucket isolation). */
const DEFAULT_BUCKET_FOLDER_PREFIX = "ClientManagement-CMS/";

function normalizeFolderPrefix(raw) {
  const base = (raw ?? DEFAULT_BUCKET_FOLDER_PREFIX).trim().replace(/^\/+/, "");
  // Empty/root prefixes would scope list/delete to the entire shared bucket — never allow that.
  if (!base || base === "/") return DEFAULT_BUCKET_FOLDER_PREFIX;
  return base.endsWith("/") ? base : `${base}/`;
}

/** CMS folder prefix for this deployment (`BUCKET_FOLDER_PATH`). */
function getBucketFolderPrefix() {
  return normalizeFolderPrefix(process.env.BUCKET_FOLDER_PATH);
}

/**
 * Whether `key` is inside the CMS folder on a possibly shared bucket.
 * Rejects other project prefixes and `..` path segments.
 */
function isCmsObjectKey(key) {
  if (!key || typeof key !== "string") return false;
  const normalized = key.replace(/^\/+/, "");
  if (!normalized || normalized.includes("\\") || normalized.split("/").includes("..")) {
    return false;
  }
  return normalized.startsWith(getBucketFolderPrefix());
}

/** Bucket-relative key from a public URL, `/uploads/...` path, or raw object key. */
function objectKeyFromStoredRef(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== "string") return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const pathname = new URL(trimmed).pathname.slice(1);
      try {
        return decodeURIComponent(pathname);
      } catch {
        return pathname;
      }
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("/uploads/")) return trimmed.slice("/uploads/".length);
  if (!trimmed.includes("://") && !trimmed.startsWith("/")) return trimmed.replace(/^\/+/, "");
  return null;
}

function sanitizeFilename(name) {
  const ext = path.extname(name).replace(/[^a-zA-Z0-9.]/g, "");
  const base = path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${base || "file"}${ext}`;
}
function normalizeCategory(category) {
  if (!category) return "";
  const safe = category.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!UPLOAD_CATEGORIES.includes(safe)) return "";
  return `${safe}/`;
}
function isObjectStorageEnabled() {
  return Boolean(
    process.env.LINODE_OBJECT_BUCKET && process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID && process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY && process.env.LINODE_OBJECT_STORAGE_ENDPOINT
  );
}
// Singleton S3 client — avoid building a new client on every upload/read.
let _s3Client = null;
function getS3Client() {
  if (!_s3Client) {
    const region = process.env.LINODE_OBJECT_STORAGE_REGION || "sgp1";
    const endpoint = process.env.LINODE_OBJECT_STORAGE_ENDPOINT.replace(/\/$/, "");
    _s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3Client;
}
function getPublicUrl(objectKey) {
  const bucket = process.env.LINODE_OBJECT_BUCKET;
  const region = process.env.LINODE_OBJECT_STORAGE_REGION || "sgp1";
  if (process.env.OBJECT_STORAGE_PUBLIC_URL) {
    return `${process.env.OBJECT_STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`;
  }
  return `https://${bucket}.${region}.digitaloceanspaces.com/${objectKey}`;
}
function buildObjectKey(originalName, category) {
  const prefix = getBucketFolderPrefix();
  const categoryPath = normalizeCategory(category);
  return `${prefix}${categoryPath}${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFilename(originalName)}`;
}
function assertValidStoredFileUrl(url, fieldName = "fileUrl") {
  if (!url) return;
  if (!isObjectStorageEnabled()) return;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new HttpError(
      400,
      `${fieldName} must be a public HTTPS URL from Upload. Use POST /api/upload first, then paste the returned URL.`,
      { code: "INVALID_FILE_URL", field: fieldName }
    );
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(trimmed)) {
    throw new HttpError(
      400,
      `${fieldName} cannot use localhost when cloud storage is enabled. Upload the file and use the public URL.`,
      { code: "INVALID_FILE_URL", field: fieldName }
    );
  }
}
async function uploadBufferToObjectStorage(buffer, originalName, mimetype, category) {
  const key = buildObjectKey(originalName, category);
  const client = getS3Client();
  const isPrivate = PRIVATE_CATEGORIES.has(category);
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.LINODE_OBJECT_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype || "application/octet-stream",
      ACL: isPrivate ? "private" : "public-read",
      CacheControl: isPrivate ? "no-store" : "public, max-age=31536000, immutable",
    })
  );
  const url = getPublicUrl(key);
  logger.info({ key, bytes: buffer.length, category: category ?? "misc" }, "Uploaded to object storage");
  return { url, key };
}
async function uploadToObjectStorage(buffer, originalName, mimetype, category) {
  return uploadBufferToObjectStorage(buffer, originalName, mimetype, category);
}
/**
 * Presigned direct-to-bucket PUT — the browser uploads straight to object storage,
 * bypassing nginx/Node entirely for the file bytes (avoids proxy body-size/timeout
 * limits for large files like APKs). ACL is set afterward via finalizeObjectUpload,
 * not baked into the presigned request, so the client only needs to match the
 * Content-Type header — no custom x-amz-* headers required on the PUT itself.
 */
async function createPresignedUploadUrl(originalName, mimetype, category, expiresInSeconds = 900) {
  const key = buildObjectKey(originalName, category);
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: process.env.LINODE_OBJECT_BUCKET,
    Key: key,
    ContentType: mimetype || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { uploadUrl, key, url: getPublicUrl(key) };
}

/** Confirm a direct-to-bucket upload actually landed, then set its final ACL. */
async function finalizeObjectUpload(key, category) {
  if (!isCmsObjectKey(key)) {
    throw new HttpError(400, "Upload key is outside the CMS storage folder.", {
      code: "INVALID_UPLOAD_KEY",
      field: "key",
    });
  }
  const client = getS3Client();
  const bucket = process.env.LINODE_OBJECT_BUCKET;
  let head;
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    throw new HttpError(400, "Upload not found in storage yet — the direct upload may not have completed.", {
      code: "UPLOAD_NOT_FOUND",
      field: "key",
    });
  }
  const isPrivate = PRIVATE_CATEGORIES.has(category);
  await client.send(
    new PutObjectAclCommand({
      Bucket: bucket,
      Key: key,
      ACL: isPrivate ? "private" : "public-read",
    })
  );
  return { url: getPublicUrl(key), size: head.ContentLength ?? 0, mimetype: head.ContentType ?? null };
}

async function uploadLocalFileToObjectStorage(localPath, originalName, mimetype, category) {
  const buffer = await fs.readFile(localPath);
  const result = await uploadBufferToObjectStorage(buffer, originalName, mimetype, category);
  try {
    await fs.unlink(localPath);
  } catch (err) {
    logger.warn({ err, localPath }, "Uploaded to object storage but failed to remove local temp file");
  }
  return result;
}
export {
  GetObjectCommand,
  UPLOAD_CATEGORIES,
  assertValidStoredFileUrl,
  buildObjectKey,
  createPresignedUploadUrl,
  finalizeObjectUpload,
  getBucketFolderPrefix,
  getPublicUrl,
  getS3Client,
  isCmsObjectKey,
  isObjectStorageEnabled,
  objectKeyFromStoredRef,
  uploadBufferToObjectStorage,
  uploadLocalFileToObjectStorage,
  uploadToObjectStorage
};
