import type { ReactNode } from "react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTableSkeleton } from "@/components/loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PortalEmptyState, PortalSectionMeta } from "@/components/layout/portal-page-kit";
import { PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import {
  HrmPageShell,
  HrmPageHeader,
  HrmPageHero,
  HrmBreadcrumbs,
  HrmKpiGrid,
  HrmKpiCard,
  HrmChartCard,
  HrmChartGridCell,
  HrmChartEmptyState,
  HrmSectionLabel,
  HrmFilterBar,
  HrmFilterRow,
  HrmInsightBanner,
  HrmPipelineStrip,
  HrmTabsList,
  HrmTabsTrigger,
  HrmContentCard,
  hrmActionButtonClass,
  portalActionButtonClass,
  type HrmKpiItem,
} from "./hrm-ui-kit";
export {
  HrmRefPageHeader,
  HrmRefRefreshButton,
  HrmRefStatStrip,
  HrmRefMasterDetail,
  HrmRefListItemContent,
  HrmRefDetailHeader,
  HrmRefDetailSection,
  HrmRefDetailRow,
  HrmRefStatusPill,
  HrmRefEmptyState,
  HrmRefPdfPanel,
  hrmRefCountSubtitle,
  hrmKpiToRefStats,
} from "./hrm-reference-kit";
export {
  HrmDetailDrawer,
  HrmDetailSection,
  HrmDetailRow,
  HrmPersonChip,
  HrmRatingStars,
  HrmTrendRangeSelect,
  HrmDataExplorerCard,
  HrmDrawerCloseButton,
  sliceTrendByDays,
  type HrmTrendDays,
} from "./rich-ui-kit";
import { ATTENDANCE_STATUS_LABELS, LEAVE_STATUS_LABELS, normalizeAttendanceStatus } from "./constants";

export {
  HrmPageShell,
  HrmPageHeader,
  HrmPageHero,
  HrmBreadcrumbs,
  HrmKpiGrid,
  HrmKpiCard,
  HrmChartCard,
  HrmChartGridCell,
  HrmChartEmptyState,
  HrmSectionLabel,
  HrmFilterBar,
  HrmFilterRow,
  HrmInsightBanner,
  HrmPipelineStrip,
  HrmTabsList,
  HrmTabsTrigger,
  HrmContentCard,
  hrmActionButtonClass,
  portalActionButtonClass,
  type HrmKpiItem,
};

/** @deprecated Use HrmKpiGrid */
export const PortalKpiGrid = HrmKpiGrid;
export type PortalKpiItem = HrmKpiItem;

/** @deprecated Use HrmPageHeader */
export function HrmPageHeaderLegacy(props: React.ComponentProps<typeof HrmPageHeader>) {
  return <HrmPageHeader {...props} />;
}

export function HrmToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      {children}
    </div>
  );
}

export function HrmSectionMeta({ label, count }: { label: string; count?: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      {label}
      {count != null ? ` · ${count} record${count === 1 ? "" : "s"}` : ""}
    </p>
  );
}

export function HrmEmptyState(props: React.ComponentProps<typeof PortalEmptyState>) {
  return <PortalEmptyState {...props} />;
}

export function HrmInlineEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <PortalEmptyState icon={Icon} title={title} description={description} />
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}

export function HrmQueryErrorPanel({
  error,
  onRetry,
  title = "Could not load data",
  description,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <HrmInlineEmptyState
      icon={AlertCircle}
      title={title}
      description={description ?? getApiErrorMessage(error, "Please try again or contact support if this persists.")}
      action={
        onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onRetry()}>
            Retry
          </Button>
        ) : undefined
      }
    />
  );
}

export function HrmConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function HrmFormSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="max-w-lg space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function HrmFormCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <HrmContentCard className="max-w-lg">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="border-t border-border/60 pt-2">{footer}</div>}
      </div>
    </HrmContentCard>
  );
}

export function HrmField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const WORKFLOW_STATUS_CLASS: Record<string, string> = {
  pending: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  reviewed: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  finalized: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

const ATTENDANCE_STATUS_CLASS: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  onsite: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  late: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  absent: "bg-red-500/10 text-red-600 border-red-500/20",
  wfh: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  on_leave: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  holiday: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  weekend: "bg-muted text-muted-foreground border-border",
  short: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  half_day: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
};

/** Legacy StatusPill style */
export function HrmStatusPill({ status }: { status: string }) {
  return <HrmWorkflowBadge status={status} />;
}

export function HrmWorkflowBadge({ status }: { status: string }) {
  const label = LEAVE_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium capitalize", WORKFLOW_STATUS_CLASS[status] ?? "")}
    >
      {label}
    </Badge>
  );
}

export function HrmAttendanceBadge({ status, suffix }: { status: string; suffix?: string }) {
  const normalized = normalizeAttendanceStatus(status);
  const label = ATTENDANCE_STATUS_LABELS[normalized] ?? ATTENDANCE_STATUS_LABELS[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium", ATTENDANCE_STATUS_CLASS[normalized] ?? ATTENDANCE_STATUS_CLASS[status] ?? "")}
    >
      {label}
      {suffix}
    </Badge>
  );
}

export function HrmApprovalActions({
  onApprove,
  onReject,
  disabled,
  compact,
}: {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex justify-end gap-2", compact && "gap-1")}>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        className="h-7 border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-600 hover:bg-emerald-500/20"
        onClick={onApprove}
      >
        <Check className="mr-1 h-3 w-3" /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        className="h-7 border-red-500/20 bg-red-500/10 text-xs text-red-600 hover:bg-red-500/20"
        onClick={onReject}
      >
        <X className="mr-1 h-3 w-3" /> Reject
      </Button>
    </div>
  );
}

export function HrmKpiSkeleton({ count = 4, columns = 4 }: { count?: number; columns?: 2 | 3 | 4 }) {
  return <PageKpiSkeleton count={count} columns={columns} />;
}

export function HrmQuickLinks({
  links,
}: {
  links: Array<{ label: string; href: string; description?: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
        >
          <p className="text-sm font-medium transition-colors group-hover:text-primary">{link.label}</p>
          {link.description && <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>}
        </Link>
      ))}
    </div>
  );
}
