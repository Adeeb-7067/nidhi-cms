import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "./logger";
import { HttpError } from "./http-error";

export const UPLOAD_CATEGORIES = [
  "bugs",
  "apk",
  "inventory",
  "avatars",
  "reports",
  "misc",
] as const;

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

function normalizeFolderPrefix(raw: string | undefined): string {
  const base = (raw ?? "ClientManagement-CMS/").trim().replace(/^\/+/, "");
  return base.endsWith("/") ? base : `${base}/`;
}

function sanitizeFilename(name: string): string {
  const ext = path.extname(name).replace(/[^a-zA-Z0-9.]/g, "");
  const base = path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${base || "file"}${ext}`;
}

function normalizeCategory(category?: string): string {
  if (!category) return "";
  const safe = category.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!UPLOAD_CATEGORIES.includes(safe as UploadCategory)) return "";
  return `${safe}/`;
}

export function isObjectStorageEnabled(): boolean {
  return Boolean(
    process.env.LINODE_OBJECT_BUCKET &&
      process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID &&
      process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY &&
      process.env.LINODE_OBJECT_STORAGE_ENDPOINT,
  );
}

function getS3Client(): S3Client {
  const region = process.env.LINODE_OBJECT_STORAGE_REGION || "sgp1";
  const endpoint = process.env.LINODE_OBJECT_STORAGE_ENDPOINT!.replace(/\/$/, "");

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY!,
    },
  });
}

export function getPublicUrl(objectKey: string): string {
  const bucket = process.env.LINODE_OBJECT_BUCKET!;
  const region = process.env.LINODE_OBJECT_STORAGE_REGION || "sgp1";

  if (process.env.OBJECT_STORAGE_PUBLIC_URL) {
    return `${process.env.OBJECT_STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`;
  }

  return `https://${bucket}.${region}.digitaloceanspaces.com/${objectKey}`;
}

export function buildObjectKey(originalName: string, category?: string): string {
  const prefix = normalizeFolderPrefix(process.env.BUCKET_FOLDER_PATH);
  const categoryPath = normalizeCategory(category);
  return `${prefix}${categoryPath}${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFilename(originalName)}`;
}

/** When cloud storage is on, stored file URLs must be public HTTPS (from bucket). */
export function assertValidStoredFileUrl(
  url: string | null | undefined,
  fieldName = "fileUrl",
): void {
  if (!url) return;
  if (!isObjectStorageEnabled()) return;

  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new HttpError(
      400,
      `${fieldName} must be a public HTTPS URL from Upload. Use POST /api/upload first, then paste the returned URL.`,
      { code: "INVALID_FILE_URL", field: fieldName },
    );
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(trimmed)) {
    throw new HttpError(
      400,
      `${fieldName} cannot use localhost when cloud storage is enabled. Upload the file and use the public URL.`,
      { code: "INVALID_FILE_URL", field: fieldName },
    );
  }
}

export async function uploadBufferToObjectStorage(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  category?: string,
): Promise<{ url: string; key: string }> {
  const key = buildObjectKey(originalName, category);
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.LINODE_OBJECT_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: mimetype || "application/octet-stream",
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const url = getPublicUrl(key);
  logger.info({ key, bytes: buffer.length, category: category ?? "misc" }, "Uploaded to object storage");
  return { url, key };
}

export async function uploadToObjectStorage(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  category?: string,
): Promise<{ url: string; key: string }> {
  return uploadBufferToObjectStorage(buffer, originalName, mimetype, category);
}

/** Read a temp file from disk and upload to the bucket (reports, etc.). */
export async function uploadLocalFileToObjectStorage(
  localPath: string,
  originalName: string,
  mimetype: string,
  category?: string,
): Promise<{ url: string; key: string }> {
  const buffer = await fs.readFile(localPath);
  const result = await uploadBufferToObjectStorage(buffer, originalName, mimetype, category);
  try {
    await fs.unlink(localPath);
  } catch {
    /* ignore cleanup errors */
  }
  return result;
}
