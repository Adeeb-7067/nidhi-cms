/**
 * Downscale + re-encode an oversized image client-side before upload. Only touches
 * raster formats where a resize is safe (JPEG/PNG/WebP) — SVG (vector) and GIF
 * (animation would be lost on canvas redraw) pass through untouched. Small files
 * are also left alone since there's nothing meaningful to save.
 */

const MAX_DIMENSION_PX = 1920;
const JPEG_QUALITY = 0.82;
const SKIP_BELOW_BYTES = 300 * 1024;

const RESIZABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image for compression"));
    img.src = url;
  });
}

/** Returns the original file unchanged if compression doesn't apply or doesn't help. */
export async function compressImageFile(file: File): Promise<File> {
  if (!RESIZABLE_TYPES.has(file.type) || file.size < SKIP_BELOW_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale >= 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? JPEG_QUALITY : undefined),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
