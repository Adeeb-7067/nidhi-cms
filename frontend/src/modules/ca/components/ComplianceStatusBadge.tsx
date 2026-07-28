import { CmsStatusChip } from "@/components/cms";
import type { ComplianceTimingStatus } from "../types";
import { COMPLIANCE_TIMING_LABELS } from "../constants";

const styles: Record<ComplianceTimingStatus, string> = {
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  upcoming: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
};

const tones = {
  completed: "success",
  upcoming: "warning",
  overdue: "danger",
} as const;

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
    <CmsStatusChip
      label={COMPLIANCE_TIMING_LABELS[status]}
      tone={tones[status]}
      colorClassName={styles[status]}
      dot={showDot}
      className={className}
    />
  );
}
