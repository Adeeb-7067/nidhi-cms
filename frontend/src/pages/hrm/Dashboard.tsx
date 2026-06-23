import { useMemo, useState } from "react";
import { Link } from "wouter";
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
import { SalesPageHeader, SalesDonutPanel } from "@/modules/sales/components";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmRichDashboard } from "@/modules/hrm/HrmRichDashboard";
import { HrmAttendanceTrendChart } from "@/modules/hrm/dashboard-charts";
import { HrmChartEmptyState, sliceTrendByDays, type HrmTrendDays } from "@/modules/hrm/components";
import {
  HrmDashboardFilterBar,
  HrmDashboardSectionLabel,
} from "@/modules/hrm/hrm-dashboard-kit";
import { useHrmDashboard } from "@/api/hrm";
import { getApiErrorMessage } from "@/lib/api-error";
import { isMonitorableStaffRole } from "@/lib/user-roles";
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
  const { data, isLoading, isError, error } = useHrmDashboard();

  const trendData = useMemo(() => {
    const rows = data?.analytics?.attendanceTrend ?? [];
    const days = trendDays === "180" ? 180 : Number(trendDays);
    return sliceTrendByDays(rows, days);
  }, [data?.analytics?.attendanceTrend, trendDays]);

  const todayBreakdown = useMemo(
    () =>
      (data?.analytics?.todayBreakdown ?? []).map((row) => ({
        name: row.name,
        count: row.value,
        value: row.value,
      })),
    [data?.analytics?.todayBreakdown],
  );

  if (isLoading) {
    return (
      <HrmGate module="dashboard">
        <DashboardLoading />
      </HrmGate>
    );
  }

  if (isError || !data) {
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

  const view = data.view;

  if (view === "admin" || view === "manager") {
    return (
      <HrmGate module="dashboard">
        <PortalPageShell>
          <HrmRichDashboard data={data} view={view} />
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

        <HrmDashboardFilterBar trendDays={trendDays} onTrendDaysChange={setTrendDays} />

        {isMonitorableStaffRole(user?.role) ? (
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
                <p className="text-xs text-muted-foreground">Clock in to start your monitored work session.</p>
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
