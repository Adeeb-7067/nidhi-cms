import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useListProjects, 
  useGetApkReleases, 
  useGetProjectMilestones, 
  useGetProjectLogs, 
  useListComments, 
  useCreateComment, 
  useGetProjectAnalytics,
  useListRequests,
  useCreateRequest,
  getListCommentsQueryKey,
  getGetProjectLogsQueryKey,
  getGetProjectAnalyticsQueryKey,
  getListRequestsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { 
  Smartphone, CheckCircle, Clock, Download, ExternalLink, Lock, Globe, Layout, 
  Github, FileJson, Send, MessageSquare, Activity, FileText, User, 
  TrendingUp, BarChart3, PieChart as PieChartIcon, Award, PlusCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  DashboardHero,
  ExecutiveStatCard,
  PageKpiRow,
} from "@/components/dashboard/dashboard-kit";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectTimelineView } from "@/components/ui/project-timeline-view";
import { useRealtime } from "@/contexts/RealtimeContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClientPortal() {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const { data, isLoading } = useListProjects({ limit: 100 });
  const projects = data?.projects ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId(null);
      return;
    }
    if (selectedProjectId == null || !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]!.id);
    }
  }, [projects, selectedProjectId]);

  const project = projects.find((p) => p.id === selectedProjectId) ?? projects[0];
  const queryClient = useQueryClient();

  useEffect(() => {
    if (socket && project?.id) {
      const handleNewComment = (data: any) => {
        if (data.threadType === "project" && data.threadId === project.id) {
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey({ threadType: "project", threadId: project.id }) });
        }
      };

      socket.on("comment", handleNewComment);
      return () => {
        socket.off("comment", handleNewComment);
      };
    }
    return undefined;
  }, [socket, project?.id, queryClient]);

  const { data: releases, isLoading: isLoadingReleases } = useGetApkReleases(
    project?.id as number,
    { 
      query: { 
        enabled: !!project?.id,
        queryKey: ["getApkReleases", project?.id],
      } 
    }
  );

  const { data: milestones, isLoading: isLoadingMilestones } = useGetProjectMilestones(
    project?.id as number,
    { 
      query: { 
        enabled: !!project?.id,
        queryKey: ["getProjectMilestones", project?.id],
      } 
    }
  );

  const [commentText, setCommentText] = useState("");
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [addonForm, setAddonForm] = useState({ title: "", description: "" });

  const { data: logs, isLoading: isLoadingLogs } = useGetProjectLogs(
    project?.id as number,
    { query: { enabled: !!project?.id, queryKey: getGetProjectLogsQueryKey(project?.id as number) } }
  );

  const { data: commentsData, isLoading: isLoadingComments } = useListComments(
    { threadType: "project", threadId: project?.id as number },
    { query: { enabled: !!project?.id, queryKey: getListCommentsQueryKey({ threadType: "project", threadId: project?.id as number }) } }
  );

  const { data: projectAnalytics, isLoading: isLoadingAnalytics } = useGetProjectAnalytics(
    project?.id as number,
    { query: { enabled: !!project?.id, queryKey: getGetProjectAnalyticsQueryKey(project?.id as number) } }
  );

  const createCommentMutation = useCreateComment();
  const createRequestMutation = useCreateRequest();

  const { data: requestsData, isLoading: isLoadingRequests } = useListRequests(
    { projectId: project?.id as number },
    { query: { enabled: !!project?.id, queryKey: getListRequestsQueryKey({ projectId: project?.id as number }) } }
  );

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !project?.id) return;
    
    try {
      await createCommentMutation.mutateAsync({
        data: {
          threadType: "project",
          threadId: project.id,
          content: commentText.trim()
        }
      });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey({ threadType: "project", threadId: project.id }) });
      toast.success("Comment posted successfully");
    } catch (err) {
      toastApiError(err, "Failed to post comment");
    }
  };

  const handlePostAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonForm.title || !addonForm.description || !project?.id) return;
    try {
      await createRequestMutation.mutateAsync({
        data: {
          projectId: project.id,
          type: "add_on_work" as any,
          title: addonForm.title,
          description: addonForm.description,
          urgency: "medium"
        }
      });
      setShowAddonModal(false);
      setAddonForm({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ projectId: project.id }) });
      toast.success("Add-on request submitted for review");
    } catch (err) {
      toastApiError(err, "Failed to submit request");
    }
  };

  const handleCopyPostman = () => {
    if (!project?.postmanJson) return;
    navigator.clipboard.writeText(project.postmanJson);
    toast.success("Postman JSON copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Client Portal</h1>
        <Skeleton className="h-[200px] w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Welcome, {user?.name}</h1>
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center p-4">
            <h3 className="text-lg font-medium mb-2">No active projects</h3>
            <p className="text-xs text-muted-foreground">We are currently setting up your workspace. Check back soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionData = [
    { name: "Progress", value: project.completionPct, fill: "hsl(var(--primary))" }
  ];

  const latestRelease = releases && releases.length > 0 ? releases[0] : null;
  const completedMilestones =
    milestones?.filter((m: { status?: string }) => m.status === "completed").length ?? 0;
  const totalMilestones = milestones?.length ?? 0;
  const releaseCount = releases?.length ?? 0;

  return (
    <motion.div className="space-y-6 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <DashboardHero
        title={`Welcome, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle={
          projects.length > 1
            ? "Select a project to explore delivery progress, releases, and analytics."
            : "Your project workspace — progress, milestones, and team activity."
        }
        badge="Client Portal"
        actions={
          projects.length > 1 ? (
            <Select
              value={String(project.id)}
              onValueChange={(v) => setSelectedProjectId(parseInt(v, 10))}
            >
              <SelectTrigger className="w-full sm:w-[240px] bg-background/80">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      <PageKpiRow>
        <ExecutiveStatCard
          title="Completion"
          value={`${project.completionPct}%`}
          hint="Overall delivery"
          icon={TrendingUp}
          accent="blue"
          delay={0}
        />
        <ExecutiveStatCard
          title="Milestones"
          value={`${completedMilestones}/${totalMilestones || "—"}`}
          hint="Completed"
          icon={Award}
          accent="green"
          delay={1}
        />
        <ExecutiveStatCard
          title="Releases"
          value={releaseCount}
          hint={latestRelease ? `Latest v${latestRelease.version}` : "APK builds"}
          icon={Smartphone}
          accent="violet"
          delay={2}
        />
        <ExecutiveStatCard
          title="Updates"
          value={commentsData?.comments?.length ?? 0}
          hint="Project discussion"
          icon={MessageSquare}
          accent="sky"
          delay={3}
        />
      </PageKpiRow>

      <div className="dashboard-panel bg-gradient-to-br from-primary/15 via-card to-violet-500/10 rounded-2xl p-6 border border-border/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-3">
          <Badge variant="outline" className="bg-background/50 backdrop-blur-sm px-2 py-0.5 text-xs border-primary/50 text-primary">
            {project.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h2>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            {project.description || "Development is proceeding according to schedule."}
          </p>
          <div className="flex items-center gap-6 pt-1">
            <div className="flex items-center text-xs font-medium">
              <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Target Deadline: <span className="ml-2 text-foreground">{project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not set'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {project.techStack?.map((tech: string) => (
              <Badge key={tech} variant="secondary" className="text-[10px] px-2 py-0">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="h-32 w-32 shrink-0 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              innerRadius="80%" 
              outerRadius="100%" 
              data={completionData} 
              startAngle={90} 
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{project.completionPct}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Complete</span>
          </div>
        </div>
      </div>

      {/* Beautiful Project Linear Flow for Clients */}
      <div className="mt-4">
        <ProjectTimelineView 
          startDate={project.startDate || new Date().toISOString()} 
          deadline={project.deadline || new Date().toISOString()} 
          milestones={(milestones as any) || []} 
        />
      </div>

      {/* --- EXECUTIVE INTELLIGENCE SUITE --- */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Growth AreaChart */}
        <Card className="bg-card overflow-hidden border border-border/60 hover:border-primary/30 transition-colors">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sprint Velocity curve
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[160px] w-full">
              {isLoadingAnalytics ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectAnalytics?.completionOverTime?.length ? projectAnalytics.completionOverTime : [{date: "Start", value: 0}, {date: "Now", value: project.completionPct}]}>
                    <defs>
                      <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={8} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} />
                    <Area type="monotone" dataKey="value" name="Completion %" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVel)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contribution BarChart */}
        <Card className="bg-card overflow-hidden border border-border/60 hover:border-emerald-500/30 transition-colors">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Developer hours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[160px] w-full">
              {isLoadingAnalytics ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectAnalytics?.developerContributions?.length ? projectAnalytics.developerContributions : [{developerName: "Team", hoursLogged: projectAnalytics?.totalHoursLogged || 0}]}>
                    <XAxis dataKey="developerName" stroke="hsl(var(--muted-foreground))" fontSize={8} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} />
                    <Bar dataKey="hoursLogged" name="Hours Spent" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Allocation PieChart */}
        <Card className="bg-card overflow-hidden border border-border/60 hover:border-purple-500/30 transition-colors">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-purple-500" />
              Work category breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex items-center justify-center">
            <div className="h-[160px] w-full">
              {isLoadingAnalytics ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectAnalytics?.workCategoryBreakdown?.length ? projectAnalytics.workCategoryBreakdown : [{name: "Pending", count: 1}]}
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {(projectAnalytics?.workCategoryBreakdown || [{name: "Pending", count: 1}]).map((entry: any, idx: number) => (
                        <Cell key={`cell-${idx}`} fill={["#6366f1", "#a855f7", "#14b8a6", "#f59e0b"][idx % 4]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="bg-card/60 backdrop-blur border border-border/40 p-3.5 rounded-xl shadow-sm hover:border-primary/20 transition-colors">
          <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" /> Logged hours
          </p>
          <p className="text-lg font-bold mt-1 text-foreground">{projectAnalytics?.totalHoursLogged || 0} hrs</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border/40 p-3.5 rounded-xl shadow-sm hover:border-emerald-500/20 transition-colors">
          <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Activity className="h-3 w-3 text-emerald-500" /> Sprint progress
          </p>
          <p className="text-lg font-bold mt-1 text-foreground">{project.completionPct}%</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border/40 p-3.5 rounded-xl shadow-sm hover:border-amber-500/20 transition-colors">
          <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Award className="h-3 w-3 text-amber-500" /> Milestones
          </p>
          <p className="text-lg font-bold mt-1 text-foreground">
            {milestones?.filter((m: any) => m.status === 'completed').length || 0} / {milestones?.length || 0}
          </p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border/40 p-3.5 rounded-xl shadow-sm hover:border-purple-500/20 transition-colors">
          <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Send className="h-3 w-3 text-purple-500" /> Last deployment
          </p>
          <p className="text-[11px] font-semibold mt-2 text-muted-foreground leading-tight line-clamp-1">
            {latestRelease ? `${latestRelease.version} (${latestRelease.releaseType})` : "No builds released"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Primary Dashboard Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card">
              <CardHeader className="pb-2 p-4">
                <CardTitle className="flex items-center text-sm font-semibold">
                  <Smartphone className="mr-2 h-4 w-4 text-primary" />
                  Latest Release
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {isLoadingReleases ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : latestRelease ? (
                  <>
                    <div className="border border-border rounded-lg p-4 text-center bg-muted/20">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">{latestRelease.version}</h3>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {latestRelease.releaseType}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                        <span>{latestRelease.platform.toUpperCase()}</span>
                        <span>•</span>
                        <span>Released {latestRelease.createdAt ? formatDistanceToNow(new Date(latestRelease.createdAt), { addSuffix: true }) : 'N/A'}</span>
                      </div>
                      <a 
                        href={latestRelease.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md font-medium w-full text-xs transition-colors"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download APK
                      </a>
                    </div>
                    {latestRelease.changelog && (
                      <div className="text-xs">
                        <h4 className="font-semibold mb-2">What's new:</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap">{latestRelease.changelog}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground text-xs bg-muted/5">
                    No releases yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2 p-4">
                <CardTitle className="flex items-center text-sm font-semibold">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Project Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                {isLoadingMilestones ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : milestones && milestones.length > 0 ? (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {milestones.map((milestone, i) => (
                      <div key={milestone.id} className="relative flex items-start gap-4 pl-1 py-0.5">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-card shadow shrink-0 z-10 mt-0.5 ${
                          milestone.status === 'completed' ? 'bg-green-500 text-white' : 
                          milestone.status === 'delayed' ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'
                        }`}>
                          {milestone.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <span className="text-[9px] font-bold">{i+1}</span>}
                        </div>
                        <div className="flex-1 p-2.5 rounded-md border border-border bg-card shadow-sm text-xs">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <h4 className="font-bold text-[11px] truncate">{milestone.title}</h4>
                            <Badge variant={
                              milestone.status === 'completed' ? 'outline' : 
                              milestone.status === 'delayed' ? 'destructive' : 'secondary'
                            } className="text-[8px] h-3.5 px-1 shrink-0">
                              {milestone.status.toUpperCase()}
                            </Badge>
                          </div>
                          <time className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-2.5 w-2.5" /> Planned: {milestone.plannedDate ? new Date(milestone.plannedDate).toLocaleDateString() : 'N/A'}
                          </time>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground text-xs bg-muted/5">
                    No milestones scheduled
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expanded Section: Recent Dev Logs Feed */}
          <Card className="bg-card overflow-hidden shadow-sm">
            <CardHeader className="pb-2 p-4 border-b bg-muted/10 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center text-sm font-semibold">
                <Activity className="mr-2 h-4 w-4 text-cyan-500" />
                Recent Development Activity
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-mono bg-background text-cyan-600 border-cyan-500/20">Safe Portal Sync</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingLogs ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : logs && logs.logs && logs.logs.length > 0 ? (
                <div className="divide-y divide-border max-h-[260px] overflow-y-auto scrollbar-thin">
                  {logs.logs.slice(0, 6).map((log: any) => (
                    <div key={log.id} className="p-3 hover:bg-muted/10 transition-colors flex items-start gap-3 text-xs">
                      <div className="bg-cyan-500/10 p-1.5 rounded-md text-cyan-600 shrink-0 mt-0.5">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-foreground truncate">{log.taskTitle}</span>
                          <span className="text-[9px] text-muted-foreground shrink-0">{new Date(log.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                          <span className="font-medium bg-primary/5 text-primary px-1 rounded capitalize">{log.category}</span>
                          <span className="text-muted-foreground flex items-center">
                            <User className="h-2.5 w-2.5 mr-0.5 text-muted-foreground/70" /> {log.developerName || "Developer"}
                          </span>
                          <span className="text-muted-foreground font-mono ml-auto">{log.hoursSpent} hrs</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 italic border-l-2 border-muted pl-2.5 py-0.5 mt-1.5 leading-relaxed font-serif bg-muted/5 rounded-r">
                          "{log.taskDescription}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No recent daily logs tracked for this project.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Content: Links and Live Chat Widget */}
        <div className="space-y-4">
          {/* Shared Assets Panel */}
          <Card className="bg-card shadow-sm">
            <CardHeader className="pb-2 p-4 border-b">
              <CardTitle className="flex items-center text-sm font-semibold">
                <ExternalLink className="mr-2 h-4 w-4 text-indigo-500" />
                Assets & Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-slate-600 hover:text-slate-900 hover:underline p-2 rounded-md bg-slate-50 border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
                  <Github className="mr-2.5 h-3.5 w-3.5" /> Git Repository
                </a>
              )}
              {project.figmaUrl && (
                <a href={project.figmaUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-pink-500 hover:underline p-2 rounded-md bg-pink-500/5 border border-pink-500/10">
                  <Layout className="mr-2.5 h-3.5 w-3.5" /> Figma Sandbox
                </a>
              )}
              {project.stagingUrl && (
                <a href={project.stagingUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-amber-600 hover:underline p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                  <Globe className="mr-2.5 h-3.5 w-3.5" /> Staging Endpoint
                </a>
              )}
              {project.adminUrl && (
                <a href={project.adminUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-indigo-500 hover:underline p-2 rounded-md bg-indigo-500/5 border border-indigo-500/10">
                  <Lock className="mr-2.5 h-3.5 w-3.5" /> Admin Portal
                </a>
              )}
              {project.websiteUrl && (
                <a href={project.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs text-teal-600 hover:underline p-2 rounded-md bg-teal-500/5 border border-teal-500/10">
                  <Globe className="mr-2.5 h-3.5 w-3.5" /> Website Frontend
                </a>
              )}
              {project.postmanJson ? (
                <Button onClick={handleCopyPostman} variant="outline" className="h-8 w-full text-[10px] mt-1 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 bg-muted/10">
                  <FileJson className="mr-1.5 h-3.5 w-3.5 text-primary" /> Copy Postman Collection JSON
                </Button>
              ) : (
                (!project.repoUrl && !project.figmaUrl && !project.stagingUrl && !project.adminUrl && !project.websiteUrl) && (
                  <div className="text-center text-[10px] text-muted-foreground py-4 border border-dashed rounded bg-muted/5">
                    No linked environment assets yet.
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Live Discussions Feed */}
          <Card className="bg-card flex flex-col shadow-sm h-[350px]">
            <CardHeader className="pb-2 p-4 border-b flex flex-row items-center justify-between space-y-0 shrink-0">
              <CardTitle className="flex items-center text-sm font-semibold">
                <MessageSquare className="mr-2 h-4 w-4 text-emerald-500" />
                Project Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden relative">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {isLoadingComments ? (
                  <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : commentsData && commentsData.comments.length > 0 ? (
                  commentsData.comments.map((c: any) => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <Avatar className="h-6 w-6 border shrink-0 mt-0.5">
                        <AvatarImage src={c.authorAvatarUrl || undefined} />
                        <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-semibold">{c.authorName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 bg-muted/30 rounded-lg px-2.5 py-1.5 border border-border/40 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-foreground text-[10px] truncate">{c.authorName}</span>
                          <span className="text-[8px] text-muted-foreground shrink-0">{c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : "just now"}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug break-words whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                    <MessageSquare className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-[10px] font-medium">Welcome to your project channel.</p>
                    <p className="text-[9px] opacity-60 mt-0.5">Ask questions or post feedback below.</p>
                  </div>
                )}
              </div>
              
              <form onSubmit={handlePostComment} className="p-3 bg-muted/20 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <Textarea 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Type message to devs..."
                    className="resize-none min-h-[32px] h-8 text-[11px] py-1.5 rounded-md flex-1 scrollbar-none focus-visible:ring-primary"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90"
                    disabled={!commentText.trim() || createCommentMutation.isPending}
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add-on Work / Scope Creep Management */}
      <div className="mt-4">
        <Card className="bg-card border-amber-500/30">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-amber-500" />
                Request Add-on Work / Scope Change
              </CardTitle>
              <CardDescription className="text-xs">
                Need extra features or scope expansion? Submit a formal request for the development team to review.
              </CardDescription>
            </div>
            <Dialog open={showAddonModal} onOpenChange={setShowAddonModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs h-8 border-amber-500/50 text-amber-600 bg-amber-500/5 hover:bg-amber-500/10">
                   Submit New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handlePostAddon}>
                  <DialogHeader>
                    <DialogTitle>Request Add-on Work</DialogTitle>
                    <DialogDescription className="text-xs">
                      Provide details about the extra work required. This will be reviewed by administrators.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-xs">Feature Title</Label>
                      <Input
                        id="title"
                        value={addonForm.title}
                        onChange={(e) => setAddonForm({ ...addonForm, title: e.target.value })}
                        placeholder="e.g., Add Payment Gateway"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs">Detailed Requirements</Label>
                      <Textarea
                        id="description"
                        value={addonForm.description}
                        onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                        placeholder="Please describe exactly what you need built..."
                        className="text-xs min-h-[100px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setShowAddonModal(false)} className="text-xs">Cancel</Button>
                    <Button type="submit" className="text-xs" disabled={!addonForm.title || !addonForm.description || createRequestMutation.isPending}>
                      {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {isLoadingRequests ? (
              <Skeleton className="h-10 w-full" />
            ) : requestsData && requestsData.requests.filter((r: any) => r.type === "add_on_work").length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                {requestsData.requests.filter((r: any) => r.type === "add_on_work").map((req: any) => (
                  <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-border bg-muted/20 gap-3">
                    <div>
                      <h4 className="text-xs font-bold">{req.title}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{req.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</span>
                      <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[9px] uppercase">
                        {req.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-lg">
                No past add-on requests submitted.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </motion.div>
  );
}
