import { useMemo } from "react";
import { format } from "date-fns";
import { Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { HrmAttendanceBadge } from "./components";
import { attendanceDisplayLabel, isPresentLikeStatus, resolveAttendanceDisplayStatus } from "./constants";
import type { HrmAttendanceSummary } from "./types";

function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return format(new Date(iso), "h:mm a"); } catch { return "—"; }
}

export function attendanceStatusSuffix(r: HrmAttendanceSummary) {
  return (
    (r.forgivenLate ? " (excused)" : "") +
    (r.corrected ? " · corrected" : "") +
    (r.missingClockOut ? " · no clock-out" : "") +
    (r.globalWfh ? " · global WFH" : "") +
    (r.source === "admin_override" ? " · manual" : "")
  );
}

function formatHoursFromMinutes(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

export function buildHrmAttendanceGridColumns(showEmployee: boolean): Column<HrmAttendanceSummary>[] {
  const cols: Column<HrmAttendanceSummary>[] = [];
  if (showEmployee) {
    cols.push({
      id: "employee",
      header: "Employee",
      accessorKey: "userName",
      cell: (r) => <span className="font-medium">{r.userName}</span>,
    });
  }
  cols.push(
    {
      id: "date",
      header: "Date",
      accessorKey: "date",
      cell: (r) => <span className="text-muted-foreground">{r.date}</span>,
    },
    {
      id: "clockIn",
      header: "Clock in",
      cell: (r) => <span className="tabular-nums text-xs">{formatClockTime(r.firstClockIn)}</span>,
      exportValue: (r) => formatClockTime(r.firstClockIn),
    },
    {
      id: "clockOut",
      header: "Clock out",
      cell: (r) => <span className="tabular-nums text-xs">{formatClockTime(r.lastClockOut)}</span>,
      exportValue: (r) => formatClockTime(r.lastClockOut),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <HrmAttendanceBadge
          status={resolveAttendanceDisplayStatus(r.status, { globalWfh: r.globalWfh })}
          suffix={attendanceStatusSuffix(r)}
        />
      ),
      exportValue: (r) =>
        `${attendanceDisplayLabel(r.status, { globalWfh: r.globalWfh })}${attendanceStatusSuffix(r)}`,
    },
    {
      id: "workMode",
      header: "Work mode",
      cell: (r) => {
        if (r.status === "wfh" || r.globalWfh) {
          return (
            <Badge variant="outline" className="text-[10px] border-blue-500/20 bg-blue-500/10 text-blue-700">
              <Home className="mr-1 inline h-3 w-3" />
              WFH
            </Badge>
          );
        }
        if (isPresentLikeStatus(r.status) || r.status === "onsite") {
          return (
            <Badge variant="outline" className="text-[10px] border-teal-500/20 bg-teal-500/10 text-teal-700">
              Onsite
            </Badge>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "active",
      header: "Active",
      cell: (r) => formatHoursFromMinutes(r.activeMinutes),
      exportValue: (r) => String(Math.round((r.activeMinutes / 60) * 10) / 10),
    },
    {
      id: "expected",
      header: "Expected",
      cell: (r) => (
        <div>
          <span>{formatHoursFromMinutes(r.expectedMinutes)}</span>
          {r.shiftName ? (
            <div className="text-xs text-muted-foreground">{r.shiftName}</div>
          ) : null}
        </div>
      ),
      exportValue: (r) =>
        `${Math.round((r.expectedMinutes / 60) * 10) / 10}${r.shiftName ? ` (${r.shiftName})` : ""}`,
    },
    { id: "sessions", header: "Sessions", accessorKey: "sessionCount" },
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
