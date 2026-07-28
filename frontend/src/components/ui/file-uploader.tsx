import React, { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Loader2, UploadCloud, CheckCircle2, X } from "lucide-react";
import { Progress } from "./progress";
import { toast } from "sonner";
import { toastUploadError, type ParsedApiError } from "@/lib/api-error";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { compressImageFile } from "@/lib/image-compression";
import { uploadFileWithProgress } from "@/lib/upload-file";
import { cn } from "@/lib/utils";

/** Maps to POST /api/upload?category=... — stored under bucket subfolders */
export type UploadCategory =
  | "bugs"
  | "apk"
  | "inventory"
  | "avatars"
  | "reports"
  | "misc"
  | "hrm"
  | "finance"
  | "marketing"
  | "ca";

export type FileUploaderVariant = "dropzone" | "choose-file";

const CATEGORY_MAX_SIZE_MB: Record<UploadCategory, number> = {
  apk: 500,
  avatars: 5,
  bugs: 50,
  inventory: 50,
  reports: 50,
  misc: 50,
  hrm: 10,
  finance: 10,
  marketing: 100,
  ca: 50,
};

interface FileUploaderProps {
  onUploadComplete: (url: string, meta?: { fileName: string }) => void;
  /** Called when upload fails — use to set react-hook-form field errors. */
  onUploadError?: (error: ParsedApiError) => void;
  accept?: string;
  label?: string;
  value?: string | null;
  maxSizeMB?: number;
  category?: UploadCategory;
  /** choose-file = compact row with "Choose file" + filename (Satyakabir HRM style) */
  variant?: FileUploaderVariant;
  className?: string;
}

export function FileUploader({
  onUploadComplete,
  onUploadError,
  accept = "*/*",
  label = "Drag & drop or click to upload",
  value = "",
  maxSizeMB,
  category = "misc",
  variant = "dropzone",
  className,
}: FileUploaderProps) {
  const limitMb = maxSizeMB ?? CATEGORY_MAX_SIZE_MB[category] ?? 50;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(value || null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const resolved = value?.trim() ? resolveFileUrl(value.trim()) : "";
    setCurrentFileUrl(resolved || null);
    if (!value) setDisplayName(null);
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > limitMb * 1024 * 1024) {
      toast.error(`File is too large. Max allowed is ${limitMb}MB`);
      return;
    }

    setDisplayName(selected.name);
    setUploadError(null);
    setIsUploading(true);
    setProgress(10);

    try {
      const file = category === "apk" ? selected : await compressImageFile(selected);
      const response = await uploadFileWithProgress(file, category, {
        onProgress: (pct) => setProgress(Math.max(10, Math.min(pct, 95))),
      });

      setProgress(100);
      const storedUrl = response.url;
      const displayUrl = response.publicUrl ?? resolveFileUrl(storedUrl) ?? storedUrl;
      setCurrentFileUrl(displayUrl);
      setDisplayName(file.name);
      onUploadComplete(storedUrl, { fileName: file.name });
      setUploadError(null);
      toast.success("File uploaded successfully!");
    } catch (err: unknown) {
      setProgress(0);
      setDisplayName(null);
      setCurrentFileUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const parsed = toastUploadError(err, "Failed to upload file.");
      setUploadError(parsed.message);
      onUploadError?.(parsed);
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentFileUrl(null);
    setDisplayName(null);
    setUploadError(null);
    onUploadComplete("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openPicker = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept={accept}
      />

      {variant === "choose-file" ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={isUploading}
            className={cn(
              "flex w-full min-h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-xs transition-colors",
              "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isUploading && "pointer-events-none opacity-70",
            )}
          >
            <span className="shrink-0 font-semibold text-primary">
              {isUploading ? `Uploading… ${progress}%` : "Choose file"}
            </span>
            <span className="min-w-0 truncate text-muted-foreground">
              {displayName ??
                (currentFileUrl ? currentFileUrl.split("/").pop() ?? "File attached" : "No file chosen")}
            </span>
          </button>
          {isUploading ? <Progress value={progress} className="h-1" /> : null}
          {currentFileUrl ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-[11px] text-primary hover:underline"
              >
                View uploaded file
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : !currentFileUrl ? (
        <div
          onClick={openPicker}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-center transition-all hover:border-primary/50 hover:bg-muted/20",
            isUploading && "pointer-events-none opacity-70",
          )}
        >
          {isUploading ? (
            <div className="flex w-full flex-col items-center space-y-2 py-2 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground">Uploading your file… {progress}%</p>
              <Progress value={progress} className="h-1 w-[60%]" />
            </div>
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-muted-foreground opacity-60" />
              <div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">Max {limitMb}MB</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2.5">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {displayName ?? "File attached"}
              </p>
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[9px] text-blue-500 hover:underline"
              >
                View uploaded item
              </a>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            className="ml-2 h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {uploadError ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
