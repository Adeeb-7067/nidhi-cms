import React from "react";
import { useGetDashboardStats, useListRequests, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Users, Bug, Activity, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatCard, PageKpiRow } from "@/components/dashboard/dashboard-kit";

export default function AdminAnalytics() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: requestsData, isLoading: isLoadingRequests } = useListRequests({ limit: 5 });
  const { data: usersData, isLoading: isLoadingUsers } = useListUsers({ role: 'developer', limit: 100 });

  if (isLoading || isLoadingRequests || isLoadingUsers) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[100px] w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[280px] w-full md:col-span-2" />
        </div>
        <Skeleton className="h-[320px] w-full" />
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

  const totalBugs = stats ? 
    stats.bugSeverityBreakdown.critical + 
    stats.bugSeverityBreakdown.high + 
    stats.bugSeverityBreakdown.medium + 
    stats.bugSeverityBreakdown.low : 0;

  const totalProjects = stats ? 
    stats.projectPipeline.scoping + 
    stats.projectPipeline.inProgress + 
    stats.projectPipeline.uat + 
    stats.projectPipeline.onHold + 
    stats.projectPipeline.completed : 0;

  const completionRate = totalProjects > 0 ? 
    Math.round((stats?.projectPipeline.completed || 0) / totalProjects * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Company-wide insights and performance metrics</p>
        </div>
      </div>

      <PageKpiRow>
        <StatCard title="Active bugs" value={totalBugs} hint={`${stats?.bugSeverityBreakdown.critical} critical`} icon={Bug} accent="red" alert={totalBugs > 0} delay={0} />
        <StatCard title="Project health" value={`${completionRate}%`} hint="Overall completion rate" icon={Activity} accent="blue" delay={1} />
        <StatCard title="Team size" value={usersData?.users.length || 0} hint="Active developers" icon={Users} accent="violet" delay={2} />
        <StatCard title="Pending requests" value={requestsData?.requests.filter((r) => r.status === "pending").length || 0} hint="Awaiting approval" icon={Zap} accent="amber" delay={3} />
      </PageKpiRow>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm">Bug Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bugData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {bugData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] mt-2">
              {bugData.map((entry, index) => (
                <div key={entry.name} className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: COLORS[index] }}></span>
                  {entry.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card md:col-span-2">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm">Project Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} cursor={{fill: 'hsl(var(--muted))'}} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm">Resource Request Pipeline</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">Recent developer resource requests awaiting action</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {requestsData?.requests.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center border border-dashed border-border rounded-md text-muted-foreground text-xs">
                No active requests
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <div className="grid grid-cols-4 bg-muted/50 p-2 text-[10px] font-medium text-muted-foreground border-b border-border">
                  <div>DEVELOPER / TYPE</div>
                  <div>TITLE</div>
                  <div>URGENCY</div>
                  <div className="text-right">STATUS / DATE</div>
                </div>
                {requestsData?.requests.map((request) => (
                  <div key={request.id} className="grid grid-cols-4 p-2 text-xs items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium">{request.developerName || "Developer"}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{request.type.replace('_', ' ')}</span>
                    </div>
                    <div className="font-medium truncate pr-4">{request.title}</div>
                    <div>
                      <Badge variant="outline" className={`capitalize text-[10px] px-1.5 py-0 h-4 ${
                        request.urgency === 'high' ? 'border-red-500 text-red-500' :
                        request.urgency === 'medium' ? 'border-amber-500 text-amber-500' :
                        'border-green-500 text-green-500'
                      }`}>
                        {request.urgency}
                      </Badge>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        {request.status === 'pending' ? <Clock className="h-2.5 w-2.5 text-blue-500" /> :
                         request.status === 'approved' ? <CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> :
                         <AlertCircle className="h-2.5 w-2.5 text-red-500" />}
                        <span className={`capitalize font-medium text-[10px] ${
                          request.status === 'pending' ? 'text-blue-500' :
                          request.status === 'approved' ? 'text-green-500' :
                          'text-red-500'
                        }`}>{request.status}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
