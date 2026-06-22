import React from "react";
import { useClientTeam } from "@/contexts/ClientTeamContext";
import { useListProjects, useGetProjectAnalytics, getGetProjectAnalyticsQueryKey } from "@/api";
import { ClientProjectTeamCard } from "@/components/presence/ClientProjectTeamCard";
import { AnalyticsChartsSkeleton } from "@/components/loading";
import {
  PortalPageShell,
  PortalKpiGrid,
} from "@/components/layout/portal-page-kit";
import {
  DashboardPageHeader,
  DashboardSectionLabel,
} from "@/components/dashboard/dashboard-page-kit";
import {
  ChartPanel,
  ChartGridCell,
  ChartEmptyState,
} from "@/components/dashboard/admin-dashboard-charts";
import { BarChart3, Clock, TrendingUp, Users, PieChart as PieChartIcon, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

const chartTooltip = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  fontSize: 11,
  borderRadius: 8,
};

export default function ClientAnalytics() {
  const team = useClientTeam();
  const { data: projectsData } = useListProjects({ limit: 1 });
  const projectId = projectsData?.projects[0]?.id;
  const projectName = projectsData?.projects[0]?.name;

  if (team.isClientUser && !team.isAdmin && !team.can("reports")) {
    return (
      <PortalPageShell>
        <DashboardPageHeader
          title="Reports & Analytics"
          subtitle="You don't have access to this section. Ask your Client Admin to enable it."
        />
      </PortalPageShell>
    );
  }

  const { data: analytics, isLoading } = useGetProjectAnalytics(projectId!, {
    query: {
      queryKey: getGetProjectAnalyticsQueryKey(projectId!),
      enabled: !!projectId,
    },
  });

  if (isLoading || !projectId) {
    return (
      <PortalPageShell>
        <DashboardPageHeader
          title="Project analytics"
          description="Deep dive into project metrics and team contribution"
          breadcrumbs={[{ label: "Client", href: "/client" }, { label: "Analytics" }]}
        />
        <PortalKpiGrid loading count={4} items={[]} />
        <AnalyticsChartsSkeleton />
      </PortalPageShell>
    );
  }

  if (!analytics) return null;

  return (
    <PortalPageShell>
      <DashboardPageHeader
        title="Project analytics"
        description={projectName ? `${projectName} — progress, effort, and team breakdown` : "Deep dive into project metrics"}
        breadcrumbs={[{ label: "Client", href: "/client" }, { label: "Analytics" }]}
      />

      <div className="space-y-2">
        <DashboardSectionLabel title="Overview KPIs" />
        <PortalKpiGrid
          columns={4}
          count={4}
          items={[
            { title: "Completion", value: `${analytics.averageCompletionPct}%`, hint: "Overall progress", icon: TrendingUp, accent: "violet", delay: 0 },
            { title: "Hours logged", value: analytics.totalHoursLogged, hint: "Team effort", icon: Clock, accent: "blue", delay: 1 },
            { title: "Contributors", value: analytics.developerContributions?.length ?? 0, hint: "Active developers", icon: Users, accent: "green", delay: 2 },
            { title: "Work categories", value: analytics.workCategoryBreakdown?.length ?? 0, hint: "Activity types", icon: BarChart3, accent: "amber", delay: 3 },
          ]}
        />
      </div>

      <ClientProjectTeamCard projectId={projectId} />

      <div className="space-y-2">
        <DashboardSectionLabel title="Charts & breakdown" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <ChartGridCell colSpan={5}>
            <ChartPanel
              title="Progress over time"
              description="Track project completion percentage"
              icon={TrendingUp}
              accent="blue"
            >
              {analytics.completionOverTime?.length ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.completionOverTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) =>
                          val ? new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""
                        }
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <RechartsTooltip contentStyle={chartTooltip} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmptyState message="Completion history will appear once the team logs progress." icon={TrendingUp} />
              )}
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={5}>
            <ChartPanel
              title="Work category distribution"
              description="How development time is allocated"
              icon={PieChartIcon}
              accent="violet"
            >
              {analytics.workCategoryBreakdown?.length ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.workCategoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {analytics.workCategoryBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={chartTooltip} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmptyState message="Work categories will appear after daily logs are submitted." icon={PieChartIcon} />
              )}
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={12}>
            <ChartPanel
              title="Team contribution"
              description="Hours logged per team member"
              icon={Activity}
              accent="emerald"
            >
              {analytics.developerContributions?.length ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.developerContributions} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis
                        dataKey="developerName"
                        type="category"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                        width={100}
                      />
                      <RechartsTooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={chartTooltip} />
                      <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmptyState message="Team contribution data will appear as hours are logged." icon={Users} />
              )}
            </ChartPanel>
          </ChartGridCell>
        </div>
      </div>
    </PortalPageShell>
  );
}
