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
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      progressColor: "bg-blue-500/40"
    },
    { 
      title: "Total Clients", 
      value: stats.totalClients, 
      sub: "managed partners",
      icon: <Building2 className="h-4 w-4" />, 
      color: "border-l-violet-500",
      iconColor: "text-violet-500",
      bgColor: "bg-violet-500/10",
      progressColor: "bg-violet-500/40"
    },
    { 
      title: "Team Online", 
      value: stats.teamMembersOnline, 
      sub: "currently active",
      icon: <Users className="h-4 w-4" />, 
      color: "border-l-green-500",
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
      progressColor: "bg-green-500/40"
    },
    { 
      title: "Overdue Projects", 
      value: stats.overdueProjects, 
      sub: "needs attention",
      icon: <AlertCircle className="h-4 w-4" />, 
      color: "border-l-red-500",
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10",
      progressColor: "bg-red-500/40",
      isAlert: stats.overdueProjects > 0,
      danger: true
    },
    { 
      title: "APKs Due Today", 
      value: stats.apksDueToday, 
      sub: "pending releases",
      icon: <Smartphone className="h-4 w-4" />, 
      color: "border-l-amber-500",
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
      progressColor: "bg-amber-500/40"
    },
    { 
      title: "Open Bugs", 
      value: stats.openBugs, 
      sub: "unresolved issues",
      icon: <Activity className="h-4 w-4" />, 
      color: "border-l-orange-500",
      iconColor: "text-orange-500",
      bgColor: "bg-orange-500/10",
      progressColor: "bg-orange-500/40",
      isAlert: stats.openBugs > 0,
      danger: stats.openBugs > 0
    },
    { 
      title: "Open Requests", 
      value: stats.openRequests, 
      sub: "resource queue",
      icon: <Inbox className="h-4 w-4" />, 
      color: "border-l-sky-500",
      iconColor: "text-sky-500",
      bgColor: "bg-sky-500/10",
      progressColor: "bg-sky-500/40",
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
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Live</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time overview of your agency operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi, i) => (
          <Card key={i} className={`bg-card border-l-4 transition-colors hover:bg-muted/40 card-hover ${kpi.color} ${kpi.danger ? "bg-red-500/5" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {kpi.title}
              </CardTitle>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ring-1 ring-white/10 ${kpi.bgColor} ${kpi.iconColor}`}>
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-black tracking-tight ${kpi.isAlert ? "text-destructive" : ""}`}>{kpi.value}</div>
              <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${kpi.progressColor} progress-fill`} style={{width: `${Math.min((kpi.value / 20) * 100, 100)}%`}} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Recent Activity</CardTitle>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">{stats.recentActivity.length}</Badge>
              </div>
              <CardDescription>Latest actions across the platform</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground opacity-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats.recentActivity.map((activity, i) => (
                <div key={i} className="relative pl-6 before:absolute before:left-[7px] before:top-0 before:bottom-0 before:w-px before:bg-border group">
                  <div className={`absolute left-0 top-[5px] h-3.5 w-3.5 rounded-full border-2 border-background ${activityColors[i % activityColors.length]}`} />
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-none">
                        <span className="font-bold">{activity.actorName}</span>
                        <span className="text-muted-foreground mx-1.5">
                          {activity.action}
                        </span>
                        <span className="font-semibold">{activity.entityName}</span>
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground opacity-40 mb-4" />
                  <p className="text-sm text-muted-foreground font-medium">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Project Pipeline</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
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

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Bug Severity</CardTitle>
              <CardDescription>Open issues by priority</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bugData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={60} />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--card-foreground))", borderRadius: "8px" }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
      </div>
    </div>
  );
}
