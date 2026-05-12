import React from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalytics() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[400px] w-full md:col-span-2 lg:col-span-3" />
        </div>
      </div>
    );
  }

  const bugData = stats ? [
    { name: "Critical", value: stats.bugSeverityBreakdown.critical },
    { name: "High", value: stats.bugSeverityBreakdown.high },
    { name: "Medium", value: stats.bugSeverityBreakdown.medium },
    { name: "Low", value: stats.bugSeverityBreakdown.low },
  ] : [];

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e'];

  const pipelineData = stats ? [
    { name: "Scoping", value: stats.projectPipeline.scoping },
    { name: "In Progress", value: stats.projectPipeline.inProgress },
    { name: "UAT", value: stats.projectPipeline.uat },
    { name: "On Hold", value: stats.projectPipeline.onHold },
    { name: "Completed", value: stats.projectPipeline.completed },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Company-wide insights</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Bug Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bugData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {bugData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2">
              {bugData.map((entry, index) => (
                <div key={entry.name} className="flex items-center">
                  <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index] }}></span>
                  {entry.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card md:col-span-2">
          <CardHeader>
            <CardTitle>Project Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} cursor={{fill: 'hsl(var(--muted))'}} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Team Workload Heatmap</CardTitle>
          <CardDescription>Visualizing developer activity and log hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border border-dashed border-border rounded-md text-muted-foreground">
            Heatmap Chart - Coming Soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
