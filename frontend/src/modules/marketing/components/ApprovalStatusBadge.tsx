import { CmsStatusChip } from "@/components/cms";
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
    <CmsStatusChip
      label={APPROVAL_STAGE_LABELS[stage]}
      colorClassName={stageStyles[stage]}
      className={className}
    />
  );
}
