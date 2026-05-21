import React, { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Loader2, UploadCloud, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Progress } from "./progress";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

/** Maps to POST /api/upload?category=... — stored under bucket subfolders */
export type UploadCategory = "bugs" | "apk" | "inventory" | "avatars" | "reports" | "misc";

interface FileUploaderProps {
  onUploadComplete: (url: string) => void;
  accept?: string;
  label?: string;
  value?: string | null;
  maxSizeMB?: number;
  category?: UploadCategory;
}

export function FileUploader({
  onUploadComplete,
  accept = "*/*",
  label = "Drag & drop or click to upload",
  value = "",
  maxSizeMB = 50,
  category = "misc",
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentFileUrl(value || null);
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation Size Check
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File is too large. Max allowed is ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Perform standard XHR to track progress accurately
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setProgress(Math.max(10, Math.min(pct, 95))); // Caps until finished
        }
      });

      const uploadPromise = new Promise<{ url: string }>((resolve, reject) => {
        const uploadUrl = category
          ? `/api/upload?category=${encodeURIComponent(category)}`
          : "/api/upload";
        xhr.open("POST", uploadUrl, true);
        
        // Forward Authorization Token automatically
        const token = localStorage.getItem("accessToken");
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error("Invalid server response format"));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.message || "Upload failed"));
            } catch (e) {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network error occurred"));
        xhr.send(formData);
      });

      const response = await uploadPromise;
      
      setProgress(100);
      setCurrentFileUrl(response.url);
      onUploadComplete(response.url);
      toast.success("File uploaded successfully!");
    } catch (err: any) {
      toastApiError(err, "Failed to upload file.");
      console.error("Uploader failure:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentFileUrl(null);
    onUploadComplete("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept={accept}
      />

      {!currentFileUrl ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 cursor-pointer hover:bg-muted/20 transition-all flex flex-col items-center justify-center gap-2 ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
        >
          {isUploading ? (
            <div className="w-full space-y-2 text-center flex flex-col items-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground">Uploading your file... {progress}%</p>
              <Progress value={progress} className="h-1 w-[60%]" />
            </div>
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-muted-foreground opacity-60" />
              <div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Max {maxSizeMB}MB</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg p-2.5 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-foreground">File Attached Successfully</p>
              <a 
                href={currentFileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[9px] text-blue-500 hover:underline truncate block"
              >
                View Uploaded Item
              </a>
            </div>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={clearSelection} 
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive shrink-0 ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
