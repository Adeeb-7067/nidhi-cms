import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import type { Column } from "@/components/ui/advanced-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HrmApprovalActions, HrmWorkflowBadge } from "@/modules/hrm/components";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { formatLeaveDayPartLabel } from "@/modules/hrm/leave-form-utils";
import type { HrmHoliday, HrmLeaveBalance, HrmLeaveRequest, HrmWfhRequest, HrmExitRequest } from "@/modules/hrm/types";
import { getLeaveBalanceAvailable, getLeaveBalanceCarriedForward } from "@/modules/hrm/employee-profile-types";

type LeaveColumnOptions = {
  showEmployee: boolean;
  showActions: boolean;
  canApprove: boolean;
  currentUserId?: number;
  reviewPending?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onCancel?: (id: number) => void;
};

export function buildLeaveRequestColumns(opts: LeaveColumnOptions): Column<HrmLeaveRequest>[] {
  const cols: Column<HrmLeaveRequest>[] = [];
  if (opts.showEmployee) {
    cols.push({
      id: "employee",
      header: "Employee",
      accessorKey: "userName",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <HrmEmployeeAvatar name={r.userName ?? `#${r.userId}`} avatarUrl={r.avatarUrl} className="h-7 w-7" />
          <span className="font-medium">{r.userName ?? `#${r.userId}`}</span>
        </div>
      ),
      exportValue: (r) => r.userName ?? String(r.userId),
    });
  }
  cols.push(
    {
      id: "dates",
      header: "Dates",
      cell: (r) => <span className="text-muted-foreground">{`${r.startDate} → ${r.endDate}`}</span>,
      exportValue: (r) => `${r.startDate} → ${r.endDate}`,
    },
    {
      id: "duration",
      header: "Duration",
      cell: (r) => <span className="text-muted-foreground text-xs">{formatLeaveDayPartLabel(r.dayPart)}</span>,
      exportValue: (r) => formatLeaveDayPartLabel(r.dayPart),
    },
    {
      id: "days",
      header: "Days",
      cell: (r) => <span className="tabular-nums">{r.days ?? "—"}</span>,
      exportValue: (r) => (r.days != null ? String(r.days) : ""),
    },
    {
      id: "reason",
      header: "Reason",
      cell: (r) => (
        <span className="block max-w-[200px] truncate text-muted-foreground" title={r.reason ?? undefined}>
          {r.reason || "—"}
        </span>
      ),
      detailCell: (r) => (
        <span className="whitespace-pre-wrap break-words text-muted-foreground">{r.reason || "—"}</span>
      ),
      exportValue: (r) => r.reason ?? "",
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => <HrmWorkflowBadge status={r.status} />,
      exportValue: (r) => r.status,
    },
  );
  if (opts.showActions) {
    cols.push({
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          {opts.canApprove && r.status === "pending" ? (
            <HrmApprovalActions
              disabled={opts.reviewPending}
              onApprove={() => opts.onApprove?.(r.id)}
              onReject={() => opts.onReject?.(r.id)}
            />
          ) : r.status === "pending" && r.userId === opts.currentUserId ? (
            <Button
              variant="outline"
              size="sm"
              disabled={opts.reviewPending}
              onClick={() => opts.onCancel?.(r.id)}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      ),
    });
  }
  return cols;
}

type ExitColumnOptions = {
  canApprove: boolean;
  reviewPending?: boolean;
  onApprove?: (request: HrmExitRequest) => void;
  onReject?: (request: HrmExitRequest) => void;
};

export function buildExitRequestColumns(opts: ExitColumnOptions): Column<HrmExitRequest>[] {
  return [
    {
      id: "employee",
      header: "Employee",
      cell: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <HrmEmployeeAvatar name={r.employeeName} avatarUrl={r.employeeAvatarUrl} className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{r.employeeName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{r.employeeDesignation ?? r.employeeCode ?? "—"}</p>
          </div>
        </div>
      ),
      exportValue: (r) => r.employeeName,
    },
    {
      id: "reason",
      header: "Reason",
      cell: (r) => (
        <span className="block max-w-[180px] truncate text-xs" title={r.reason}>
          {r.reason}
        </span>
      ),
      exportValue: (r) => r.reason,
    },
    {
      id: "resigned",
      header: "Resigned",
      cell: (r) => (
        <span className="text-xs tabular-nums whitespace-nowrap">{format(new Date(r.resignationDate), "MMM d, yyyy")}</span>
      ),
      exportValue: (r) => format(new Date(r.resignationDate), "MMM d, yyyy"),
    },
    {
      id: "lwd",
      header: "Last day",
      cell: (r) => (
        <span className="text-xs tabular-nums whitespace-nowrap">{format(new Date(r.lastWorkingDay), "MMM d, yyyy")}</span>
      ),
      exportValue: (r) => format(new Date(r.lastWorkingDay), "MMM d, yyyy"),
    },
    {
      id: "notice",
      header: "Notice left",
      cell: (r) => <span className="text-xs tabular-nums">{r.noticeDaysRemaining}d</span>,
      exportValue: (r) => `${r.noticeDaysRemaining}d`,
    },
    {
      id: "stage",
      header: "Stage",
      cell: (r) => (
        <span className="text-xs whitespace-nowrap">
          {r.stageLabel} ({r.stage}/{r.stageCount})
        </span>
      ),
      exportValue: (r) => `${r.stageLabel} (${r.stage}/${r.stageCount})`,
    },
    {
      id: "approval",
      header: "Approval",
      cell: (r) => <HrmWorkflowBadge status={r.approvalStatus} />,
      exportValue: (r) => r.approvalStatus,
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          {opts.canApprove && r.approvalStatus === "pending" ? (
            <HrmApprovalActions
              compact
              disabled={opts.reviewPending}
              onApprove={() => opts.onApprove?.(r)}
              onReject={() => opts.onReject?.(r)}
            />
          ) : null}
        </div>
      ),
    },
  ];
}

export function buildLeaveBalanceColumns(): Column<HrmLeaveBalance>[] {
  return [
    {
      id: "type",
      header: "Type",
      cell: (b) => <span className="font-medium">{b.leaveType?.name ?? b.leaveTypeId}</span>,
      exportValue: (b) => b.leaveType?.name ?? String(b.leaveTypeId),
    },
    {
      id: "accrued",
      header: "Accrued",
      cell: (b) => {
        const accrued = (b.allocated ?? 0) + getLeaveBalanceCarriedForward(b);
        return <span className="tabular-nums">{accrued}</span>;
      },
      exportValue: (b) => String((b.allocated ?? 0) + getLeaveBalanceCarriedForward(b)),
    },
    { id: "used", header: "Used", accessorKey: "used" },
    { id: "pending", header: "Pending", accessorKey: "pending" },
    {
      id: "available",
      header: "Available",
      cell: (b) => <span className="font-medium tabular-nums">{getLeaveBalanceAvailable(b)}</span>,
      exportValue: (b) => String(getLeaveBalanceAvailable(b)),
    },
  ];
}

type WfhColumnOptions = {
  showEmployee: boolean;
  showActions: boolean;
  canApprove: boolean;
  currentUserId?: number;
  reviewPending?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onCancel?: (id: number) => void;
};

export function buildWfhRequestColumns(opts: WfhColumnOptions): Column<HrmWfhRequest>[] {
  const cols: Column<HrmWfhRequest>[] = [];
  if (opts.showEmployee) {
    cols.push({
      id: "employee",
      header: "Employee",
      accessorKey: "userName",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <HrmEmployeeAvatar name={r.userName ?? `#${r.userId}`} avatarUrl={r.avatarUrl} className="h-7 w-7" />
          <span className="font-medium">{r.userName ?? `#${r.userId}`}</span>
        </div>
      ),
      exportValue: (r) => r.userName ?? String(r.userId),
    });
  }
  cols.push(
    {
      id: "date",
      header: "Date",
      cell: (r) => (
        <span className="text-muted-foreground">
          {r.startDate}
          {r.endDate !== r.startDate ? ` – ${r.endDate}` : ""}
        </span>
      ),
      exportValue: (r) =>
        r.endDate !== r.startDate ? `${r.startDate} – ${r.endDate}` : r.startDate,
    },
    {
      id: "days",
      header: "Days",
      cell: (r) => <span className="tabular-nums">{r.days ?? "—"}</span>,
      exportValue: (r) => (r.days != null ? String(r.days) : ""),
    },
    {
      id: "reason",
      header: "Reason",
      cell: (r) => (
        <span className="block max-w-[200px] truncate text-muted-foreground" title={r.reason ?? undefined}>
          {r.reason || "—"}
        </span>
      ),
      detailCell: (r) => (
        <span className="whitespace-pre-wrap break-words text-muted-foreground">{r.reason || "—"}</span>
      ),
      exportValue: (r) => r.reason ?? "",
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => <HrmWorkflowBadge status={r.status} />,
      exportValue: (r) => r.status,
    },
  );
  if (opts.showActions) {
    cols.push({
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          {opts.canApprove && r.status === "pending" ? (
            <HrmApprovalActions
              disabled={opts.reviewPending}
              onApprove={() => opts.onApprove?.(r.id)}
              onReject={() => opts.onReject?.(r.id)}
            />
          ) : r.status === "pending" && r.userId === opts.currentUserId ? (
            <Button
              variant="outline"
              size="sm"
              disabled={opts.reviewPending}
              onClick={() => opts.onCancel?.(r.id)}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      ),
    });
  }
  return cols;
}

export function buildHolidayColumns(): Column<HrmHoliday>[] {
  return [
    { id: "date", header: "Date", accessorKey: "date", cell: (h) => <span className="font-medium">{h.date}</span> },
    { id: "name", header: "Name", accessorKey: "name" },
    {
      id: "type",
      header: "Type",
      cell: (h) => (
        <Badge variant="outline" className="text-[10px] capitalize">
          {h.type}
        </Badge>
      ),
      exportValue: (h) => h.type,
    },
  ];
}

export const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700",
  approved: "bg-green-500/10 text-green-700",
  rejected: "bg-red-500/10 text-red-700",
};

export function formatAuditWhen(createdAt?: string | null) {
  return createdAt ? format(new Date(createdAt), "MMM d, yyyy HH:mm") : "—";
}

export function documentFileLink(url: string) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      Open <ExternalLink className="h-3 w-3" />
    </a>
  );
}
