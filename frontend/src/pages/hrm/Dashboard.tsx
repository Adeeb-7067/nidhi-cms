import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  UserCheck,
  CalendarClock,
  Wallet,
  Timer,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClockInButton } from "@/components/ClockInButton";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmRichDashboard } from "@/modules/hrm/HrmRichDashboard";
import { HrmAttendanceTrendChart } from "@/modules/hrm/dashboard-charts";
import {
  HrmPageShell,
  HrmPageHeader,
  HrmKpiGrid,
  HrmChartCard,
  HrmChartGridCell,
  HrmChartEmptyState,
  HrmSectionLabel,
  HrmFilterBar,
  HrmInsightBanner,
} from "@/modules/hrm/components";
import { useHrmDashboard } from "@/api/hrm";
import { getApiErrorMessage } from "@/lib/api-error";
import { isMonitorableStaffRole } from "@/lib/user-roles";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardPipelineChart } from "@/components/dashboard/admin-dashboard-charts";

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
    <HrmPageShell>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[220px] rounded-xl" />
    </HrmPageShell>
  );
}

export default function HrmDashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("month");
  const { data, isLoading, isError, error } = useHrmDashboard();

  const trendData = useMemo(() => {
    const rows = data?.analytics?.attendanceTrend ?? [];
    if (period === "month") return rows;
    return rows.slice(-Math.min(180, rows.length));
  }, [data?.analytics?.attendanceTrend, period]);

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
        <HrmPageShell>
          <div className="py-16 text-center text-sm text-muted-foreground">
            {getApiErrorMessage(error, "Unable to load HRM dashboard. Please refresh or try again later.")}
          </div>
        </HrmPageShell>
      </HrmGate>
    );
  }

  const view = data.view;

  if (view === "admin" || view === "manager") {
    return (
      <HrmGate module="dashboard">
        <HrmPageShell>
          <HrmRichDashboard data={data} view={view} />
        </HrmPageShell>
      </HrmGate>
    );
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <HrmGate module="dashboard">
      <HrmPageShell>
        <HrmPageHeader
          title={`${getGreeting()}, ${user?.name?.split(" ")[0] ?? "there"}`}
          description={`Your attendance, leave, and pay snapshot · ${today}`}
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Dashboard" }]}
          actions={
            <Button asChild size="sm" variant="outline">
              <Link href="/hrm/my-leave">Apply leave</Link>
            </Button>
          }
        />

        <HrmFilterBar
          period={period}
          onPeriodChange={setPeriod}
          periodOptions={[
            { value: "month", label: "Last 30 days" },
            { value: "6m", label: "Last 6 months" },
          ]}
        />

        {isMonitorableStaffRole(user?.role) && (
          <HrmInsightBanner icon={Timer} title="Work clock" action={<ClockInButton />}>
            <p className="text-sm text-muted-foreground">Clock in to start your monitored work session.</p>
          </HrmInsightBanner>
        )}

        {data.self && (
          <>
            <HrmSectionLabel title="My overview" />
            <HrmKpiGrid
              items={[
                {
                  label: "Attendance this month",
                  value: `${data.self.attendanceMonthPct}%`,
                  hint: "Working days present",
                  icon: UserCheck,
                  accent: "green",
                  href: "/hrm/my-attendance",
                },
                {
                  label: "Active today",
                  value: formatHours(data.self.activeMinutesToday),
                  hint: "Monitored time",
                  icon: Timer,
                  accent: "blue",
                },
                {
                  label: "Leave available",
                  value: String(data.self.leaveAvailableTotal),
                  hint: "Days remaining",
                  icon: CalendarClock,
                  accent: "violet",
                  href: "/hrm/my-leave",
                },
                {
                  label: "Latest net pay",
                  value: data.self.latestNetPay != null ? `₹${data.self.latestNetPay.toLocaleString()}` : "—",
                  hint: "Recent payslip",
                  icon: Wallet,
                  accent: "amber",
                  href: "/hrm/my-payslips",
                },
              ]}
            />
          </>
        )}

        <HrmSectionLabel title="My trends" />
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
          <HrmChartGridCell colSpan={8}>
            <HrmChartCard
              title="My attendance trend"
              icon={TrendingUp}
              viewAllHref="/hrm/my-attendance"
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
            <HrmChartCard title="Today's status" icon={UserCheck} className="min-h-[260px]">
              {(data.analytics?.todayBreakdown?.length ?? 0) > 0 ? (
                <DashboardPipelineChart data={data.analytics!.todayBreakdown} />
              ) : (
                <HrmChartEmptyState message="No status for today yet." icon={UserCheck} />
              )}
            </HrmChartCard>
          </HrmChartGridCell>
        </div>
      </HrmPageShell>
    </HrmGate>
  );
}
