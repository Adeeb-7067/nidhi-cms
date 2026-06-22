import { cn } from "@/lib/utils";
import type { RiskLevel } from "../types";
import { RISK_LABELS } from "../constants";
import {
  CASE_STATUS_LABELS,
  VENDOR_DISPUTE_STATUS_LABELS,
  CLIENT_MATTER_STATUS_LABELS,
  NDA_STATUS_LABELS,
  AGREEMENT_STATUS_LABELS,
  NOTICE_STATUS_LABELS,
  COURT_CASE_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
} from "../constants";
import type {
  EmployeeCaseStatus,
  VendorDisputeStatus,
  ClientMatterStatus,
  NdaStatus,
  AgreementStatus,
  NoticeStatus,
  CourtCaseStatus,
  ComplianceStatus,
} from "../types";

type LegalBadgeVariant =
  | "case"
  | "vendorDispute"
  | "clientMatter"
  | "nda"
  | "agreement"
  | "notice"
  | "courtCase"
  | "compliance";

const caseStyles: Record<EmployeeCaseStatus, string> = {
  open: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  under_review: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  mediation: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  closed: "bg-gray-500/10 text-gray-600 border-gray-500/25",
  escalated: "bg-red-500/10 text-red-600 border-red-500/25",
};

const vendorStyles: Record<VendorDisputeStatus, string> = {
  open: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  negotiation: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  arbitration: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  resolved: "bg-green-500/10 text-green-700 border-green-500/25",
  litigation: "bg-red-500/10 text-red-600 border-red-500/25",
};

const clientStyles: Record<ClientMatterStatus, string> = {
  active: "bg-green-500/10 text-green-700 border-green-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  on_hold: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  closed: "bg-gray-500/10 text-gray-600 border-gray-500/25",
};

const ndaStyles: Record<NdaStatus, string> = {
  active: "bg-green-500/10 text-green-700 border-green-500/25",
  expiring_soon: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  expired: "bg-red-500/10 text-red-600 border-red-500/25",
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
};

const agreementStyles: Record<AgreementStatus, string> = {
  active: "bg-green-500/10 text-green-700 border-green-500/25",
  renewal_due: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  expired: "bg-red-500/10 text-red-600 border-red-500/25",
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  terminated: "bg-gray-500/10 text-gray-600 border-gray-500/25",
};

const noticeStyles: Record<NoticeStatus, string> = {
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  sent: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  received: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  responded: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  closed: "bg-green-500/10 text-green-700 border-green-500/25",
};

const courtStyles: Record<CourtCaseStatus, string> = {
  filed: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  listed: "bg-sky-500/10 text-sky-700 border-sky-500/25",
  hearing: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  adjourned: "bg-orange-500/10 text-orange-700 border-orange-500/25",
  judgment: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  closed: "bg-gray-500/10 text-gray-600 border-gray-500/25",
};

const complianceStyles: Record<ComplianceStatus, string> = {
  compliant: "bg-green-500/10 text-green-700 border-green-500/25",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  non_compliant: "bg-red-500/10 text-red-600 border-red-500/25",
  review_pending: "bg-blue-500/10 text-blue-700 border-blue-500/25",
};

export function LegalStatusBadge({
  variant,
  value,
  className,
}: {
  variant: LegalBadgeVariant;
  value: string;
  className?: string;
}) {
  let label = value;
  let style = "bg-secondary text-secondary-foreground";

  if (variant === "case") {
    const v = value as EmployeeCaseStatus;
    label = CASE_STATUS_LABELS[v] ?? value;
    style = caseStyles[v] ?? style;
  } else if (variant === "vendorDispute") {
    const v = value as VendorDisputeStatus;
    label = VENDOR_DISPUTE_STATUS_LABELS[v] ?? value;
    style = vendorStyles[v] ?? style;
  } else if (variant === "clientMatter") {
    const v = value as ClientMatterStatus;
    label = CLIENT_MATTER_STATUS_LABELS[v] ?? value;
    style = clientStyles[v] ?? style;
  } else if (variant === "nda") {
    const v = value as NdaStatus;
    label = NDA_STATUS_LABELS[v] ?? value;
    style = ndaStyles[v] ?? style;
  } else if (variant === "agreement") {
    const v = value as AgreementStatus;
    label = AGREEMENT_STATUS_LABELS[v] ?? value;
    style = agreementStyles[v] ?? style;
  } else if (variant === "notice") {
    const v = value as NoticeStatus;
    label = NOTICE_STATUS_LABELS[v] ?? value;
    style = noticeStyles[v] ?? style;
  } else if (variant === "courtCase") {
    const v = value as CourtCaseStatus;
    label = COURT_CASE_STATUS_LABELS[v] ?? value;
    style = courtStyles[v] ?? style;
  } else if (variant === "compliance") {
    const v = value as ComplianceStatus;
    label = COMPLIANCE_STATUS_LABELS[v] ?? value;
    style = complianceStyles[v] ?? style;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function LegalRiskBadge({
  level,
  showDot = true,
  className,
}: {
  level: RiskLevel;
  showDot?: boolean;
  className?: string;
}) {
  const styles: Record<RiskLevel, string> = {
    low: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    medium: "bg-amber-500/10 text-amber-700 border-amber-500/25",
    high: "bg-red-500/10 text-red-600 border-red-500/25",
  };

  const dotStyles: Record<RiskLevel, string> = {
    low: "bg-emerald-500",
    medium: "bg-amber-500",
    high: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        styles[level],
        className,
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[level])} />}
      {RISK_LABELS[level]}
    </span>
  );
}
