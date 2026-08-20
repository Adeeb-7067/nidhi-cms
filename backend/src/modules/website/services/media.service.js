import path from "path";
import { createPresignedUploadUrl } from "../../../lib/object-storage.js";
import { websiteMediaTable } from "../schema/WebsiteMedia.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Validates request and requests a DigitalOcean Spaces pre-signed PUT URL.
 */
export async function generatePresignedMediaUploadUrl({ fileName, fileType, fileSize, userId }) {
  if (!ALLOWED_MIME_TYPES.has(fileType)) {
    throw new Error(`File type '${fileType}' is not supported.`);
  }

  const isVideo = fileType.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

  if (fileSize > maxSize) {
    throw new Error(
      `File size exceeds maximum limit of ${maxSize / (1024 * 1024)} MB for ${
        isVideo ? "video" : "image"
      } uploads.`
    );
  }

  const extension = path.extname(fileName) || ".bin";
  const sanitizedBase = path.basename(fileName, extension).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueName = `${sanitizedBase}_${Date.now()}${extension}`;

  // Request pre-signed URL under the 'marketing' category in DO Spaces
  const result = await createPresignedUploadUrl(uniqueName, fileType, "marketing");

  return {
    uploadUrl: result.uploadUrl,
    fileKey: result.key,
    publicUrl: result.url,
  };
}

/**
 * Confirms a successful upload and saves metadata to WebsiteMedia collection.
 */
export async function confirmMediaUpload({
  filename,
  originalName,
  mimeType,
  sizeBytes,
  url,
  key,
  dimensions = null,
  altText = "",
  userId,
}) {
  return websiteMediaTable.findOneAndUpdate(
    { key },
    {
      filename,
      originalName,
      mimeType,
      sizeBytes,
      url,
      key,
      dimensions,
      altText,
      createdBy: userId,
    },
    { upsert: true, new: true }
  );
}
