import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
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
  BarChart3,
  ClipboardEdit,
  Home,
  RefreshCw,
  Plus,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardPipelineChart } from "@/components/dashboard/admin-dashboard-charts";
import {
  HrmPayrollBannerCard,
  HrmPeopleMiniList,
  HrmMiniRingStat,
  HrmHorizontalBarList,
  HrmNeedsAttentionList,
  HrmTodayAttendanceTable,
  HrmTopEarnersList,
  HrmRecentActivityList,
  HrmQuickStatsWidget,
} from "./dashboard-sections";
import { HrmAttendanceTrendChart, HrmDepartmentBarChart } from "./dashboard-charts";
import {
  HrmApprovalActions,
  HrmPageHeader,
  HrmKpiGrid,
  HrmChartCard,
  HrmChartGridCell,
  HrmChartEmptyState,
  HrmSectionLabel,
  HrmFilterBar,
  HrmFilterRow,
  HrmPipelineStrip,
  hrmActionButtonClass,
} from "./components";
import { formatCompactCurrency } from "@/modules/finance/constants";
import { hrmDashboardQueryKey, useReviewLeaveRequest } from "@/api/hrm";
import { useHrmPermission } from "./useHrmPermission";
import type { HrmDashboardResponse } from "./types";

function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

type Props = {
  data: HrmDashboardResponse;
  view: "admin" | "manager";
};

export function HrmRichDashboard({ data, view }: Props) {
  const [period, setPeriod] = useState("month");
  const queryClient = useQueryClient();
  const canApproveLeave = useHrmPermission("leave", "approve");
  const reviewLeave = useReviewLeaveRequest();

  const stats = data.stats;
  const analytics = data.analytics;
  const pendingLeave = data.pendingApprovals?.leave ?? [];
  const pendingTotal = (stats?.pendingLeave ?? 0) + (stats?.pendingWfh ?? 0) + (stats?.pendingCorrections ?? 0);
  const peopleColSpan = view === "admin" ? 4 : 6;

  const trendData = useMemo(() => {
    const rows = analytics?.attendanceTrend ?? [];
    if (period === "month") return rows;
    return rows.slice(-Math.min(180, rows.length));
  }, [analytics?.attendanceTrend, period]);

  const pipelineStages = useMemo(() => {
    const colorMap: Record<string, string> = {
      Present: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
      Late: "border-amber-500/30 bg-amber-500/10 text-amber-700",
      WFH: "border-blue-500/30 bg-blue-500/10 text-blue-700",
      "On leave": "border-violet-500/30 bg-violet-500/10 text-violet-700",
      Absent: "border-red-500/30 bg-red-500/10 text-red-700",
    };
    return (analytics?.todayBreakdown ?? []).map((row) => ({
      label: row.name,
      value: row.value,
      color: colorMap[row.name] ?? "border-border bg-muted/30",
    }));
  }, [analytics?.todayBreakdown]);

  const attendancePct =
    (stats?.headcount ?? 0) > 0
      ? Math.round(((stats?.presentToday ?? 0) / (stats?.headcount ?? 1)) * 100)
      : 0;

  const reviewLeaveRequest = async (id: number, status: "approved" | "rejected") => {
    try {
      await reviewLeave.mutateAsync({ id, status });
      toast.success(status === "approved" ? "Approved" : "Rejected");
      queryClient.invalidateQueries({ queryKey: hrmDashboardQueryKey() });
    } catch {
      // Error toast handled by useReviewLeaveRequest
    }
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <HrmPageHeader
        title="Dashboard"
        description={`Org snapshot, leave, payroll, and attendance · ${today}`}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-9 border-border/60 text-xs"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: hrmDashboardQueryKey() });
                toast.success("Dashboard refreshed");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {view === "admin" && (
              <Button asChild size="sm" className={hrmActionButtonClass()}>
                <Link href="/admin/employees">
                  <Plus className="mr-2 h-4 w-4" />
                  Add employee
                </Link>
              </Button>
            )}
          </>
        }
      />

      <HrmFilterRow
        period={period}
        onPeriodChange={setPeriod}
        periodOptions={[
          { value: "month", label: "Last 30 days" },
          { value: "6m", label: "Last 6 months" },
        ]}
        className="px-1"
      />

      <HrmKpiGrid
        items={[
          {
            label: "Total employees",
            value: stats?.headcount ?? 0,
            hint: "Active directory",
            icon: Users,
            accent: "violet",
            href: "/hrm/employees",
          },
          {
            label: "Present today",
            value: `${stats?.presentToday ?? 0}/${stats?.headcount ?? 0}`,
            hint: "Clocked in today",
            icon: UserCheck,
            accent: "green",
            href: "/hrm/attendance",
          },
          {
            label: "Pending approvals",
            value: pendingTotal,
            hint: "Leave, WFH & corrections",
            icon: ClipboardList,
            accent: "amber",
            href: "/hrm/leave",
            alert: pendingTotal > 0,
          },
          {
            label: "Absent today",
            value: stats?.absentToday ?? 0,
            hint: "Not present",
            icon: UserX,
            accent: "blue",
            href: "/hrm/attendance",
            alert: (stats?.absentToday ?? 0) > 0,
          },
        ]}
      />

      {view === "admin" && data.payrollBanner && (
        <HrmKpiGrid
          columns={3}
          count={3}
          items={[
            {
              label: "Contract pay",
              value: formatCompactCurrency(data.payrollBanner.totalGross),
              hint: monthLabel(data.payrollBanner.year, data.payrollBanner.month),
              icon: Wallet,
              accent: "violet",
              href: "/hrm/payroll",
            },
            {
              label: "Net payroll",
              value: formatCompactCurrency(data.payrollBanner.totalNet),
              hint: "After deductions",
              icon: Receipt,
              accent: "green",
              href: "/hrm/payroll",
            },
            {
              label: "Yet to pay",
              value: formatCompactCurrency(data.payrollBanner.yetToPay),
              hint: "Outstanding balance",
              icon: Briefcase,
              accent: "amber",
              href: "/hrm/payroll",
              alert: data.payrollBanner.yetToPay > 0,
            },
          ]}
        />
      )}

      {pipelineStages.length > 0 && (
        <HrmPipelineStrip title="Today's attendance mix" stages={pipelineStages} />
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <HrmChartGridCell colSpan={peopleColSpan}>
          <HrmChartCard
            title="On leave today"
            icon={CalendarClock}
            badge={data.onLeaveToday?.length ?? 0}
            viewAllHref="/hrm/leave"
            className="min-h-[240px]"
          >
            <HrmPeopleMiniList title="" people={data.onLeaveToday ?? []} emptyLabel="No one on leave today" />
          </HrmChartCard>
        </HrmChartGridCell>
        <HrmChartGridCell colSpan={peopleColSpan}>
          <HrmChartCard
            title="On WFH today"
            icon={Home}
            badge={data.onWfhToday?.length ?? 0}
            viewAllHref="/hrm/wfh"
            className="min-h-[240px]"
          >
            <HrmPeopleMiniList title="" people={data.onWfhToday ?? []} emptyLabel="No WFH today" emptyIcon={Home} />
          </HrmChartCard>
        </HrmChartGridCell>
        {view === "admin" && (
          <HrmChartGridCell colSpan={4}>
            <HrmChartCard title="Employees by status" icon={Users} className="min-h-[240px]">
              {(data.employeeStatus?.length ?? 0) > 0 ? (
                <DashboardPipelineChart data={data.employeeStatus!} />
              ) : (
                <HrmChartEmptyState message="No employee records yet." icon={Users} />
              )}
            </HrmChartCard>
          </HrmChartGridCell>
        )}
      </div>

      <HrmSectionLabel title="Trends & analytics" />
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <HrmChartGridCell colSpan={8}>
          <HrmChartCard
            title="Attendance trend"
            description="Present vs absent · last 30 days"
            icon={TrendingUp}
            viewAllHref="/hrm/attendance"
            className="min-h-[260px]"
          >
            {trendData.length > 0 ? (
              <HrmAttendanceTrendChart data={trendData} />
            ) : (
              <HrmChartEmptyState message="Trend appears once attendance is recorded." icon={TrendingUp} />
            )}
          </HrmChartCard>
        </HrmChartGridCell>
        <HrmChartGridCell colSpan={4}>
          <HrmChartCard title="Top departments" icon={Building2} viewAllHref="/hrm/departments" className="min-h-[260px]">
            <HrmHorizontalBarList
              data={(data.departmentStrength ?? []).map((d) => ({ name: d.name, value: d.count }))}
              valueSuffix=" staff"
            />
          </HrmChartCard>
        </HrmChartGridCell>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HrmChartCard title="Attendance today" icon={UserCheck} className="min-h-[220px]">
          <HrmMiniRingStat label="Present rate" value={`${attendancePct}%`} pct={attendancePct} color="#22c55e" />
        </HrmChartCard>
        <HrmChartCard title="Leave requests" icon={CalendarClock} viewAllHref="/hrm/leave" className="min-h-[220px]">
          <HrmMiniRingStat
            label="Pending"
            value={data.leaveRequestStats?.pending ?? 0}
            sublabel={`${data.leaveRequestStats?.approved ?? 0} approved`}
            pct={Math.min(100, (data.leaveRequestStats?.pending ?? 0) * 10)}
            color="#f59e0b"
          />
        </HrmChartCard>
        <HrmChartCard title="WFH requests" icon={Home} viewAllHref="/hrm/wfh" className="min-h-[220px]">
          <HrmMiniRingStat
            label="Pending"
            value={data.wfhRequestStats?.pending ?? 0}
            sublabel={`${data.wfhRequestStats?.approved ?? 0} approved`}
            pct={Math.min(100, (data.wfhRequestStats?.pending ?? 0) * 10)}
            color="#3b82f6"
          />
        </HrmChartCard>
        <HrmChartCard title="Needs attention" icon={ClipboardEdit} className="min-h-[220px]">
          <HrmNeedsAttentionList items={data.needsAttention ?? []} />
        </HrmChartCard>
      </div>

      <HrmChartCard
        title="Today's attendance"
        description="Clock-in, hours, and live status"
        icon={BarChart3}
        viewAllHref="/hrm/attendance"
      >
        <HrmTodayAttendanceTable rows={data.todayAttendance ?? []} />
      </HrmChartCard>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {canApproveLeave && (
          <HrmChartCard
            title="Pending leave requests"
            icon={ClipboardList}
            badge={pendingLeave.length}
            viewAllHref="/hrm/leave"
            className="min-h-[240px]"
          >
            {pendingLeave.length === 0 ? (
              <HrmChartEmptyState message="No pending leave requests." icon={ClipboardList} />
            ) : (
              <div className="max-h-[240px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Dates</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLeave.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs font-medium">{r.userName ?? `#${r.userId}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.startDate} → {r.endDate}
                        </TableCell>
                        <TableCell>
                          <HrmApprovalActions
                            compact
                            disabled={reviewLeave.isPending}
                            onApprove={() => reviewLeaveRequest(r.id, "approved")}
                            onReject={() => reviewLeaveRequest(r.id, "rejected")}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </HrmChartCard>
        )}
        <HrmChartCard
          title="Approved leave by type"
          description="Days approved this year"
          icon={PieChart}
          className="min-h-[240px]"
        >
          <HrmHorizontalBarList data={data.leaveByType ?? []} valueSuffix=" days" />
        </HrmChartCard>
      </div>

      {view === "admin" && (
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
          <HrmChartGridCell colSpan={4}>
            <HrmChartCard title="Payroll status" icon={Receipt} viewAllHref="/hrm/payroll" className="min-h-[220px]">
              {data.payrollBanner ? (
                <HrmMiniRingStat
                  label={data.payrollBanner.status.replace(/_/g, " ")}
                  value={`${data.payrollBanner.payrollProgressPct}%`}
                  pct={data.payrollBanner.payrollProgressPct}
                  sublabel={formatCompactCurrency(data.payrollBanner.totalNet)}
                  color="#10b981"
                />
              ) : (
                <HrmChartEmptyState message="No payroll run yet." icon={Receipt} />
              )}
            </HrmChartCard>
          </HrmChartGridCell>
          <HrmChartGridCell colSpan={4}>
            <HrmChartCard title="Department strength" icon={Building2} viewAllHref="/hrm/departments" className="min-h-[220px]">
              <HrmDepartmentBarChart data={data.departmentStrength ?? []} />
            </HrmChartCard>
          </HrmChartGridCell>
          <HrmChartGridCell colSpan={4}>
            <HrmChartCard title="Top earners" icon={Wallet} viewAllHref="/hrm/payroll" className="min-h-[220px]">
              <HrmTopEarnersList earners={data.topEarners ?? []} />
            </HrmChartCard>
          </HrmChartGridCell>
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        {view === "admin" && (
          <HrmChartGridCell colSpan={8}>
            <HrmChartCard title="Recent activity" icon={ClipboardList} viewAllHref="/hrm/audit" className="min-h-[220px]">
              <div className="max-h-[220px] overflow-y-auto">
                <HrmRecentActivityList items={data.recentActivity ?? []} />
              </div>
            </HrmChartCard>
          </HrmChartGridCell>
        )}
        <HrmChartGridCell colSpan={view === "admin" ? 4 : 12}>
          <HrmChartCard title="Live snapshot" icon={BarChart3} className="min-h-[220px]">
            <HrmQuickStatsWidget
              presentToday={stats?.presentToday ?? 0}
              headcount={stats?.headcount ?? 0}
              pendingApprovals={pendingTotal}
            />
          </HrmChartCard>
        </HrmChartGridCell>
      </div>
    </div>
  );
}
