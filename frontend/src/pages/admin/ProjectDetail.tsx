import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
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
  getListRequestsQueryKey,
  useGetProjectMilestones,
  getGetProjectMilestonesQueryKey,
  useCreateMilestone,
  useGetProjectHistory,
  getGetProjectHistoryQueryKey
} from "@/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, MapPin } from "lucide-react";
import { ProjectTimelineView } from "@/components/ui/project-timeline-view";
import { ProjectInventoryPanel } from "@/components/inventory/ProjectInventoryPanel";
import { ProjectHubNav, type ProjectHubTab } from "@/components/project/ProjectHubNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiSimpleCard } from "@/components/dashboard/dashboard-kit";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Users, Github, Layout, Globe, Calendar, Clock, Download, Bug, MessageSquare, 
  Smartphone, FileText, CheckCircle, XCircle, Lock, FileJson 
} from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getProjectsListHref } from "@/lib/project-routes";
import { ProjectPriorityBanner } from "@/components/project/ProjectPriorityBanner";
import { ProjectTeamPanel } from "@/components/project/ProjectTeamPanel";
import { getDiscussionsHref } from "@/lib/discussions-navigation";

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.string().min(1, "Target date is required"),
  status: z.enum(["pending", "completed", "delayed"]),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

export default function AdminProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = Number(id);
  const discussionsHref = getDiscussionsHref(projectId);

  const openDiscussions = () => setLocation(discussionsHref);
  const { user } = useAuth();
  const projectsListHref = getProjectsListHref(user?.role);
  const { socket } = useRealtime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (socket && projectId) {
      const handleNewComment = (data: any) => {
        if (data.threadType === "project" && data.threadId === projectId) {
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey({ threadType: "project", threadId: projectId }) });
        }
      };

      socket.on("comment", handleNewComment);
      return () => {
        socket.off("comment", handleNewComment);
      };
    }
    return undefined;
  }, [socket, projectId, queryClient]);

  const handleCopyPostman = () => {
    if (!project?.postmanJson) return;
    navigator.clipboard.writeText(project.postmanJson);
    toast.success("Postman JSON copied to clipboard");
  };

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

  const { data: milestones } = useGetProjectMilestones(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectMilestonesQueryKey(projectId) }
  });
  
  const { data: history } = useGetProjectHistory(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectHistoryQueryKey(projectId) }
  });

  const [activeTab, setActiveTab] = useState<ProjectHubTab>("overview");
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const createMilestoneMutation = useCreateMilestone();

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: "",
      description: "",
      targetDate: new Date().toISOString().split('T')[0],
      status: "pending",
    },
  });

  const onMilestoneSubmit = async (values: MilestoneFormValues) => {
    try {
      await createMilestoneMutation.mutateAsync({
        id: projectId,
        data: values as any
      });
      toast.success("Milestone registered successfully!");
      setMilestoneOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getGetProjectMilestonesQueryKey(projectId) });
    } catch (err: any) {
      toastApiError(err, "Failed to submit milestone.");
    }
  };

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
      <div className="ui-card p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Link href={projectsListHref}>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg" aria-label="Back to projects">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {project.clientName} · Due {new Date(project.deadline).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Badge className="rounded-full px-3 py-1 capitalize">{project.status.replace("_", " ")}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">{project.priority} priority</Badge>
          </div>
        </div>
      </div>

      <ProjectPriorityBanner priority={project.priority} />

      <ProjectHubNav value={activeTab} onChange={setActiveTab} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProjectHubTab)} className="w-full">
        
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
                {project.adminUrl && (
                  <a href={project.adminUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-indigo-500 hover:underline">
                    <Lock className="mr-2 h-3.5 w-3.5" /> Admin Portal
                  </a>
                )}
                {project.websiteUrl && (
                  <a href={project.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-teal-500 hover:underline">
                    <Globe className="mr-2 h-3.5 w-3.5" /> Website URL
                  </a>
                )}
                {project.postmanJson && (
                  <Button onClick={handleCopyPostman} variant="outline" className="h-7 w-full text-[10px] mt-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5">
                    <FileJson className="mr-1.5 h-3 w-3 text-primary" /> Copy Postman JSON
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <ProjectTeamPanel
            projectId={projectId}
            onViewProjectLogs={() => setActiveTab("logs")}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <KpiSimpleCard label="Completion" value={`${analytics?.averageCompletionPct ?? project.completionPct}%`} />
            <KpiSimpleCard label="Hours logged" value={analytics?.totalHoursLogged ?? 0} />
            <KpiSimpleCard label="Open bugs" value={bugs?.bugs?.length ?? bugs?.total ?? 0} />
            <KpiSimpleCard label="Team size" value={members?.length ?? 0} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card">
              <CardHeader className="p-3"><CardTitle className="text-sm">Completion over time</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0"><div className="h-[240px]">{analytics?.completionOverTime?.length ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.completionOverTime}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString()} /><YAxis fontSize={10} /><RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>) : (<p className="flex h-full items-center justify-center text-muted-foreground text-xs">No completion history yet</p>)}</div></CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="p-3"><CardTitle className="text-sm">Hours per week</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0"><div className="h-[240px]">{analytics?.hoursPerWeek?.length ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.hoursPerWeek}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>) : (<p className="flex h-full items-center justify-center text-muted-foreground text-xs">No hours logged yet</p>)}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <ProjectInventoryPanel projectId={projectId} />
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
            <CardHeader className="p-3 flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm">Project Comments</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={openDiscussions}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Open discussions
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-3">
                {comments?.comments.length === 0 ? (
                  <button
                    type="button"
                    onClick={openDiscussions}
                    className="w-full text-center text-muted-foreground py-6 text-xs border border-dashed rounded-lg hover:bg-muted/40 hover:text-foreground transition-colors"
                  >
                    No comments yet — open discussions to start a thread
                  </button>
                ) : (
                  comments?.comments.map((comment) => (
                    <button
                      key={comment.id}
                      type="button"
                      onClick={openDiscussions}
                      className="flex w-full gap-3 border-b border-border pb-3 last:border-0 text-left rounded-md hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-1 -mx-1"
                      aria-label={`Open discussions — comment by ${comment.authorName}`}
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 text-xs">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-xs">{comment.authorName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90">{comment.content}</p>
                      </div>
                    </button>
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

        <TabsContent value="timeline" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Project Lifespan & Milestones</h3>
              <p className="text-[10px] text-muted-foreground">Chronological map tracking target phases and completion thresholds.</p>
            </div>
            
            <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-sm">Add Phase Milestone</DialogTitle>
                  <DialogDescription className="text-[10px]">Deploy a specific targeted checklist element directly to the timeline tracker.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onMilestoneSubmit)} className="space-y-3.5 pt-3">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Milestone Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Backend v1 Released" className="h-8 text-xs" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="targetDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Target Date</FormLabel>
                            <FormControl>
                              <Input type="date" className="h-8 text-xs" {...field} />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="delayed">Delayed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Brief Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Critical deliverables included in this milestone." className="min-h-[60px] text-xs" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="pt-2">
                      <Button type="submit" disabled={createMilestoneMutation.isPending} size="sm" className="h-8 text-xs">
                        {createMilestoneMutation.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                        Save Milestone
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <ProjectTimelineView 
            startDate={project?.startDate || new Date().toISOString()} 
            deadline={project?.deadline || new Date().toISOString()} 
            milestones={(milestones as any) || []} 
          />

          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-xs">Chronological Inventory</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Phase / Milestone</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Due Date</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Delivered Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!milestones || (milestones as any).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-16 text-[11px]">No timeline milestones recorded.</TableCell>
                    </TableRow>
                  ) : (
                    [...(milestones as any)].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()).map((m: any) => (
                      <TableRow key={m.id} className="text-[11px]">
                        <TableCell className="font-medium flex items-center gap-1.5 py-2.5">
                          <MapPin className="h-3 w-3 text-primary/70" />
                          <div>
                            <div>{m.title}</div>
                            {m.description && <div className="text-[9px] text-muted-foreground font-normal">{m.description}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">{new Date(m.targetDate).toLocaleDateString()}</TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 font-semibold ${
                            m.status === 'completed' ? 'text-green-500 border-green-500/20 bg-green-500/10' :
                            m.status === 'delayed' ? 'text-rose-500 border-rose-500/20 bg-rose-500/10' :
                            'text-blue-500 border-blue-500/20 bg-blue-500/10'
                          }`}>
                            {m.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-muted-foreground">{m.status === 'completed' ? "Attestation Confirmed" : "Pending Deployment"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="bg-card">
            <CardHeader className="p-3">
              <CardTitle className="text-xs">Audit History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Action</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Changes</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!history || history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground h-16 text-xs">No history recorded.</TableCell>
                      </TableRow>
                    ) : (
                      history.map((h) => (
                        <TableRow key={h.id} className="text-[11px]">
                          <TableCell className="font-medium align-top py-2.5">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase">{h.action}</Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            {h.action === "update" ? (
                              <div className="space-y-1">
                                {Object.keys(h.newVal || {}).map(key => (
                                  <div key={key}>
                                    <span className="font-semibold text-primary">{key}:</span>{" "}
                                    <span className="text-muted-foreground line-through">{(h.oldVal as any)?.[key]}</span>{" "}
                                    <span>{(h.newVal as any)?.[key]}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">Entity {h.action}d</div>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 text-muted-foreground align-top">
                            {new Date(h.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
