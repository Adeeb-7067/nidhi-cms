import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  UserCheck,
  CalendarClock,
  Wallet,
  Timer,
  TrendingUp,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClockInButton } from "@/components/ClockInButton";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { SalesPageHeader } from "@/modules/sales/components/SalesPageHeader";
import { SalesDonutPanel } from "@/modules/sales/components/SalesDonutPanel";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmRichDashboard } from "@/modules/hrm/HrmRichDashboard";
import { HrmAttendanceTrendChart } from "@/modules/hrm/dashboard-charts";
import { HrmChartEmptyState, sliceTrendByDays, type HrmTrendDays } from "@/modules/hrm/components";
import { HrmTrendRangeSelect } from "@/modules/hrm/rich-ui-kit";
import { HrmDashboardSectionLabel } from "@/modules/hrm/hrm-dashboard-kit";
import { HrmAttendanceGridPanel } from "@/modules/hrm/hrm-attendance-grid";
import { deriveTodayAttendanceStats } from "@/modules/hrm/attendance-day-stats";
import { useHrmDashboard, useHrmAttendanceDaily } from "@/api/hrm";
import { getApiErrorMessage } from "@/lib/api-error";
import { isClockableStaffRole } from "@/lib/user-roles";
import { useAuth } from "@/contexts/AuthContext";

function formatHours(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardLoading() {
  return (
    <PortalPageShell>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[260px] rounded-xl" />
    </PortalPageShell>
  );
}

export default function HrmDashboardPage() {
  const { user } = useAuth();
  const [trendDays, setTrendDays] = useState<HrmTrendDays>("30");
  const { data, isLoading, isError, error } = useHrmDashboard(trendDays);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const { data: attendanceData, isLoading: attendanceLoading } = useHrmAttendanceDaily(
    todayKey,
    todayKey,
    undefined,
    undefined,
    { enabled: !!user?.id },
  );

  const trendData = useMemo(() => {
    const rows = data?.analytics?.attendanceTrend ?? [];
    return sliceTrendByDays(rows, Number(trendDays));
  }, [data?.analytics?.attendanceTrend, trendDays]);

  const todayBreakdown = useMemo(() => {
    const rows = attendanceData?.summaries ?? [];
    if (rows.length > 0) {
      return deriveTodayAttendanceStats(rows).pipelineStages.map((row) => ({
        name: row.label,
        count: row.value,
        value: row.value,
      }));
    }
    return (data?.analytics?.todayBreakdown ?? []).map((row) => ({
      name: row.name,
      count: row.value,
      value: row.value,
    }));
  }, [attendanceData?.summaries, data?.analytics?.todayBreakdown]);

  const todayAttendanceRows = useMemo(
    () => attendanceData?.summaries ?? [],
    [attendanceData?.summaries],
  );

  if (isLoading && !data) {
    return (
      <HrmGate module="dashboard">
        <DashboardLoading />
      </HrmGate>
    );
  }

  if (isError && !data) {
    return (
      <HrmGate module="dashboard">
        <PortalPageShell>
          <div className="py-16 text-center text-sm text-muted-foreground">
            {getApiErrorMessage(error, "Unable to load HRM dashboard. Please refresh or try again later.")}
          </div>
        </PortalPageShell>
      </HrmGate>
    );
  }

  if (!data) {
    return (
      <HrmGate module="dashboard">
        <DashboardLoading />
      </HrmGate>
    );
  }

  const view = data.view;

  if (view === "admin" || view === "manager") {
    return (
      <HrmGate module="dashboard">
        <PortalPageShell>
          <HrmRichDashboard
            data={data}
            view={view}
            trendDays={trendDays}
            onTrendDaysChange={setTrendDays}
          />
        </PortalPageShell>
      </HrmGate>
    );
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <HrmGate module="dashboard">
      <PortalPageShell>
        <SalesPageHeader
          title={`${getGreeting()}, ${firstName}`}
          description={`Your attendance, leave, and pay snapshot · ${today}`}
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Dashboard" }]}
          actions={
            <Button asChild size="sm" className="h-8">
              <Link href="/hrm/my-leave">Apply leave</Link>
            </Button>
          }
        />

        {isClockableStaffRole(user?.role) ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/25">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Work clock</p>
                <p className="text-xs text-muted-foreground">Clock in to start your work session.</p>
              </div>
            </div>
            <ClockInButton />
          </motion.div>
        ) : null}

        {data.self ? (
          <motion.div className="space-y-2">
            <HrmDashboardSectionLabel>My overview</HrmDashboardSectionLabel>
            <PortalKpiGrid
              columns={4}
              count={4}
              items={[
                {
                  title: "Attendance this month",
                  value: `${data.self.attendanceMonthPct}%`,
                  hint: "Working days present",
                  icon: UserCheck,
                  accent: "green",
                  href: "/hrm/my-attendance",
                  delay: 0,
                },
                {
                  title: "Active today",
                  value: formatHours(data.self.activeMinutesToday),
                  hint: "Monitored time",
                  icon: Timer,
                  accent: "blue",
                  delay: 1,
                },
                {
                  title: "Leave available",
                  value: String(data.self.leaveAvailableTotal),
                  hint: "Days remaining",
                  icon: CalendarClock,
                  accent: "violet",
                  href: "/hrm/my-leave",
                  delay: 2,
                },
                {
                  title: "Latest net pay",
                  value:
                    data.self.latestNetPay != null ? `₹${data.self.latestNetPay.toLocaleString()}` : "—",
                  hint: "Recent payslip",
                  icon: Wallet,
                  accent: "amber",
                  href: "/hrm/my-payslips",
                  delay: 3,
                },
              ]}
            />
          </motion.div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <ChartGridCell colSpan={8}>
            <ChartPanel
              title="My attendance trend"
              description={`Present vs absent · last ${trendDays === "180" ? "6 months" : `${trendDays} days`}`}
              icon={TrendingUp}
              accent="blue"
              viewAllHref="/hrm/my-attendance"
              headerExtra={
                <HrmTrendRangeSelect value={trendDays} onChange={setTrendDays} className="w-[120px]" />
              }
            >
              {trendData.length > 0 ? (
                <HrmAttendanceTrendChart data={trendData} />
              ) : (
                <HrmChartEmptyState message="Trend appears once attendance is recorded." icon={TrendingUp} />
              )}
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={4}>
            <ChartPanel
              title="Today's status"
              description="Your attendance mix"
              icon={UserCheck}
              accent="emerald"
            >
              {todayBreakdown.length > 0 ? (
                <SalesDonutPanel data={todayBreakdown} />
              ) : (
                <HrmChartEmptyState message="No status for today yet." icon={UserCheck} />
              )}
            </ChartPanel>
          </ChartGridCell>
        </div>

        <ChartPanel
          title="Today's attendance"
          description="Your status, work mode, and hours — same as Attendance"
          icon={UserCheck}
          accent="emerald"
          viewAllHref="/hrm/my-attendance"
        >
          <HrmAttendanceGridPanel
            rows={todayAttendanceRows}
            isLoading={attendanceLoading}
            showEmployee={false}
            viewStorageKey="hrm-employee-dashboard-attendance"
            filename="MyAttendanceTodayExport"
          />
        </ChartPanel>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChartPanel
            title="Quick links"
            description="Common self-service actions"
            icon={Home}
            accent="violet"
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "My attendance", href: "/hrm/my-attendance" },
                { label: "My leave", href: "/hrm/my-leave" },
                { label: "My payslips", href: "/hrm/my-payslips" },
                { label: "My WFH", href: "/hrm/my-wfh" },
              ].map((link) => (
                <Button key={link.href} variant="outline" size="sm" className="h-9 justify-start text-xs" asChild>
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
          </ChartPanel>
        </div>
      </PortalPageShell>
    </HrmGate>
  );
}
