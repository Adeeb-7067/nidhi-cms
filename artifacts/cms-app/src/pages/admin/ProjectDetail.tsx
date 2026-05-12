import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetProject, 
  getGetProjectQueryKey,
  useGetProjectMembers,
  getGetProjectMembersQueryKey,
  useGetProjectAnalytics,
  getGetProjectAnalyticsQueryKey,
  useGetApkReleases,
  getGetApkReleasesQueryKey,
  useGetProjectBugs,
  getGetProjectBugsQueryKey,
  useGetProjectLogs,
  getGetProjectLogsQueryKey,
  useListComments,
  getListCommentsQueryKey,
  useListRequests,
  getListRequestsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Users, Github, Layout, Globe, Calendar, Clock, Download, Bug, MessageSquare, 
  Smartphone, FileText, CheckCircle, XCircle 
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";

export default function AdminProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: members } = useGetProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectMembersQueryKey(projectId) }
  });

  const { data: analytics } = useGetProjectAnalytics(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectAnalyticsQueryKey(projectId) }
  });

  const { data: apks } = useGetApkReleases(projectId, {
    query: { enabled: !!projectId, queryKey: getGetApkReleasesQueryKey(projectId) }
  });

  const { data: bugs } = useGetProjectBugs(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectBugsQueryKey(projectId) }
  });

  const { data: logs } = useGetProjectLogs(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectLogsQueryKey(projectId) }
  });

  const { data: comments } = useListComments({ threadType: "project", threadId: projectId }, {
    query: { enabled: !!projectId, queryKey: getListCommentsQueryKey({ threadType: "project", threadId: projectId }) }
  });

  const { data: requests } = useListRequests({ projectId, limit: 50 }, {
    query: { enabled: !!projectId, queryKey: getListRequestsQueryKey({ projectId, limit: 50 }) }
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!project) return <div>Project not found</div>;

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-500 text-white border-red-500';
      case 'high': return 'bg-orange-500 text-white border-orange-500';
      case 'medium': return 'bg-amber-500 text-white border-amber-500';
      case 'low': return 'bg-green-500 text-white border-green-500';
      default: return '';
    }
  };

  const getBugStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'in_progress': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'fixed': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'verified': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/projects">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">{project.clientName} • Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">{project.status.replace('_', ' ').toUpperCase()}</Badge>
          <Badge variant="outline">{project.priority.toUpperCase()}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="apk">APK</TabsTrigger>
          <TabsTrigger value="bugs">Bugs</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 bg-card">
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{project.description || "No description provided."}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack?.map(tech => (
                      <Badge key={tech} variant="secondary">{tech}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer" className="flex items-center text-sm text-blue-500 hover:underline">
                    <Github className="mr-2 h-4 w-4" /> Repository
                  </a>
                )}
                {project.figmaUrl && (
                  <a href={project.figmaUrl} target="_blank" rel="noreferrer" className="flex items-center text-sm text-pink-500 hover:underline">
                    <Layout className="mr-2 h-4 w-4" /> Figma Design
                  </a>
                )}
                {project.stagingUrl && (
                  <a href={project.stagingUrl} target="_blank" rel="noreferrer" className="flex items-center text-sm text-amber-500 hover:underline">
                    <Globe className="mr-2 h-4 w-4" /> Staging Environment
                  </a>
                )}
                {project.productionUrl && (
                  <a href={project.productionUrl} target="_blank" rel="noreferrer" className="flex items-center text-sm text-green-500 hover:underline">
                    <Globe className="mr-2 h-4 w-4" /> Production URL
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Team</CardTitle>
                <Button size="sm">Add Member</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members?.map(member => (
                  <div key={member.userId} className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.designation} • {member.subType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{member.completionPct}% completed</p>
                      <p className="text-xs text-muted-foreground">Last log: {member.lastLogDate ? new Date(member.lastLogDate).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                ))}
                {(!members || members.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">No team members assigned to this project.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Completion Over Time</CardTitle>
              <CardDescription>Track project progress against deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {analytics?.completionOverTime && analytics.completionOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.completionOverTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => new Date(val).toLocaleDateString()} />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No analytics data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apk" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>APK Releases</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apks?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">No APK releases yet</TableCell>
                    </TableRow>
                  ) : (
                    apks?.map((apk) => (
                      <TableRow key={apk.id}>
                        <TableCell className="font-medium">v{apk.version} ({apk.buildNumber})</TableCell>
                        <TableCell>
                          <Badge variant="outline">{apk.releaseType}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{apk.platform}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{apk.uploaderName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(apk.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost"><Download className="h-4 w-4 mr-2" /> Download</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Project Bugs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reporter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugs?.bugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No bugs reported</TableCell>
                    </TableRow>
                  ) : (
                    bugs?.bugs.map((bug) => (
                      <TableRow key={bug.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{bug.bugNumber}</TableCell>
                        <TableCell className="font-medium">{bug.title}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(bug.severity)}>
                            {bug.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getBugStatusColor(bug.status)}>
                            {bug.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{bug.reporterName}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Developer Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs?.logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No logs available for this project</div>
                ) : (
                  logs?.logs.map(log => (
                    <div key={log.id} className="border border-border rounded-lg p-4 bg-background/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{log.taskTitle}</h4>
                          <p className="text-sm text-muted-foreground">By {log.developerName} on {new Date(log.logDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-lg">{log.hoursSpent}h</span>
                          <p className="text-xs text-green-500 font-medium">{log.completionPct}% complete</p>
                        </div>
                      </div>
                      {log.taskDescription && <p className="text-sm mt-2 text-foreground/80">{log.taskDescription}</p>}
                      <div className="flex gap-2 mt-3">
                        {log.workCategories.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Project Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comments?.comments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No comments yet</div>
                ) : (
                  comments?.comments.map(comment => (
                    <div key={comment.id} className="flex gap-4 border-b border-border pb-4 last:border-0">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.authorName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground/90">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Resource Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No requests found</TableCell>
                    </TableRow>
                  ) : (
                    requests?.requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="capitalize text-sm">{req.type.replace('_', ' ')}</TableCell>
                        <TableCell className="font-medium">{req.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{req.developerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            req.status === 'pending' ? 'text-blue-500 border-blue-500/20 bg-blue-500/10' : 
                            req.status === 'approved' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 
                            'text-red-500 border-red-500/20 bg-red-500/10'
                          }>
                            {req.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
