import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListProjects, useGetProjectAnalytics, getGetProjectAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Project Analytics</h1>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Analytics</h1>
          <p className="text-muted-foreground">Deep dive into project metrics</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Progress Over Time</CardTitle>
            <CardDescription>Track project completion percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.completionOverTime}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    tickFormatter={(val) => val ? new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''} 
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={true} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Work Category Distribution</CardTitle>
            <CardDescription>How development time is allocated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.workCategoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {analytics.workCategoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card md:col-span-2">
          <CardHeader>
            <CardTitle>Team Contribution (Hours)</CardTitle>
            <CardDescription>Hours logged per team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.developerContributions} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="developerName" type="category" stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="hours" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
