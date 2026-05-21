import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListProjects, useGetProjectAnalytics, getGetProjectAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiSimpleCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

export default function ClientAnalytics() {
  const { user } = useAuth();
  
  // For a client, we get their first active project
  const { data: projectsData } = useListProjects({ limit: 1 });
  const projectId = projectsData?.projects[0]?.id;

  const { data: analytics, isLoading } = useGetProjectAnalytics(projectId!, {
    query: { 
      queryKey: getGetProjectAnalyticsQueryKey(projectId!), 
      enabled: !!projectId 
    }
  });

  if (isLoading || !projectId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Project Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Project Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Deep dive into project metrics</p>
        </div>
      </div>

      <PageKpiRow>
        <KpiSimpleCard label="Completion" value={`${analytics.averageCompletionPct}%`} />
        <KpiSimpleCard label="Hours logged" value={analytics.totalHoursLogged} />
        <KpiSimpleCard label="Contributors" value={analytics.developerContributions?.length ?? 0} />
        <KpiSimpleCard label="Work categories" value={analytics.workCategoryBreakdown?.length ?? 0} />
      </PageKpiRow>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Progress Over Time</CardTitle>
            <CardDescription className="text-xs">Track project completion percentage</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.completionOverTime}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    tick={{fontSize: 10}}
                    tickFormatter={(val) => val ? new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''} 
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={true} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Work Category Distribution</CardTitle>
            <CardDescription className="text-xs">How development time is allocated</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[300px]">
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
                    {analytics.workCategoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '10px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card md:col-span-2">
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Team Contribution (Hours)</CardTitle>
            <CardDescription className="text-xs">Hours logged per team member</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.developerContributions} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
                  <YAxis dataKey="developerName" type="category" stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
                  <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                  <Bar dataKey="hours" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
