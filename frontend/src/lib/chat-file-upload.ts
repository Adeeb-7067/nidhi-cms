import { apiUrl } from "@/lib/api-base";
import type { UploadCategory } from "@/components/ui/file-uploader";
import { compressImageFile } from "@/lib/image-compression";

const CHAT_FILE_MAX_MB = 10;
const CHAT_VOICE_MAX_MB = 10;
const CHAT_APK_MAX_MB = 500;

export type ChatFileUploadResult = {
  url: string;
  originalName: string;
  mimetype: string;
};

export function isChatImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isChatPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}

export function isChatApkFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".apk")) return true;
  const type = file.type.toLowerCase();
  return (
    type === "application/vnd.android.package-archive" ||
    (type === "application/octet-stream" && name.endsWith(".apk"))
  );
}

export function isChatAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || /\.(webm|ogg|mp3|m4a|wav)$/i.test(file.name);
}

export function isChatAttachmentFile(file: File, options?: { allowApk?: boolean }): boolean {
  return (
    isChatImageFile(file) ||
    isChatPdfFile(file) ||
    isChatAudioFile(file) ||
    (options?.allowApk === true && isChatApkFile(file))
  );
}

export function uploadCategoryForChatFile(file: File): UploadCategory {
  return isChatApkFile(file) ? "apk" : "misc";
}

export function isChatVoiceAttachment(mimeType?: string | null, name?: string | null): boolean {
  if (mimeType?.startsWith("audio/")) return true;
  return /\.(webm|ogg|mp3|m4a|wav)$/i.test(name ?? "");
}

export async function uploadChatAttachment(
  file: File,
  options?: { allowApk?: boolean },
): Promise<ChatFileUploadResult> {
  if (!isChatAttachmentFile(file, options)) {
    throw new Error(
      options?.allowApk
        ? "Only image, PDF, APK, or voice files are allowed."
        : "Only image, PDF, or voice files are allowed.",
    );
  }
  const category = uploadCategoryForChatFile(file);
  const maxMb = isChatApkFile(file)
    ? CHAT_APK_MAX_MB
    : isChatAudioFile(file)
      ? CHAT_VOICE_MAX_MB
      : CHAT_FILE_MAX_MB;

  const uploadFile = await compressImageFile(file);
  if (uploadFile.size > maxMb * 1024 * 1024) {
    throw new Error(`File is too large. Maximum size is ${maxMb} MB.`);
  }

  const formData = new FormData();
  formData.append("file", uploadFile);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(`/api/upload?category=${encodeURIComponent(category)}`), true);
    const token = localStorage.getItem("accessToken");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            url: string;
            originalName?: string;
            mimetype?: string;
          };
          resolve({
            url: data.url,
            originalName: data.originalName ?? file.name,
            mimetype: data.mimetype ?? file.type,
          });
        } catch {
          reject(new Error("Invalid server response"));
        }
        return;
      }
      try {
        const err = JSON.parse(xhr.responseText) as { message?: string };
        reject(new Error(err.message ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

/** @deprecated Use uploadChatAttachment */
export const uploadChatImage = uploadChatAttachment;
