import { Camera } from "lucide-react";
import type { ScreenshotItem } from "@/api/monitoring";
import { hourLabel, screenshotImageUrl } from "@/lib/screenshot-gallery-utils";

export function ScreenshotHourBlock({
  hour,
  items,
  onOpen,
}: {
  hour: number;
  items: ScreenshotItem[];
  onOpen: () => void;
}) {
  const thumbUrl = screenshotImageUrl(items[0]);
  const label = hourLabel(hour);

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${label} · ${items.length} capture${items.length !== 1 ? "s" : ""} · click to view`}
      className="group relative flex flex-col rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-150 text-left w-[160px] shrink-0"
    >
      <div className="relative h-[90px] bg-muted overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-1.5 right-1.5">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            {items.length}
          </span>
        </div>
      </div>

      <div className="px-2.5 py-2">
        <p className="text-[11px] font-semibold text-foreground leading-tight">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {items.length} capture{items.length !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}
