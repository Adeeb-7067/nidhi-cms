import { cn } from "@/lib/utils";
import type { MarketingPlatform } from "../types";
import { PLATFORM_LABELS } from "../constants";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Globe, Link2 } from "lucide-react";

const platformIcons: Record<MarketingPlatform, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  google: Globe,
  website: Link2,
};

const platformColors: Record<MarketingPlatform, string> = {
  facebook: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  instagram: "bg-pink-500/10 text-pink-700 border-pink-500/25",
  linkedin: "bg-sky-500/10 text-sky-700 border-sky-500/25",
  twitter: "bg-gray-500/10 text-gray-700 border-gray-500/25",
  youtube: "bg-red-500/10 text-red-600 border-red-500/25",
  google: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  website: "bg-indigo-500/10 text-indigo-700 border-indigo-500/25",
};

export function PlatformIconBadge({
  platform,
  showLabel = true,
  className,
}: {
  platform: MarketingPlatform;
  showLabel?: boolean;
  className?: string;
}) {
  const Icon = platformIcons[platform] ?? Globe;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        platformColors[platform] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && (PLATFORM_LABELS[platform] ?? platform)}
    </span>
  );
}
