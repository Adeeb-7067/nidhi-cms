import { apiUrl } from "@/lib/api-base";

const CHAT_FILE_MAX_MB = 10;

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

export function isChatAttachmentFile(file: File): boolean {
  return isChatImageFile(file) || isChatPdfFile(file);
}

export async function uploadChatAttachment(file: File): Promise<ChatFileUploadResult> {
  if (!isChatAttachmentFile(file)) {
    throw new Error("Only image or PDF files are allowed.");
  }
  if (file.size > CHAT_FILE_MAX_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum size is ${CHAT_FILE_MAX_MB} MB.`);
  }

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/upload?category=misc"), true);
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
