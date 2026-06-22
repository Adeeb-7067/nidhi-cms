import { FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type DescriptionResourceItem = {
  id?: number;
  name: string;
  fileUrl?: string | null;
  url?: string | null;
  mimeType?: string | null;
};

function isImage(mime?: string | null, href?: string | null) {
  if (mime?.startsWith("image/")) return true;
  return !!href && /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(href);
}

export function ProjectDescriptionResourceList({
  resources,
  className,
  compact,
}: {
  resources: DescriptionResourceItem[];
  className?: string;
  compact?: boolean;
}) {
  if (!resources.length) return null;

  return (
    <section className={cn("space-y-2", className)}>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Project resources
      </h3>
      <div className="space-y-2">
        {resources.map((r) => {
          const href = r.fileUrl || r.url;
          const image = isImage(r.mimeType, href);
          return (
            <div
              key={r.id ?? href ?? r.name}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border/60 bg-muted/10",
                compact ? "p-2" : "p-2.5",
              )}
            >
              {image && href ? (
                <a href={href} target="_blank" rel="noreferrer" className="shrink-0">
                  <img
                    src={href}
                    alt={r.name}
                    className={cn(
                      "rounded-md border object-cover bg-muted",
                      compact ? "h-9 w-9" : "h-11 w-11",
                    )}
                    loading="lazy"
                  />
                </a>
              ) : (
                <FileText className={cn("shrink-0 text-muted-foreground", compact ? "h-4 w-4" : "h-5 w-5")} />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium truncate", compact ? "text-[10px]" : "text-xs")}>{r.name}</p>
              </div>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1 text-primary hover:underline shrink-0",
                    compact ? "text-[10px]" : "text-xs",
                  )}
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
