import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserX,
  CalendarClock,
  Briefcase,
  ClipboardList,
  Wallet,
  Building2,
  Receipt,
  TrendingUp,
  Home,
  Cake,
  Clock,
  Bell,
  Plus,
  AlertCircle,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { SalesPageHeader } from "@/modules/sales/components/SalesPageHeader";
import { SalesDonutPanel } from "@/modules/sales/components/SalesDonutPanel";
import {
  HrmApprovalActions,
  HrmChartEmptyState,
  type HrmTrendDays,
} from "./components";
import { HrmAttendanceTrendChart } from "./dashboard-charts";
import {
  HrmBirthdayList,
  HrmEmployeeAvatar,
  HrmHorizontalBarList,
  HrmNeedsAttentionList,
  HrmRecentActivityList,
  HrmTopEarnersList,
} from "./dashboard-sections";
import { HrmAttendanceGridPanel } from "./hrm-attendance-grid";
import { deriveTodayAttendanceStats } from "./attendance-day-stats";
import {
  HrmAttendancePipelineFlow,
  HrmDashboardFilterBar,
  HrmDashboardSectionLabel,
} from "./hrm-dashboard-kit";
import { formatCompactCurrency } from "@/modules/finance/constants";
import { useReviewLeaveRequest } from "@/api/hrm";
import { useHrmPermission } from "./useHrmPermission";
import type { HrmDashboardResponse } from "./types";

function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadDashboardCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type Props = {
  data: HrmDashboardResponse;
  view: "admin" | "manager";
  trendDays: HrmTrendDays;
};

export function HrmRichDashboard({ data, view, trendDays }: Props) {
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const todayKey = data.todayKey ?? format(new Date(), "yyyy-MM-dd");
  const queryClient = useQueryClient();
  const canApproveLeave = useHrmPermission("leave", "approve");
  const reviewLeave = useReviewLeaveRequest();

  const stats = data.stats;
  const analytics = data.analytics;
  const pendingLeave = data.pendingApprovals?.leave ?? [];
  const pendingWfh = data.pendingApprovals?.wfh ?? [];
  const insights = data.insights;
  const normalizedEmployeeFilter = employeeFilter.trim().toLowerCase();
  const trendData = analytics?.attendanceTrend ?? [];
  const baseAttendanceRows = data.todayAttendance ?? [];
  const fallbackOnLeaveToday = data.onLeaveToday ?? [];
  const fallbackOnWfhToday = data.onWfhToday ?? [];
  const upcomingBirthdays = data.upcomingBirthdays ?? [];
  const hasAttendanceFilters =
    normalizedEmployeeFilter.length > 0 || departmentFilter !== "all" || attendanceStatusFilter !== "all";

  const matchesEmployee = (
    row?: {
      userName?: string | null;
      employeeId?: string | null;
      departmentId?: number | null;
      departmentName?: string | null;
    } | null,
  ) => {
    if (!row) return false;
    if (departmentFilter === "unassigned") {
      if (row.departmentId != null) return false;
    } else if (departmentFilter !== "all" && row.departmentId !== Number(departmentFilter)) {
      return false;
    }
    if (!normalizedEmployeeFilter) return true;
    const haystack = [row.userName, row.employeeId, row.departmentName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedEmployeeFilter);
  };

  const matchesAttendanceStatus = (status?: string | null) => {
    if (attendanceStatusFilter === "all") return true;
    if (attendanceStatusFilter === "present") return ["present", "onsite", "late"].includes(status ?? "");
    return (status ?? "") === attendanceStatusFilter;
  };

  const attendanceRows = useMemo(() => {
    return [...baseAttendanceRows]
      .filter((row) => matchesEmployee(row))
      .filter((row) => matchesAttendanceStatus(row.status))
      .sort((a, b) => (a.userName ?? "").localeCompare(b.userName ?? ""));
  }, [baseAttendanceRows, normalizedEmployeeFilter, departmentFilter, attendanceStatusFilter]);

  const liveToday = useMemo(() => deriveTodayAttendanceStats(attendanceRows), [attendanceRows]);
  const useLiveToday = data.todayAttendance !== undefined;

  const filteredPendingLeave = useMemo(
    () => pendingLeave.filter((row) => matchesEmployee(row)),
    [pendingLeave, normalizedEmployeeFilter, departmentFilter],
  );
  const filteredPendingWfh = useMemo(
    () => pendingWfh.filter((row) => matchesEmployee(row)),
    [pendingWfh, normalizedEmployeeFilter, departmentFilter],
  );
  const filteredUpcomingBirthdays = useMemo(
    () => upcomingBirthdays.filter((row) => matchesEmployee(row)),
    [upcomingBirthdays, normalizedEmployeeFilter, departmentFilter],
  );
  const departmentOptions = data.departmentStrength ?? [];
  const topEarners = useMemo(
    () => (data.topEarners ?? []).filter((row) => matchesEmployee(row)).slice(0, 5),
    [data.topEarners, normalizedEmployeeFilter, departmentFilter],
  );

  const pendingTotal = hasAttendanceFilters
    ? filteredPendingLeave.length + filteredPendingWfh.length
    : (stats?.pendingLeave ?? 0) + (stats?.pendingWfh ?? 0) + (stats?.pendingCorrections ?? 0);
  const headcount = useLiveToday && hasAttendanceFilters ? liveToday.workingCount : (stats?.headcount ?? liveToday.workingCount);
  const presentToday = useLiveToday ? liveToday.present : (stats?.presentToday ?? 0);
  const absentToday = useLiveToday ? liveToday.absent : (stats?.absentToday ?? 0);
  const onLeaveCount = useLiveToday ? liveToday.onLeave : (fallbackOnLeaveToday.length ?? stats?.onLeaveToday ?? 0);
  const globalWfhMode = data.globalWfhMode === true;
  const wfhCount = useLiveToday
    ? liveToday.wfh
    : globalWfhMode
      ? Math.max(0, headcount - onLeaveCount)
      : (fallbackOnWfhToday.length ?? 0);
  const pipelineStages = useLiveToday
    ? liveToday.pipelineStages
    : (analytics?.todayBreakdown ?? []).map((row) => ({ label: row.name, value: row.value }));
  const onLeaveToday = useLiveToday
    ? liveToday.onLeaveToday
    : fallbackOnLeaveToday.filter((row) => matchesEmployee(row));
  const onWfhToday = useLiveToday
    ? liveToday.onWfhToday
    : fallbackOnWfhToday.filter((row) => matchesEmployee(row));

  const attendancePct =
    headcount > 0 ? Math.round((presentToday / headcount) * 100) : 0;

  const refreshDashboard = () => {
    void queryClient.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    toast.success("Dashboard refreshed");
  };

  const reviewLeaveRequest = async (id: number, status: "approved" | "rejected") => {
    try {
      const data = await reviewLeave.mutateAsync({ id, status });
      toast.success(status === "approved" ? "Approved" : "Rejected");
      for (const message of data.warnings ?? []) toast.warning(message);
    } catch {
      // Error toast handled by mutation hook
    }
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const maxEarnerNet = topEarners[0]?.net ?? 1;

  const exportDashboardSummary = () => {
    downloadDashboardCsv(`hrm-dashboard-summary-${todayKey}.csv`, [
      ["Section", "Metric", "Value"],
      ["Filters", "Trend window", trendDays],
      ["Filters", "Employee search", employeeFilter || "All employees"],
      ["Filters", "Department", departmentFilter === "all" ? "All" : departmentFilter === "unassigned" ? "Unassigned" : departmentFilter],
      ["Filters", "Attendance status", attendanceStatusFilter],
      ["Workforce", "Total employees", headcount],
      ["Workforce", "Present today", presentToday],
      ["Workforce", "Absent today", absentToday],
      ["Workforce", "On leave today", onLeaveCount],
      ["Workforce", "WFH today", wfhCount],
      ["Approvals", "Pending approvals", pendingTotal],
      ["Approvals", "Visible leave requests", filteredPendingLeave.length],
      ["Approvals", "Visible WFH requests", filteredPendingWfh.length],
      ["Dashboard", "Visible birthdays", filteredUpcomingBirthdays.length],
      ["Dashboard", "Visible top earners", topEarners.length],
      ...(data.payrollBanner
        ? [
            ["Payroll", "Period", monthLabel(data.payrollBanner.year, data.payrollBanner.month)],
            ["Payroll", "Contract pay", data.payrollBanner.totalGross],
            ["Payroll", "Net payroll", data.payrollBanner.totalNet],
            ["Payroll", "Yet to pay amount", data.payrollBanner.yetToPay],
            ["Payroll", "Yet to pay employees", data.payrollBanner.yetToPayEmployeeCount ?? data.payrollBanner.employeeCount],
          ]
        : []),
    ]);
    toast.success("Summary exported");
  };

  return (
    <div className="space-y-4">
      <SalesPageHeader
        title="HRM Dashboard"
        description={`People operations control center — attendance, leave, and payroll · ${today}`}
        breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Dashboard" }]}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={exportDashboardSummary}
            >
              Export summary
            </Button>
            {view === "admin" ? (
              <Button size="sm" className="h-8" asChild>
                <Link href="/admin/employees">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add employee
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <HrmDashboardFilterBar
        onRefresh={refreshDashboard}
        onExport={exportDashboardSummary}
        extraFilters={
          <>
            <Input
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              placeholder="Search employees..."
              className="h-9 w-full sm:w-[220px]"
            />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {departmentOptions.filter((department) => department.departmentId != null).map((department) => (
                  <SelectItem key={department.departmentId} value={String(department.departmentId)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={attendanceStatusFilter} onValueChange={setAttendanceStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="Attendance status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="present">Present / onsite</SelectItem>
                <SelectItem value="wfh">WFH</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="half_day">Half day</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <motion.div className="space-y-2">
        <HrmDashboardSectionLabel>Workforce KPIs</HrmDashboardSectionLabel>
        <PortalKpiGrid
          columns={4}
          count={6}
          items={[
            {
              title: "Total employees",
              value: (stats?.headcount ?? 0).toLocaleString(),
              hint: "Active directory",
              icon: Users,
              accent: "violet",
              href: "/hrm/employees",
              delay: 0,
            },
            {
              title: "Present today",
              value: `${presentToday}/${headcount}`,
              hint: `${attendancePct}% attendance rate`,
              icon: UserCheck,
              accent: "green",
              href: "/hrm/attendance",
              delay: 1,
            },
            {
              title: "Pending approvals",
              value: pendingTotal,
              hint: "Leave, WFH & corrections",
              icon: ClipboardList,
              accent: "amber",
              href: "/hrm/leave",
              alert: pendingTotal > 0,
              delay: 2,
            },
            {
              title: "Absent today",
              value: absentToday,
              hint: "Not marked present",
              icon: UserX,
              accent: "red",
              href: "/hrm/attendance",
              alert: absentToday > 0,
              delay: 3,
            },
            {
              title: "On leave today",
              value: onLeaveCount,
              hint: "Approved leave",
              icon: CalendarClock,
              accent: "sky",
              href: "/hrm/leave",
              delay: 4,
            },
            {
              title: "WFH today",
              value: wfhCount,
              hint: "Remote workers",
              icon: Home,
              accent: "blue",
              href: "/hrm/wfh",
              delay: 5,
            },
          ]}
        />
      </motion.div>

      <HrmAttendancePipelineFlow stages={pipelineStages} />

      {(insights?.averageClockIn != null ||
        insights?.onTimeRatePct != null ||
        filteredUpcomingBirthdays.length > 0 ||
        (insights?.unreadAlerts ?? 0) > 0) && (
        <motion.div className="space-y-2">
          <HrmDashboardSectionLabel>Insights</HrmDashboardSectionLabel>
          <PortalKpiGrid
            columns={4}
            count={4}
            items={[
              ...(insights?.averageClockIn != null
                ? [
                    {
                      title: "Avg clock-in",
                      value: insights.averageClockIn,
                      hint: "Today's first punch",
                      icon: Clock,
                      accent: "blue" as const,
                      delay: 0,
                    },
                  ]
                : []),
              ...(insights?.onTimeRatePct != null
                ? [
                    {
                      title: "On-time rate",
                      value: `${insights.onTimeRatePct}%`,
                      hint: "Present vs late today",
                      icon: UserCheck,
                      accent: "green" as const,
                      delay: 1,
                    },
                  ]
                : []),
              ...(filteredUpcomingBirthdays.length > 0
                ? [
                    {
                      title: "Upcoming birthdays",
                      value: filteredUpcomingBirthdays.length,
                      hint: "Next 3 months",
                      icon: Cake,
                      accent: "violet" as const,
                      href: "/hrm/calendar",
                      delay: 2,
                    },
                  ]
                : []),
              ...((insights?.unreadAlerts ?? 0) > 0
                ? [
                    {
                      title: "Unread alerts",
                      value: insights!.unreadAlerts,
                      hint: "Notifications",
                      icon: Bell,
                      accent: "amber" as const,
                      alert: true,
                      delay: 3,
                    },
                  ]
                : []),
            ]}
          />
        </motion.div>
      )}

      {view === "admin" && data.payrollBanner ? (
        <motion.div className="space-y-2">
          <HrmDashboardSectionLabel>Payroll KPIs</HrmDashboardSectionLabel>
          <PortalKpiGrid
            columns={4}
            count={3}
            items={[
              {
                title: "Contract pay",
                value: formatCompactCurrency(data.payrollBanner.totalGross),
                hint: monthLabel(data.payrollBanner.year, data.payrollBanner.month),
                icon: Wallet,
                accent: "violet",
                href: "/hrm/payroll",
                delay: 0,
              },
              {
                title: "Net payroll",
                value: formatCompactCurrency(data.payrollBanner.totalNet),
                hint: "After deductions",
                icon: Receipt,
                accent: "green",
                href: "/hrm/payroll",
                delay: 1,
              },
              {
                title: "Yet to pay",
                value: `${data.payrollBanner.yetToPayEmployeeCount ?? data.payrollBanner.employeeCount} employees`,
                hint: `${formatCompactCurrency(data.payrollBanner.yetToPay)} outstanding`,
                icon: AlertCircle,
                accent: "red",
                alert: (data.payrollBanner.yetToPayEmployeeCount ?? data.payrollBanner.employeeCount) > 0,
                href: "/hrm/payroll",
                delay: 2,
              },
            ]}
          />
        </motion.div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Today's attendance mix"
            description="Present, late, WFH, leave, absent"
            icon={UserCheck}
            accent="emerald"
            viewAllHref="/hrm/attendance"
          >
            {pipelineStages.length > 0 ? (
              <SalesDonutPanel
                data={pipelineStages.map((d) => ({ name: d.label, count: d.value, value: d.value }))}
              />
            ) : (
              <HrmChartEmptyState message="No attendance recorded yet today." icon={UserCheck} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Leave by type"
            description="Approved days this year"
            icon={PieChart}
            accent="violet"
            viewAllHref="/hrm/leave"
          >
            {(data.leaveByType?.length ?? 0) > 0 ? (
              <SalesDonutPanel
                data={(data.leaveByType ?? []).map((d) => ({
                  name: d.name,
                  count: d.value,
                  value: d.value,
                }))}
              />
            ) : (
              <HrmChartEmptyState message="No approved leave yet." icon={CalendarClock} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Attendance trend"
            description={`Present vs absent · last ${trendDays === "180" ? "6 months" : `${trendDays} days`}`}
            icon={TrendingUp}
            accent="blue"
            viewAllHref="/hrm/attendance"
          >
            {trendData.length > 0 ? (
              <HrmAttendanceTrendChart data={trendData} />
            ) : (
              <HrmChartEmptyState message="Trend appears once attendance is recorded." icon={TrendingUp} />
            )}
          </ChartPanel>
        </ChartGridCell>

        {view === "admin" ? (
          <ChartGridCell colSpan={4}>
            <ChartPanel
              title="Employees by status"
              description="Active directory breakdown"
              icon={Users}
              accent="amber"
              viewAllHref="/hrm/employees"
            >
              {(data.employeeStatus?.length ?? 0) > 0 ? (
                <SalesDonutPanel
                  data={(data.employeeStatus ?? []).map((d) => ({
                    name: d.name,
                    count: d.value,
                    value: d.value,
                  }))}
                />
              ) : (
                <HrmChartEmptyState message="No employee records yet." icon={Users} />
              )}
            </ChartPanel>
          </ChartGridCell>
        ) : null}

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="On leave today"
            description={`${onLeaveCount} employees`}
            icon={CalendarClock}
            accent="violet"
            viewAllHref="/hrm/leave"
          >
            {onLeaveToday.length > 0 ? (
              <div className="space-y-2">
                {onLeaveToday.slice(0, 6).map((p) => (
                  <div key={p.userId} className="flex items-center gap-2 rounded-lg border p-2">
                    <HrmEmployeeAvatar name={p.userName} avatarUrl={p.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.userName}</p>
                      <p className="text-[10px] text-muted-foreground">On leave</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <HrmChartEmptyState message="No one on leave today." icon={CalendarClock} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title={globalWfhMode ? "WFH today (All)" : "WFH today"}
            description={globalWfhMode ? "Company-wide WFH active" : `${wfhCount} employees`}
            icon={Home}
            accent="blue"
            viewAllHref="/hrm/wfh"
          >
            {globalWfhMode ? (
              <p className="text-xs text-muted-foreground">
                Everyone can work remotely today. Employees must clock in to mark WFH — no office geofence or late penalties.
              </p>
            ) : onWfhToday.length > 0 ? (
              <div className="space-y-2">
                {onWfhToday.slice(0, 6).map((p) => (
                  <div key={p.userId} className="flex items-center gap-2 rounded-lg border p-2">
                    <HrmEmployeeAvatar name={p.userName} avatarUrl={p.avatarUrl} />
                    <p className="text-xs font-medium truncate">{p.userName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <HrmChartEmptyState message="No WFH today." icon={Home} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Top departments"
            description="Headcount by department"
            icon={Building2}
            accent="emerald"
            viewAllHref="/hrm/departments"
          >
            <HrmHorizontalBarList
              data={(data.departmentStrength ?? []).map((d) => ({ name: d.name, value: d.count }))}
              valueSuffix=" staff"
            />
          </ChartPanel>
        </ChartGridCell>

        {view === "admin" && topEarners.length > 0 ? (
          <ChartGridCell colSpan={4}>
            <ChartPanel
              title="Top earners"
              description="By net pay this period"
              icon={Wallet}
              accent="blue"
              viewAllHref="/hrm/payroll"
            >
              <div className="space-y-3">
                {topEarners.map((e, i) => (
                  <div key={e.userId} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                        <HrmEmployeeAvatar name={e.userName} avatarUrl={e.avatarUrl} className="h-7 w-7" />
                        <span className="text-xs font-medium truncate">{e.userName}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">
                        {formatCompactCurrency(e.net)}
                      </span>
                    </div>
                    <Progress value={(e.net / maxEarnerNet) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            </ChartPanel>
          </ChartGridCell>
        ) : null}

        {filteredUpcomingBirthdays.length > 0 ? (
          <ChartGridCell colSpan={4}>
            <ChartPanel
              title="Upcoming birthdays"
              description="Next 3 months"
              icon={Cake}
              accent="amber"
              viewAllHref="/hrm/calendar"
            >
              <HrmBirthdayList birthdays={filteredUpcomingBirthdays} />
            </ChartPanel>
          </ChartGridCell>
        ) : null}
      </div>

      {canApproveLeave ? (
        <ChartPanel
          title="Pending leave requests"
          description="Awaiting manager / HR approval"
          icon={ClipboardList}
          accent="amber"
          viewAllHref="/hrm/leave"
        badge={filteredPendingLeave.length || undefined}
        >
          {filteredPendingLeave.length === 0 ? (
            <HrmChartEmptyState message="No pending leave requests." icon={ClipboardList} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Dates</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPendingLeave.slice(0, 8).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <HrmEmployeeAvatar name={r.userName ?? `#${r.userId}`} avatarUrl={r.avatarUrl} className="h-6 w-6" />
                        <p className="text-xs font-medium">{r.userName ?? `#${r.userId}`}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.startDate} → {r.endDate}
                    </TableCell>
                    <TableCell className="text-xs">{r.leaveTypeName ?? "Leave"}</TableCell>
                    <TableCell className="text-right">
                      <HrmApprovalActions
                        compact
                        disabled={reviewLeave.isPending}
                        onApprove={() => void reviewLeaveRequest(r.id, "approved")}
                        onReject={() => void reviewLeaveRequest(r.id, "rejected")}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ChartPanel>
      ) : null}

      <ChartPanel
        title="Today's attendance"
        description="Daily grid — same data as the Attendance page"
        icon={Briefcase}
        accent="blue"
        viewAllHref="/hrm/attendance"
        badge={attendanceRows.length || undefined}
      >
        <HrmAttendanceGridPanel
          rows={attendanceRows}
          showEmployee
          viewStorageKey="hrm-dashboard-attendance-grid"
          filename="HrmDashboardAttendanceExport"
        />
      </ChartPanel>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {view === "admin" ? (
          <ChartGridCell colSpan={8}>
            <ChartPanel
              title="Recent HRM activity"
              description="Audit trail snapshot"
              icon={ClipboardList}
              accent="violet"
              viewAllHref="/hrm/audit"
            >
              <div className="max-h-[280px] overflow-y-auto">
                <HrmRecentActivityList items={data.recentActivity ?? []} />
              </div>
            </ChartPanel>
          </ChartGridCell>
        ) : null}

        <ChartGridCell colSpan={view === "admin" ? 4 : 12}>
          <ChartPanel title="Needs attention" description="Items requiring follow-up" icon={AlertCircle} accent="rose">
            <HrmNeedsAttentionList items={data.needsAttention ?? []} />
          </ChartPanel>
        </ChartGridCell>
      </div>

      {view === "manager" && topEarners.length > 0 ? (
        <ChartPanel title="Top earners" icon={Wallet} accent="blue" viewAllHref="/hrm/payroll">
          <HrmTopEarnersList earners={topEarners} />
        </ChartPanel>
      ) : null}
    </div>
  );
}
