import React, { useRef, useState } from "react";
import { Button } from "./button";
import { Loader2, UploadCloud, X, FileIcon, ImageIcon } from "lucide-react";
import { Progress } from "./progress";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-base";
import { getAccessToken } from "@/lib/auth-storage";
import type { BugAttachment } from "@/api";
import type { UploadCategory } from "./file-uploader";
import { compressImageFile } from "@/lib/image-compression";
import { cn } from "@/lib/utils";

interface MultiFileUploaderProps {
  value?: BugAttachment[];
  onChange: (attachments: BugAttachment[]) => void;
  accept?: string;
  maxSizeMB?: number;
  category?: UploadCategory;
  maxFiles?: number;
  label?: string;
}

function isImageUrl(url: string, mime?: string | null) {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

export function MultiFileUploader({
  value = [],
  onChange,
  accept = "image/*,video/*,.pdf,application/pdf",
  maxSizeMB = 50,
  category = "bugs",
  maxFiles = 8,
  label = "Upload screenshots, videos, or PDFs",
}: MultiFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = (file: File): Promise<BugAttachment> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setProgress(Math.max(10, Math.min(pct, 95)));
        }
      });

      const uploadPath = `/api/upload?category=${encodeURIComponent(category)}`;
      xhr.open("POST", apiUrl(uploadPath), true);
      const token = getAccessToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.url,
              name: file.name,
              mimeType: file.type || null,
            });
          } catch {
            reject(new Error("Invalid upload response"));
          }
        } else {
          reject(new Error("Upload failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(formData);
    });

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = maxFiles - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxSizeMB}MB`);
        return;
      }
    }

    setUploading(true);
    setProgress(12);
    try {
      const uploaded: BugAttachment[] = [];
      for (const file of toUpload) {
        const item = await uploadFile(await compressImageFile(file));
        uploaded.push(item);
      }
      onChange([...value, ...uploaded]);
      toast.success(uploaded.length > 1 ? "Files uploaded" : "File uploaded");
    } catch (err) {
      toastApiError(err, "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={uploading || value.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "w-full rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-left transition-all",
          "hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          (uploading || value.length >= maxFiles) && "pointer-events-none opacity-60",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              Up to {maxFiles} files · {maxSizeMB}MB each
            </p>
          </div>
        </div>
        {uploading && <Progress value={progress} className="mt-3 h-1.5" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {value.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {value.map((file, index) => (
            <li
              key={`${file.url}-${index}`}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-card/80 shadow-sm"
            >
              {isImageUrl(file.url, file.mimeType) ? (
                <img src={file.url} alt={file.name ?? "Attachment"} className="h-20 w-full object-cover" />
              ) : (
                <div className="flex h-20 items-center justify-center gap-2 px-2 text-muted-foreground">
                  {file.mimeType?.startsWith("video/") ? (
                    <FileIcon className="h-5 w-5" />
                  ) : (
                    <ImageIcon className="h-5 w-5" />
                  )}
                  <span className="text-[10px] truncate">{file.name ?? "File"}</span>
                </div>
              )}
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAt(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
