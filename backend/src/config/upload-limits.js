/** Multer accepts up to the largest category limit. */
export const UPLOAD_MAX_BYTES_APK = 500 * 1024 * 1024;
export const UPLOAD_MAX_BYTES_DEFAULT = 50 * 1024 * 1024;

export const UPLOAD_MAX_BYTES = UPLOAD_MAX_BYTES_APK;

export function getUploadMaxBytesForCategory(category) {
  return category === "apk" ? UPLOAD_MAX_BYTES_APK : UPLOAD_MAX_BYTES_DEFAULT;
}
