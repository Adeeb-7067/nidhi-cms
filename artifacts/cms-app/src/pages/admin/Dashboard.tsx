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
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[360px]" />
          <Skeleton className="col-span-3 h-[360px]" />
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
      icon: <Briefcase className="h-3.5 w-3.5" />, 
      color: "border-l-blue-500",
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      progressColor: "bg-blue-500/50"
    },
    { 
      title: "Total Clients", 
      value: stats.totalClients, 
      sub: "managed partners",
      icon: <Building2 className="h-3.5 w-3.5" />, 
      color: "border-l-violet-500",
      iconColor: "text-violet-500",
      bgColor: "bg-violet-500/10",
      progressColor: "bg-violet-500/50"
    },
    { 
      title: "Team Online", 
      value: stats.teamMembersOnline, 
      sub: "currently active",
      icon: <Users className="h-3.5 w-3.5" />, 
      color: "border-l-green-500",
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
      progressColor: "bg-green-500/50"
    },
    { 
      title: "Overdue", 
      value: stats.overdueProjects, 
      sub: "needs attention",
      icon: <AlertCircle className="h-3.5 w-3.5" />, 
      color: "border-l-red-500",
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10",
      progressColor: "bg-red-500/50",
      isAlert: stats.overdueProjects > 0,
      danger: true
    },
    { 
      title: "APKs Due", 
      value: stats.apksDueToday, 
      sub: "pending releases",
      icon: <Smartphone className="h-3.5 w-3.5" />, 
      color: "border-l-amber-500",
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
      progressColor: "bg-amber-500/50"
    },
    { 
      title: "Open Bugs", 
      value: stats.openBugs, 
      sub: "unresolved issues",
      icon: <Activity className="h-3.5 w-3.5" />, 
      color: "border-l-orange-500",
      iconColor: "text-orange-500",
      bgColor: "bg-orange-500/10",
      progressColor: "bg-orange-500/50",
      isAlert: stats.openBugs > 0,
      danger: stats.openBugs > 0
    },
    { 
      title: "Requests", 
      value: stats.openRequests, 
      sub: "resource queue",
      icon: <Inbox className="h-3.5 w-3.5" />, 
      color: "border-l-sky-500",
      iconColor: "text-sky-500",
      bgColor: "bg-sky-500/10",
      progressColor: "bg-sky-500/50",
      isAlert: stats.openRequests > 0
    },
  ];

  const pipelineData = [
    { name: "Scoping", value: stats.projectPipeline.scoping },
    { name: "In Progress", value: stats.projectPipeline.inProgress },
    { name: "UAT", value: stats.projectPipeline.uat },
    { name: "On Hold", value: stats.projectPipeline.onHold },
    { name: "Done", value: stats.projectPipeline.completed },
  ];

  const bugData = [
    { name: "Critical", value: stats.bugSeverityBreakdown.critical, color: "#ef4444" },
    { name: "High", value: stats.bugSeverityBreakdown.high, color: "#f97316" },
    { name: "Medium", value: stats.bugSeverityBreakdown.medium, color: "#f59e0b" },
    { name: "Low", value: stats.bugSeverityBreakdown.low, color: "#22c55e" },
  ];

  const activityColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-indigo-500"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Live</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Command Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time overview of your agency operations</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi, i) => (
          <Card key={i} className={`bg-card border-l-[3px] transition-all hover:bg-muted/40 card-hover ${kpi.color} ${kpi.danger ? "bg-red-500/5" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-3">
              <CardTitle className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {kpi.title}
              </CardTitle>
              <div className={`h-7 w-7 rounded-md flex items-center justify-center ${kpi.bgColor} ${kpi.iconColor}`}>
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className={`text-2xl font-bold tracking-tight ${kpi.isAlert ? "text-destructive" : ""}`}>{kpi.value}</div>
              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${kpi.progressColor} progress-fill`} style={{width: `${Math.min((kpi.value / 20) * 100, 100)}%`}} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-none">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold">{stats.recentActivity.length}</Badge>
              </div>
              <CardDescription className="text-[11px] mt-0.5">Latest actions across the platform</CardDescription>
            </div>
            <Activity className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-4">
              {stats.recentActivity.map((activity, i) => (
                <div key={i} className="relative pl-5 before:absolute before:left-[6px] before:top-0 before:bottom-0 before:w-px before:bg-border">
                  <div className={`absolute left-0 top-[4px] h-3 w-3 rounded-full border-2 border-background ${activityColors[i % activityColors.length]}`} />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-none">
                        <span className="font-semibold">{activity.actorName}</span>
                        <span className="text-muted-foreground mx-1">{activity.action}</span>
                        <span className="font-medium">{activity.entityName}</span>
                      </p>
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
              {stats.recentActivity.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground opacity-30 mb-3" />
                  <p className="text-xs text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Project Pipeline</CardTitle>
              <CardDescription className="text-[11px]">Current status distribution</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--card-foreground))", borderRadius: "6px", fontSize: "11px" }}
                      cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Bug Severity</CardTitle>
              <CardDescription className="text-[11px]">Open issues by priority</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bugData} layout="vertical" margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} width={50} />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--card-foreground))", borderRadius: "6px", fontSize: "11px" }}
                    />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
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
