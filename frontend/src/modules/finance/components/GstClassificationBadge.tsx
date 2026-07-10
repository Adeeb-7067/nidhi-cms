import { cn } from "@/lib/utils";

export function GstClassificationBadge({
  gstEnabled,
  className,
}: {
  gstEnabled?: boolean | null;
  className?: string;
}) {
  if (gstEnabled === null || gstEnabled === undefined) {
    return (
      <span className={cn("inline-flex text-[10px] rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground", className)}>
        Unknown
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex text-[10px] rounded px-1.5 py-0.5 font-medium shrink-0",
        gstEnabled
          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
          : "bg-slate-500/10 text-slate-700 dark:text-slate-400",
        className,
      )}
    >
      {gstEnabled ? "GST" : "Non-GST"}
    </span>
  );
}
