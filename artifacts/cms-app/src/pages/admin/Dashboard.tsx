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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
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
    { 
      title: "Active Projects", 
      value: stats.activeProjects, 
      sub: "across all clients",
      icon: <Briefcase className="h-4 w-4" />, 
      color: "border-l-blue-500",
      iconColor: "text-blue-500"
    },
    { 
      title: "Total Clients", 
      value: stats.totalClients, 
      sub: "managed partners",
      icon: <Building2 className="h-4 w-4" />, 
      color: "border-l-green-500",
      iconColor: "text-green-500"
    },
    { 
      title: "Team Online", 
      value: stats.teamMembersOnline, 
      sub: "currently active",
      icon: <Users className="h-4 w-4" />, 
      color: "border-l-purple-500",
      iconColor: "text-purple-500"
    },
    { 
      title: "Overdue Projects", 
      value: stats.overdueProjects, 
      sub: "needs attention",
      icon: <AlertCircle className="h-4 w-4" />, 
      color: "border-l-red-500",
      iconColor: "text-red-500",
      isAlert: stats.overdueProjects > 0
    },
    { 
      title: "APKs Due Today", 
      value: stats.apksDueToday, 
      sub: "pending releases",
      icon: <Smartphone className="h-4 w-4" />, 
      color: "border-l-amber-500",
      iconColor: "text-amber-500"
    },
    { 
      title: "Open Bugs", 
      value: stats.openBugs, 
      sub: "unresolved issues",
      icon: <Activity className="h-4 w-4" />, 
      color: "border-l-orange-500",
      iconColor: "text-orange-500",
      isAlert: stats.openBugs > 0
    },
    { 
      title: "Open Requests", 
      value: stats.openRequests, 
      sub: "resource queue",
      icon: <Inbox className="h-4 w-4" />, 
      color: "border-l-indigo-500",
      iconColor: "text-indigo-500",
      isAlert: stats.openRequests > 0
    },
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

  const activityColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-indigo-500"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi, i) => (
          <Card key={i} className={`bg-card border-l-4 ${kpi.color}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.title}
              </CardTitle>
              <div className={kpi.iconColor}>{kpi.icon}</div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.isAlert ? "text-destructive" : ""}`}>{kpi.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
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
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--card-foreground))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--card-foreground))" }}
                    cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card border-border">
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
                    cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--card-foreground))", borderRadius: "8px" }}
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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {stats.recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center gap-4">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className={`${activityColors[i % activityColors.length]} text-white text-xs`}>
                    {activity.actorName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    <span className="font-bold">{activity.actorName}</span>
                    <span className="text-muted-foreground mx-1.5 font-normal">
                      {activity.action}
                    </span>
                    <span className="font-semibold">{activity.entityName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
                {activity.action.includes('created') && (
                  <Badge variant="outline" className="bg-green-500/5 text-green-500 border-green-500/20 text-[10px]">NEW</Badge>
                )}
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
                No recent activity recorded
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
