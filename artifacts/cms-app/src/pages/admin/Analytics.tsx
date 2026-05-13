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

export default function AdminAnalytics() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: requestsData, isLoading: isLoadingRequests } = useListRequests({ limit: 5 });
  const { data: usersData, isLoading: isLoadingUsers } = useListUsers({ role: 'developer', limit: 100 });

  if (isLoading || isLoadingRequests || isLoadingUsers) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[350px] w-full md:col-span-2" />
        </div>
        <Skeleton className="h-[400px] w-full" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Company-wide insights and performance metrics</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Bugs</CardTitle>
            <Bug className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBugs}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.bugSeverityBreakdown.critical} critical severity
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Health</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Overall completion rate
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersData?.users.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active developers
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requestsData?.requests.filter(r => r.status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting admin approval
            </p>
          </CardContent>
        </Card>
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
          <CardTitle>Resource Request Pipeline</CardTitle>
          <CardDescription>Recent developer resource requests awaiting action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requestsData?.requests.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center border border-dashed border-border rounded-md text-muted-foreground">
                No active requests
              </div>
            ) : (
              <div className="rounded-md border border-border">
                <div className="grid grid-cols-4 bg-muted/50 p-3 text-xs font-medium text-muted-foreground border-b border-border">
                  <div>DEVELOPER / TYPE</div>
                  <div>TITLE</div>
                  <div>URGENCY</div>
                  <div className="text-right">STATUS / DATE</div>
                </div>
                {requestsData?.requests.map((request) => (
                  <div key={request.id} className="grid grid-cols-4 p-3 text-sm items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium">{request.developerName || "Developer"}</span>
                      <span className="text-xs text-muted-foreground capitalize">{request.type.replace('_', ' ')}</span>
                    </div>
                    <div className="font-medium truncate pr-4">{request.title}</div>
                    <div>
                      <Badge variant="outline" className={`capitalize ${
                        request.urgency === 'high' ? 'border-red-500 text-red-500' :
                        request.urgency === 'medium' ? 'border-amber-500 text-amber-500' :
                        'border-green-500 text-green-500'
                      }`}>
                        {request.urgency}
                      </Badge>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        {request.status === 'pending' ? <Clock className="h-3 w-3 text-blue-500" /> :
                         request.status === 'approved' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> :
                         <AlertCircle className="h-3 w-3 text-red-500" />}
                        <span className={`capitalize font-medium ${
                          request.status === 'pending' ? 'text-blue-500' :
                          request.status === 'approved' ? 'text-green-500' :
                          'text-red-500'
                        }`}>{request.status}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
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
