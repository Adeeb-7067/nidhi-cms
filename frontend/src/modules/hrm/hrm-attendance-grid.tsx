import { useMemo } from "react";
import { format } from "date-fns";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { HrmAttendanceStatusPill } from "./components";
import { HrmEmployeeAvatar } from "./dashboard-sections";
import { simpleAttendanceStatusLabel } from "./constants";
import type { HrmAttendanceSummary } from "./types";

function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "h:mm a");
  } catch {
    return "—";
  }
}

/** Full-day approved leave — clock times are not meaningful for attendance status. */
export function isFullDayLeaveRow(r: HrmAttendanceSummary): boolean {
  return r.status === "on_leave" && !r.partialLeave;
}

function formatLeaveAwareClockTime(iso: string | null | undefined, r: HrmAttendanceSummary): string {
  if (isFullDayLeaveRow(r)) return "—";
  return formatClockTime(iso);
}

function formatLeaveAwareActiveHours(r: HrmAttendanceSummary): string {
  if (isFullDayLeaveRow(r)) return "—";
  return formatHoursFromMinutes(r.activeMinutes);
}

function formatHoursFromMinutes(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

/** Extra detail for exports only — not shown in the main grid. */
export function attendanceStatusSuffix(r: HrmAttendanceSummary) {
  return (
    (r.forgivenLate ? " (excused)" : "") +
    (r.partialLeave ? " · partial leave" : "") +
    (isFullDayLeaveRow(r) ? " · full-day leave" : "") +
    (r.corrected ? " · corrected" : "") +
    (r.missingClockOut ? " · no clock-out" : "") +
    (r.globalWfh ? " · global WFH" : "") +
    (r.source === "admin_override" ? " · manual" : "")
  );
}

export function buildHrmAttendanceGridColumns(showEmployee: boolean): Column<HrmAttendanceSummary>[] {
  const statusColumn: Column<HrmAttendanceSummary> = {
    id: "status",
    header: "Status",
    accessorKey: "status",
    cell: (r) => <HrmAttendanceStatusPill row={r} />,
    exportValue: (r) => `${simpleAttendanceStatusLabel(r)}${attendanceStatusSuffix(r)}`,
  };

  const cols: Column<HrmAttendanceSummary>[] = [];
  if (showEmployee) {
    cols.push({
      id: "employee",
      header: "Employee",
      accessorKey: "userName",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <HrmEmployeeAvatar name={r.userName} avatarUrl={r.avatarUrl} className="h-7 w-7" />
          <span className="font-medium">{r.userName}</span>
        </div>
      ),
      exportValue: (r) => r.userName,
    });
    cols.push(statusColumn);
  }
  cols.push(
    {
      id: "date",
      header: "Date",
      accessorKey: "date",
      cell: (r) => <span className="text-muted-foreground">{r.date}</span>,
    },
    ...(showEmployee ? [] : [statusColumn]),
    {
      id: "clockIn",
      header: "Clock in",
      cell: (r) => <span className="tabular-nums text-xs">{formatLeaveAwareClockTime(r.firstClockIn, r)}</span>,
      exportValue: (r) => formatLeaveAwareClockTime(r.firstClockIn, r),
    },
    {
      id: "clockOut",
      header: "Clock out",
      cell: (r) => <span className="tabular-nums text-xs">{formatLeaveAwareClockTime(r.lastClockOut, r)}</span>,
      exportValue: (r) => formatLeaveAwareClockTime(r.lastClockOut, r),
    },
    {
      id: "active",
      header: "Hours",
      cell: (r) => formatLeaveAwareActiveHours(r),
      exportValue: (r) =>
        isFullDayLeaveRow(r) ? "" : String(Math.round((r.activeMinutes / 60) * 10) / 10),
    },
    {
      id: "expected",
      header: "Expected",
      cell: (r) => formatHoursFromMinutes(r.expectedMinutes),
      exportValue: (r) => String(Math.round((r.expectedMinutes / 60) * 10) / 10),
    },
  );
  return cols;
}

export function HrmAttendanceGridPanel({
  rows,
  isLoading,
  showEmployee = true,
  searchPlaceholder = "Filter employees…",
  viewStorageKey = "hrm-attendance-grid",
  filename = "HrmAttendanceGridExport",
  extraColumns,
}: {
  rows: HrmAttendanceSummary[];
  isLoading?: boolean;
  showEmployee?: boolean;
  searchPlaceholder?: string;
  viewStorageKey?: string;
  filename?: string;
  extraColumns?: Column<HrmAttendanceSummary>[];
}) {
  const columns = useMemo(() => {
    const base = buildHrmAttendanceGridColumns(showEmployee);
    return extraColumns?.length ? [...base, ...extraColumns] : base;
  }, [showEmployee, extraColumns]);

  return (
    <PortalTablePanel isLoading={isLoading}>
      <AdvancedTable
        data={rows}
        columns={columns}
        searchKey={showEmployee ? "userName" : undefined}
        searchPlaceholder={searchPlaceholder}
        filename={filename}
        viewStorageKey={viewStorageKey}
      />
    </PortalTablePanel>
  );
}
