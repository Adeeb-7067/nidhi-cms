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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/projects">
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{project.clientName} • Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0 h-4">{project.status.replace('_', ' ').toUpperCase()}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{project.priority.toUpperCase()}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-8">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="team" className="text-xs">Team</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          <TabsTrigger value="apk" className="text-xs">APK</TabsTrigger>
          <TabsTrigger value="bugs" className="text-xs">Bugs</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
          <TabsTrigger value="comments" className="text-xs">Comments</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs">Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2 bg-card">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div>
                  <h4 className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Description</h4>
                  <p className="text-xs">{project.description || "No description provided."}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Tech Stack</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {project.techStack?.map(tech => (
                      <Badge key={tech} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{tech}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm">Links</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-500 hover:underline">
                    <Github className="mr-2 h-3.5 w-3.5" /> Repository
                  </a>
                )}
                {project.figmaUrl && (
                  <a href={project.figmaUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-pink-500 hover:underline">
                    <Layout className="mr-2 h-3.5 w-3.5" /> Figma Design
                  </a>
                )}
                {project.stagingUrl && (
                  <a href={project.stagingUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-amber-500 hover:underline">
                    <Globe className="mr-2 h-3.5 w-3.5" /> Staging Environment
                  </a>
                )}
                {project.productionUrl && (
                  <a href={project.productionUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-green-500 hover:underline">
                    <Globe className="mr-2 h-3.5 w-3.5" /> Production URL
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Project Team</CardTitle>
                <Button size="sm" className="h-7 text-xs">Add Member</Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                {members?.map(member => (
                  <div key={member.userId} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground">{member.designation} • {member.subType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{member.completionPct}% completed</p>
                      <p className="text-[10px] text-muted-foreground">Last log: {member.lastLogDate ? new Date(member.lastLogDate).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                ))}
                {(!members || members.length === 0) && (
                  <div className="text-center py-6 text-muted-foreground text-xs">No team members assigned to this project.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Completion Over Time</CardTitle>
              <CardDescription className="text-xs">Track project progress against deadlines</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-[280px]">
                {analytics?.completionOverTime && analytics.completionOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.completionOverTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString()} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: '10px' }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No analytics data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apk" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-sm">APK Releases</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Version</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Platform</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Uploaded By</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apks?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-20 text-xs">No APK releases yet</TableCell>
                    </TableRow>
                  ) : (
                    apks?.map((apk) => (
                      <TableRow key={apk.id} className="text-xs">
                        <TableCell className="font-medium">v{apk.version} ({apk.buildNumber})</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{apk.releaseType}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{apk.platform}</TableCell>
                        <TableCell className="text-muted-foreground">{apk.uploaderName}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(apk.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs"><Download className="h-3 w-3 mr-1.5" /> Download</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Project Bugs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">ID</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Title</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Severity</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Reporter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugs?.bugs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-20 text-xs">No bugs reported</TableCell>
                    </TableRow>
                  ) : (
                    bugs?.bugs.map((bug) => (
                      <TableRow key={bug.id} className="text-xs">
                        <TableCell className="font-mono text-[10px] text-muted-foreground">{bug.bugNumber}</TableCell>
                        <TableCell className="font-medium">{bug.title}</TableCell>
                        <TableCell>
                          <Badge className={`${getSeverityColor(bug.severity)} text-[10px] px-1.5 py-0 h-4`}>
                            {bug.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${getBugStatusColor(bug.status)} text-[10px] px-1.5 py-0 h-4`}>
                            {bug.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{bug.reporterName}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Developer Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-3">
                {logs?.logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 text-xs">No logs available for this project</div>
                ) : (
                  logs?.logs.map(log => (
                    <div key={log.id} className="border border-border rounded-lg p-3 bg-background/50">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <h4 className="text-xs font-medium">{log.taskTitle}</h4>
                          <p className="text-[10px] text-muted-foreground">By {log.developerName} on {new Date(log.logDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm">{log.hoursSpent}h</span>
                          <p className="text-[10px] text-green-500 font-medium">{log.completionPct}% complete</p>
                        </div>
                      </div>
                      {log.taskDescription && <p className="text-xs mt-1 text-foreground/80">{log.taskDescription}</p>}
                      <div className="flex gap-1.5 mt-2">
                        {log.workCategories.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Project Comments</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-3">
                {comments?.comments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 text-xs">No comments yet</div>
                ) : (
                  comments?.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3 border-b border-border pb-3 last:border-0">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 text-xs">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-xs">{comment.authorName}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-foreground/90">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Resource Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Title</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Requester</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-20 text-xs">No requests found</TableCell>
                    </TableRow>
                  ) : (
                    requests?.requests.map((req) => (
                      <TableRow key={req.id} className="text-xs">
                        <TableCell className="capitalize">{req.type.replace('_', ' ')}</TableCell>
                        <TableCell className="font-medium">{req.title}</TableCell>
                        <TableCell className="text-muted-foreground">{req.developerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${
                            req.status === 'pending' ? 'text-blue-500 border-blue-500/20 bg-blue-500/10' : 
                            req.status === 'approved' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 
                            'text-red-500 border-red-500/20 bg-red-500/10'
                          } text-[10px] px-1.5 py-0 h-4`}>
                            {req.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
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
