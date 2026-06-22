import { cn } from "@/lib/utils";
import type { ComplianceTimingStatus } from "../types";
import { COMPLIANCE_TIMING_LABELS } from "../constants";

const styles: Record<ComplianceTimingStatus, string> = {
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  upcoming: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
};

const dotStyles: Record<ComplianceTimingStatus, string> = {
  completed: "bg-emerald-500",
  upcoming: "bg-amber-500",
  overdue: "bg-red-500",
};

export function ComplianceStatusBadge({
  status,
  showDot = true,
  className,
}: {
  status: ComplianceTimingStatus;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        styles[status],
        className,
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[status])} />}
      {COMPLIANCE_TIMING_LABELS[status]}
    </span>
  );
}
