import React from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Users, Building2, AlertCircle, Smartphone, Inbox, Activity } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[400px]" />
          <Skeleton className="col-span-3 h-[400px]" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    { title: "Active Projects", value: stats.activeProjects, icon: <Briefcase className="h-4 w-4 text-muted-foreground" /> },
    { title: "Total Clients", value: stats.totalClients, icon: <Building2 className="h-4 w-4 text-muted-foreground" /> },
    { title: "Team Online", value: stats.teamMembersOnline, icon: <Users className="h-4 w-4 text-muted-foreground" /> },
    { title: "Overdue Projects", value: stats.overdueProjects, icon: <AlertCircle className="h-4 w-4 text-destructive" /> },
    { title: "APKs Due Today", value: stats.apksDueToday, icon: <Smartphone className="h-4 w-4 text-amber-500" /> },
    { title: "Open Bugs", value: stats.openBugs, icon: <Activity className="h-4 w-4 text-destructive" /> },
    { title: "Open Requests", value: stats.openRequests, icon: <Inbox className="h-4 w-4 text-primary" /> },
  ];

  const pipelineData = [
    { name: "Scoping", value: stats.projectPipeline.scoping },
    { name: "In Progress", value: stats.projectPipeline.inProgress },
    { name: "UAT", value: stats.projectPipeline.uat },
    { name: "On Hold", value: stats.projectPipeline.onHold },
    { name: "Completed", value: stats.projectPipeline.completed },
  ];

  const bugData = [
    { name: "Critical", value: stats.bugSeverityBreakdown.critical, color: "#ef4444" },
    { name: "High", value: stats.bugSeverityBreakdown.high, color: "#f97316" },
    { name: "Medium", value: stats.bugSeverityBreakdown.medium, color: "#f59e0b" },
    { name: "Low", value: stats.bugSeverityBreakdown.low, color: "#22c55e" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi, i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card">
          <CardHeader>
            <CardTitle>Project Pipeline</CardTitle>
            <CardDescription>Current status of all projects</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--card-foreground))" }}
                    itemStyle={{ color: "hsl(var(--card-foreground))" }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card">
          <CardHeader>
            <CardTitle>Open Bugs by Severity</CardTitle>
            <CardDescription>System-wide issue tracker</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bugData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--card-foreground))" }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                    {bugData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {stats.recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.actorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.action} {activity.entityName}
                  </p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <div className="text-center text-muted-foreground py-4">No recent activity</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
