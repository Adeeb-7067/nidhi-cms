import { CmsStatusChip } from "@/components/cms";
import type { LeadStatus, LeadPriority, ProposalStatus, CustomerStatus, FollowUpStatus, InstallmentStatus, PartialPaymentStatus } from "../types";
import {
  LEAD_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
  CUSTOMER_STATUS_LABELS,
  INSTALLMENT_STATUS_LABELS,
  PARTIAL_PAYMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
} from "../constants";

type BadgeVariant =
  | "lead"
  | "proposal"
  | "customer"
  | "followUp"
  | "priority"
  | "invoice"
  | "payment"
  | "installment"
  | "partialPayment";

const leadStyles: Record<LeadStatus, string> = {
  new: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300",
  contacted: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300",
  follow_up: "bg-orange-500/10 text-orange-700 border-orange-500/25 dark:text-orange-300",
  interested: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
  project_planning: "bg-orange-600/10 text-orange-800 border-orange-600/25 dark:text-orange-300",
  proposal_sent: "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-300",
  approved: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-300",
  converted: "bg-cyan-500/10 text-cyan-700 border-cyan-500/25 dark:text-cyan-300",
  lost: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
  closed_elsewhere: "bg-slate-500/10 text-slate-700 border-slate-500/25 dark:text-slate-300",
};

const proposalStyles: Record<ProposalStatus, string> = {
  draft:         "bg-slate-500/10 text-slate-700 border-slate-500/25",
  sent:          "bg-blue-500/10 text-blue-700 border-blue-500/25",
  seen:          "bg-violet-500/10 text-violet-700 border-violet-500/25",
  revised:       "bg-amber-500/10 text-amber-700 border-amber-500/25",
  approved:      "bg-green-500/10 text-green-700 border-green-500/25",
  declined:      "bg-red-500/10 text-red-600 border-red-500/25",
  counter_offer: "bg-orange-500/10 text-orange-700 border-orange-500/25",
  expired:       "bg-gray-500/10 text-gray-600 border-gray-500/25",
};

const customerStyles: Record<CustomerStatus, string> = {
  active: "bg-green-500/10 text-green-700 border-green-500/25",
  inactive: "bg-gray-500/10 text-gray-600 border-gray-500/25",
  prospect: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  lost: "bg-red-500/10 text-red-600 border-red-500/25",
};

const followUpStyles: Record<FollowUpStatus, string> = {
  scheduled: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  completed: "bg-green-500/10 text-green-700 border-green-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/25",
};

const priorityStyles: Record<LeadPriority, string> = {
  low: "bg-slate-500/10 text-slate-600",
  medium: "bg-amber-500/10 text-amber-700",
  high: "bg-orange-500/10 text-orange-700",
  urgent: "bg-red-500/10 text-red-600",
};

const invoiceStyles: Record<string, string> = {
  paid: "bg-green-500/10 text-green-700 border-green-500/25",
  unpaid: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  partial: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/25",
};

const paymentStyles: Record<string, string> = {
  completed: "bg-green-500/10 text-green-700 border-green-500/25",
  partial: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  failed: "bg-red-500/10 text-red-600 border-red-500/25",
};

const installmentStyles: Record<InstallmentStatus, string> = {
  pending: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  partial: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  paid: "bg-green-500/10 text-green-700 border-green-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
};

const partialPaymentStyles: Record<PartialPaymentStatus, string> = {
  received: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  verified: "bg-green-500/10 text-green-700 border-green-500/25",
  failed: "bg-red-500/10 text-red-600 border-red-500/25",
  refunded: "bg-gray-500/10 text-gray-600 border-gray-500/25",
};

export function SalesStatusBadge({
  variant,
  value,
  className,
}: {
  variant: BadgeVariant;
  value: string;
  className?: string;
}) {
  let label = value;
  let style = "bg-secondary text-secondary-foreground";

  if (variant === "lead") {
    const v = value as LeadStatus;
    label = LEAD_STATUS_LABELS[v] ?? value;
    style = leadStyles[v] ?? style;
  } else if (variant === "proposal") {
    const v = value as ProposalStatus;
    label = PROPOSAL_STATUS_LABELS[v] ?? value;
    style = proposalStyles[v] ?? style;
  } else if (variant === "customer") {
    const v = value as CustomerStatus;
    label = CUSTOMER_STATUS_LABELS[v] ?? value;
    style = customerStyles[v] ?? style;
  } else if (variant === "followUp") {
    const v = value as FollowUpStatus;
    style = followUpStyles[v] ?? style;
    label = value.charAt(0).toUpperCase() + value.slice(1).replace("_", " ");
  } else if (variant === "priority") {
    const v = value as LeadPriority;
    style = priorityStyles[v] ?? style;
    label = value.charAt(0).toUpperCase() + value.slice(1);
  } else if (variant === "invoice") {
    style = invoiceStyles[value] ?? style;
    label = INVOICE_STATUS_LABELS[value as keyof typeof INVOICE_STATUS_LABELS] ?? value;
  } else if (variant === "payment") {
    style = paymentStyles[value] ?? style;
    label = value.charAt(0).toUpperCase() + value.slice(1);
  } else if (variant === "installment") {
    const v = value as InstallmentStatus;
    label = INSTALLMENT_STATUS_LABELS[v] ?? value;
    style = installmentStyles[v] ?? style;
  } else if (variant === "partialPayment") {
    const v = value as PartialPaymentStatus;
    label = PARTIAL_PAYMENT_STATUS_LABELS[v] ?? value;
    style = partialPaymentStyles[v] ?? style;
  }

  return (
    <CmsStatusChip
      label={label}
      colorClassName={style}
      className={className}
    />
  );
}
