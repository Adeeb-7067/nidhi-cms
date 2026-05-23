import React, { useState } from "react";
import type { BugAttachment } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, FileText, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

function isImage(att: BugAttachment) {
  if (att.mimeType?.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(att.url);
}

function isVideo(att: BugAttachment) {
  if (att.mimeType?.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(att.url);
}

function isPdf(att: BugAttachment) {
  if (att.mimeType === "application/pdf") return true;
  return /\.pdf(\?|$)/i.test(att.url);
}

export function BugAttachmentsGallery({
  attachments,
  compact = false,
  className,
}: {
  attachments?: BugAttachment[] | null;
  compact?: boolean;
  className?: string;
}) {
  const [preview, setPreview] = useState<BugAttachment | null>(null);
  const list =
    attachments && attachments.length > 0
      ? attachments
      : [];

  if (list.length === 0) {
    return compact ? null : (
      <p className="text-xs text-muted-foreground">No files attached</p>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3",
          className,
        )}
      >
        {list.map((att, i) => (
          <button
            key={`${att.url}-${i}`}
            type="button"
            onClick={() => setPreview(att)}
            className="group relative overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-sm transition hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isImage(att) ? (
              <img
                src={att.url}
                alt={att.name ?? "Attachment"}
                className={cn("w-full object-cover", compact ? "h-14" : "h-28")}
              />
            ) : isVideo(att) ? (
              <div
                className={cn(
                  "flex w-full items-center justify-center bg-zinc-900/80 text-white",
                  compact ? "h-14" : "h-28",
                )}
              >
                <Play className="h-6 w-6 opacity-80" />
              </div>
            ) : (
              <div
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1 p-2 text-muted-foreground",
                  compact ? "h-14" : "h-28",
                )}
              >
                <FileText className="h-5 w-5" />
                <span className="text-[9px] truncate max-w-full px-1">
                  {att.name ?? (isPdf(att) ? "PDF" : "File")}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border">
          {preview && (
            <div className="relative">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
                onClick={() => setPreview(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              {isImage(preview) && (
                <img
                  src={preview.url}
                  alt={preview.name ?? "Preview"}
                  className="max-h-[80vh] w-full object-contain bg-zinc-950"
                />
              )}
              {isVideo(preview) && (
                <video src={preview.url} controls className="max-h-[80vh] w-full bg-black" />
              )}
              {!isImage(preview) && !isVideo(preview) && (
                <div className="flex flex-col items-center gap-4 p-10">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm font-medium">{preview.name ?? "Document"}</p>
                  <Button asChild variant="outline" size="sm">
                    <a href={preview.url} target="_blank" rel="noreferrer" download>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </a>
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border px-4 py-2">
                <span className="text-xs text-muted-foreground truncate">{preview.name ?? preview.url}</span>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <a href={preview.url} target="_blank" rel="noreferrer" download>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tiny preview for table cells */
export function BugAttachmentThumb({ attachments }: { attachments?: BugAttachment[] | null }) {
  const first = attachments?.[0];
  if (!first) return <span className="text-[10px] text-muted-foreground">—</span>;
  if (isImage(first)) {
    return (
      <img
        src={first.url}
        alt=""
        className="h-8 w-12 rounded-md object-cover border border-border/50 shadow-sm"
      />
    );
  }
  return (
    <span className="inline-flex h-8 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <FileText className="h-3.5 w-3.5" />
    </span>
  );
}
