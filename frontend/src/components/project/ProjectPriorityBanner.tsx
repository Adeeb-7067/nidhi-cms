import { AlertTriangle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectPriorityBannerProps = {
  priority: string;
  className?: string;
};

export function ProjectPriorityBanner({ priority, className }: ProjectPriorityBannerProps) {
  const p = priority?.toLowerCase();
  if (p !== "high" && p !== "critical") return null;

  const isCritical = p === "critical";

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        isCritical
          ? "border-red-500/40 bg-gradient-to-r from-red-500/15 via-red-500/10 to-orange-500/10"
          : "border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-amber-500/5",
        className,
      )}
    >
      {isCritical ? (
        <Flame className="h-5 w-5 shrink-0 text-red-500 animate-pulse" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
      )}
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold",
            isCritical ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400",
          )}
        >
          {isCritical ? "Critical priority project" : "High priority project"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isCritical
            ? "This project needs immediate attention. Prioritize deadlines, staffing, and blockers."
            : "This project is marked high priority. Keep milestones and team capacity aligned."}
        </p>
      </div>
    </div>
  );
}
