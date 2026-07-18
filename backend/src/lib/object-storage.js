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
];
// Screenshots are access-controlled via backend proxy — never serve directly from S3.
const PRIVATE_CATEGORIES = new Set(["screenshots"]);
function normalizeFolderPrefix(raw) {
  const base = (raw ?? "ClientManagement-CMS/").trim().replace(/^\/+/, "");
  return base.endsWith("/") ? base : `${base}/`;
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
  const prefix = normalizeFolderPrefix(process.env.BUCKET_FOLDER_PATH);
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
  getPublicUrl,
  getS3Client,
  isObjectStorageEnabled,
  uploadBufferToObjectStorage,
  uploadLocalFileToObjectStorage,
  uploadToObjectStorage
};
