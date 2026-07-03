import { cn } from "@/lib/utils";
import type { ApprovalStage } from "../types";
import { APPROVAL_STAGE_LABELS } from "../constants";

const stageStyles: Record<ApprovalStage, string> = {
  internal_review: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  client_review: "bg-orange-500/10 text-orange-700 border-orange-500/25",
  revision: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  scheduled: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  published: "bg-green-500/10 text-green-700 border-green-500/25",
};

export function ApprovalStatusBadge({
  stage,
  className,
}: {
  stage: ApprovalStage;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        stageStyles[stage],
        className,
      )}
    >
      {APPROVAL_STAGE_LABELS[stage]}
    </span>
  );
}
