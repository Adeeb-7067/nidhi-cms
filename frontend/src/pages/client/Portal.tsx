import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientTeam } from "@/contexts/ClientTeamContext";
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
  useGetClientHubDashboard,
  useGetProjectMembers,
  getGetProjectMembersQueryKey,
  getListCommentsQueryKey,
  getGetApkReleasesQueryKey,
  getGetProjectLogsQueryKey,
  getGetProjectAnalyticsQueryKey,
  getListRequestsQueryKey
} from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentAuthorPresence } from "@/components/presence/CommentAuthorPresence";
import { ClientProjectTeamCard } from "@/components/presence/ClientProjectTeamCard";
import { UserPresenceMeta } from "@/components/presence/UserPresenceMeta";
import { useUserWithPresence } from "@/contexts/PresenceContext";
import { 
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { 
  Smartphone, CheckCircle, Clock, Download, ExternalLink, Lock, Globe, Layout, 
  Github, FileJson, Send, MessageSquare, Activity, FileText,
  TrendingUp, BarChart3, PieChart as PieChartIcon, Award, PlusCircle, Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { resolveApkDisplayName } from "@/lib/apk-audience";
import { FormattedText } from "@/components/ui/formatted-text";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-kit";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  PortalEmptyState,
} from "@/components/layout/portal-page-kit";
import {
  ChartPanel,
  ChartGridCell,
  ChartEmptyState,
} from "@/components/dashboard/admin-dashboard-charts";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listInventoryResources } from "@/lib/inventory-api";
import { ProjectDescriptionResourceList } from "@/components/project/ProjectDescriptionResourceList";
import {
  appendCommentToListCache,
  commentThreadQueryParams,
  flattenCommentThread,
} from "@/lib/comment-thread-query";
import { useThreadCommentRealtime } from "@/hooks/use-thread-comment-realtime";
import { ProjectTimelineView } from "@/components/ui/project-timeline-view";
import { ClientRecentActivityPanel } from "@/components/client/ClientRecentActivityPanel";
import { useRealtime } from "@/contexts/RealtimeContext";
import { CommentBody } from "@/components/chat/comment-body";
import { ChatComposer } from "@/components/chat/chat-composer";
import {
  buildMentionCandidatesFromMessages,
  projectMembersToMentionCandidates,
} from "@/lib/chat-mentions";
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

function LockedSection({ title, description = "Ask your Client Admin to grant you access to this section.", className = "" }: { title: string; description?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 p-5 ${className}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40">
        <Lock className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const { user } = useAuth();
  const team = useClientTeam();
  const canSeeOverview = team.can("overview");
  const canSeeProgress = team.can("progress");
  const canSeeDevelopers = team.can("developers");
  const canSeeMilestones = team.can("milestones");
  const canSeeDiscussions = team.can("discussions");
  const canPostDiscussion = team.can("discussions", "create");
  const canSeeDocuments = team.can("documents");
  const canSeeReports = team.can("reports");
  const canSeeReleases = team.can("documents");
  const userWithPresence = useUserWithPresence(user);
  const { socket } = useRealtime();
  const { data, isLoading } = useListProjects({ limit: 100 });
  const { data: hub, isLoading: hubLoading } = useGetClientHubDashboard();
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
  const projectId = project?.id;
  const queryClient = useQueryClient();

  const commentsQueryParams = projectId
    ? commentThreadQueryParams("project", projectId)
    : null;

  useThreadCommentRealtime({
    socket,
    threadType: "project",
    threadId: projectId,
    enabled: projectId != null,
  });

  const { data: releases, isLoading: isLoadingReleases } = useGetApkReleases(projectId ?? 0, {
    query: {
      enabled: projectId != null,
      queryKey: getGetApkReleasesQueryKey(projectId ?? 0),
    },
  });

  const { data: milestones, isLoading: isLoadingMilestones } = useGetProjectMilestones(
    projectId ?? 0,
    {
      query: {
        enabled: projectId != null,
        queryKey: ["getProjectMilestones", projectId],
      },
    },
  );

  const [commentText, setCommentText] = useState("");
  const discussionScrollRef = useRef<HTMLDivElement>(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [addonForm, setAddonForm] = useState({ title: "", description: "" });
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const { data: logs, isLoading: isLoadingLogs } = useGetProjectLogs(projectId ?? 0, {
    query: {
      enabled: projectId != null,
      queryKey: getGetProjectLogsQueryKey(projectId ?? 0),
    },
  });

  const { data: commentsData, isLoading: isLoadingComments } = useListComments(
    commentsQueryParams ?? { threadType: "project", threadId: 0 },
    {
      query: {
        enabled: projectId != null,
        queryKey: commentsQueryParams
          ? getListCommentsQueryKey(commentsQueryParams)
          : getListCommentsQueryKey({ threadType: "project", threadId: 0 }),
      },
    },
  );

  const { data: projectAnalytics, isLoading: isLoadingAnalytics } = useGetProjectAnalytics(
    projectId ?? 0,
    {
      query: {
        enabled: projectId != null,
        queryKey: getGetProjectAnalyticsQueryKey(projectId ?? 0),
      },
    },
  );

  const channelMessages = useMemo(
    () => flattenCommentThread(commentsData?.comments ?? []),
    [commentsData?.comments],
  );

  const activityLogs = useMemo(() => logs?.logs?.slice(0, 12) ?? [], [logs?.logs]);
  const activityLogTotal = logs?.total ?? logs?.logs?.length ?? 0;

  useEffect(() => {
    const el = discussionScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [project?.id, channelMessages]);

  const createCommentMutation = useCreateComment();
  const createRequestMutation = useCreateRequest();

  const { data: requestsData, isLoading: isLoadingRequests } = useListRequests(
    { projectId: projectId ?? 0 },
    {
      query: {
        enabled: projectId != null,
        queryKey: getListRequestsQueryKey({ projectId: projectId ?? 0 }),
      },
    },
  );

  const { data: resourcesData, isLoading: isLoadingResources } = useQuery({
    queryKey: ["inventory-resources", projectId],
    queryFn: () => listInventoryResources(projectId!, { limit: "100" }),
    enabled: projectId != null,
  });

  const sharedResources = resourcesData?.resources ?? [];

  const { data: projectMembers } = useGetProjectMembers(projectId ?? 0, {
    query: {
      enabled: projectId != null,
      queryKey: getGetProjectMembersQueryKey(projectId ?? 0),
    },
  });

  const mentionCandidates = useMemo(() => {
    const fromMembers = projectMembersToMentionCandidates(projectMembers, user?.id);
    const fromMessages = buildMentionCandidatesFromMessages(channelMessages);
    const map = new Map(fromMembers.map((c) => [c.id, c]));
    for (const c of fromMessages) map.set(c.id, c);
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [projectMembers, channelMessages, user?.id]);

  const handlePostComment = async (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
    mentionedUserIds?: number[];
  }) => {
    if (!project?.id) return;
    if (!payload.content?.trim() && !payload.attachmentUrl) return;

    try {
      const created = await createCommentMutation.mutateAsync({
        data: {
          threadType: "project",
          threadId: project.id,
          content: payload.content ?? "",
          attachmentUrl: payload.attachmentUrl,
          attachmentName: payload.attachmentName,
          attachmentMimeType: payload.attachmentMimeType,
          ...(payload.mentionedUserIds?.length
            ? { mentionedUserIds: payload.mentionedUserIds }
            : {}),
        },
      });
      appendCommentToListCache(queryClient, "project", project.id, created);
      if (payload.attachmentUrl) {
        queryClient.invalidateQueries({ queryKey: ["inventory-resources", project.id] });
      }
      toast.success("Comment posted successfully");
    } catch (err) {
      toastApiError(err, "Failed to post comment");
      throw err;
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

  if (isLoading || hubLoading || team.isLoading) {
    return <DashboardSkeleton />;
  }

  if (!team.isClientUser) {
    return (
      <PortalPageShell>
        <PortalPageHero
          title={`Welcome, ${user?.name?.split(" ")[0] ?? "there"}`}
          subtitle="Your client workspace"
          badge="Client Portal"
        />
        <PortalEmptyState
          icon={Users}
          title="Account not linked"
          description="Your account isn't linked to a client company yet. Please contact your account manager to activate portal access."
        />
      </PortalPageShell>
    );
  }

  if (!projects.length || !project) {
    return (
      <PortalPageShell>
        <PortalPageHero
          title={`Welcome, ${user?.name?.split(" ")[0] ?? "there"}`}
          subtitle="Your client workspace"
          badge="Client Portal"
        />
        <PortalEmptyState
          icon={Layout}
          title="No active projects"
          description="We are currently setting up your workspace. Check back soon."
        />
      </PortalPageShell>
    );
  }

  const completionData = [
    { name: "Progress", value: project.completionPct ?? 0, fill: "hsl(var(--primary))" },
  ];

  const latestRelease = releases && releases.length > 0 ? releases[0] : null;
  const completedMilestones =
    milestones?.filter((m: { status?: string }) => m.status === "completed").length ?? 0;
  const totalMilestones = milestones?.length ?? 0;
  const releaseCount = releases?.length ?? 0;
  const releaseKpiCount = Math.max(hub?.releaseCount ?? 0, releaseCount);

  return (
    <PortalPageShell className="space-y-6">
      <PortalPageHero
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

      {userWithPresence && (
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardContent className="p-4">
            <UserPresenceMeta
              presenceStatus={userWithPresence.presenceStatus}
              lastSeenAt={userWithPresence.lastSeenAt}
              lastLoginAt={userWithPresence.lastLoginAt}
              compact
            />
          </CardContent>
        </Card>
      )}

      <PortalKpiGrid
        loading={hubLoading && !hub}
        items={[
          { title: "Projects", value: hub?.projectCount ?? projects.length, hint: "In your portfolio", icon: Layout, accent: "blue", href: "/client" },
          { title: "Avg completion", value: `${hub?.avgCompletionPct ?? project.completionPct}%`, hint: projects.length > 1 ? "Across all projects" : "This project", icon: TrendingUp, accent: "violet", href: "/client/analytics" },
          { title: "Milestones", value: `${hub?.milestones.completed ?? completedMilestones}/${(hub?.milestones.total ?? totalMilestones) || "—"}`, hint: "Completed", icon: Award, accent: "green" },
          { title: "Releases", value: releaseKpiCount, hint: latestRelease ? `Latest ${resolveApkDisplayName(latestRelease)}` : "APK builds", icon: Smartphone, accent: "sky", href: "/client/apk" },
        ]}
      />

      {canSeeOverview ? (
      <div className="dashboard-panel bg-gradient-to-br from-primary/15 via-card to-violet-500/10 rounded-2xl p-6 border border-border/60 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <Badge variant="outline" className="bg-background/50 backdrop-blur-sm px-2 py-0.5 text-xs border-primary/50 text-primary">
            {project.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground line-clamp-2">{project.name}</h2>
          {project.description?.trim() ? (
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] line-clamp-3">
                {project.description}
              </p>
              <button
                type="button"
                onClick={() => setDescriptionOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                Read more
                {sharedResources.length > 0 && (
                  <span className="text-muted-foreground font-normal">
                    · {sharedResources.length} resource{sharedResources.length !== 1 ? "s" : ""}
                  </span>
                )}
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Development is proceeding according to schedule.
            </p>
          )}
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
      ) : (
        <LockedSection title="Project Overview" className="rounded-2xl" />
      )}

      {canSeeMilestones ? (
      <div className="mt-4">
        <ProjectTimelineView 
          startDate={project.startDate || new Date().toISOString()} 
          deadline={project.deadline || new Date().toISOString()} 
          milestones={(milestones as any) || []} 
        />
      </div>
      ) : null}

      {canSeeReports ? (
        <motion.section
        className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-stretch"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label="Project analytics"
      >
        <ChartGridCell colSpan={4} className="min-h-[260px]">
          <ChartPanel
            title="Completion trend"
            description="Sprint velocity over time"
            icon={TrendingUp}
            accent="blue"
          >
            {isLoadingAnalytics ? (
              <Skeleton className="h-[180px] w-full" />
            ) : projectAnalytics?.completionOverTime?.length ? (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectAnalytics.completionOverTime}>
                    <defs>
                      <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={8} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} />
                    <Area type="monotone" dataKey="value" name="Completion %" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVel)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartEmptyState message="Completion history will appear once the team logs progress." icon={TrendingUp} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4} className="min-h-[260px]">
          <ChartPanel
            title="Developer hours"
            description="Contribution by team member"
            icon={BarChart3}
            accent="emerald"
          >
            {isLoadingAnalytics ? (
              <Skeleton className="h-[180px] w-full" />
            ) : projectAnalytics?.developerContributions?.length ? (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectAnalytics.developerContributions}>
                    <XAxis dataKey="developerName" stroke="hsl(var(--muted-foreground))" fontSize={8} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} />
                    <Bar dataKey="hoursLogged" name="Hours Spent" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartEmptyState message="Developer hours will show once daily logs are recorded." icon={BarChart3} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4} className="min-h-[260px]">
          <ChartPanel
            title="Work categories"
            description="How effort is distributed"
            icon={PieChartIcon}
            accent="violet"
          >
            {isLoadingAnalytics ? (
              <Skeleton className="h-[180px] w-full" />
            ) : projectAnalytics?.workCategoryBreakdown?.length ? (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectAnalytics.workCategoryBreakdown}
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {projectAnalytics.workCategoryBreakdown.map((entry: { name: string }, idx: number) => (
                        <Cell key={entry.name} fill={["#6366f1", "#a855f7", "#14b8a6", "#f59e0b"][idx % 4]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: "10px" }} />
                    <Legend wrapperStyle={{ fontSize: "9px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartEmptyState message="Work category breakdown appears when logs include categories." icon={PieChartIcon} />
            )}
          </ChartPanel>
        </ChartGridCell>
      </motion.section>
      ) : (
        <LockedSection title="Reports & Analytics" />
      )}

      {canSeeProgress ? (
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
            {latestRelease ? `${resolveApkDisplayName(latestRelease)} · v${latestRelease.version}` : "No builds released"}
          </p>
        </div>
      </div>
      ) : (
        <LockedSection title="Project Progress" />
      )}

      <section className="grid gap-4 lg:grid-cols-12" aria-label="Project workspace">
        {/* Row 1: release + milestones | team */}
        <div className="grid gap-4 md:grid-cols-2 lg:col-span-8 md:items-stretch">
            {canSeeReleases ? (
            <Card className="flex flex-col bg-card">
              <CardHeader className="pb-2 p-4 shrink-0">
                <CardTitle className="flex items-center text-sm font-semibold">
                  <Smartphone className="mr-2 h-4 w-4 text-primary" />
                  Latest Release
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4 p-4">
                {isLoadingReleases ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : latestRelease ? (
                  <>
                    <div className="border border-border rounded-lg p-4 text-center bg-muted/20">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">{resolveApkDisplayName(latestRelease)}</h3>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {latestRelease.releaseType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        v{latestRelease.version} · {latestRelease.platform.toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Released {latestRelease.createdAt ? formatDistanceToNow(new Date(latestRelease.createdAt), { addSuffix: true }) : 'N/A'}
                      </p>
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
            ) : (
              <LockedSection title="Latest Release" className="min-h-[180px] flex-1" />
            )}

            {canSeeMilestones ? (
            <Card className="flex flex-col bg-card">
              <CardHeader className="pb-2 p-4 shrink-0">
                <CardTitle className="flex items-center text-sm font-semibold">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Project Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto dialog-scroll p-4 max-h-[280px] md:max-h-[320px]">
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
                          milestone.status === 'ongoing' ? 'bg-amber-500 text-white' :
                          milestone.status === 'delayed' ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'
                        }`}>
                          {milestone.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <span className="text-[9px] font-bold">{i+1}</span>}
                        </div>
                        <div className="flex-1 p-2.5 rounded-md border border-border bg-card shadow-sm text-xs">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <h4 className="font-bold text-[11px] truncate">{milestone.title}</h4>
                            <Badge variant={
                              milestone.status === 'completed' ? 'outline' : 
                              milestone.status === 'ongoing' ? 'secondary' :
                              milestone.status === 'delayed' ? 'destructive' : 'secondary'
                            } className={`text-[8px] h-3.5 px-1 shrink-0 ${
                              milestone.status === 'ongoing' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : ''
                            }`}>
                              {milestone.status.toUpperCase()}
                            </Badge>
                          </div>
                          <time className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-2.5 w-2.5" /> Planned: {milestone.plannedDate ? new Date(milestone.plannedDate).toLocaleDateString() : 'N/A'}
                          </time>
                          {milestone.assigneeName && (
                            <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                              <Users className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">
                                {milestone.assigneeName}
                                {milestone.assigneeRole ? ` · ${milestone.assigneeRole}` : ""}
                              </span>
                            </p>
                          )}
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
            ) : (
              <LockedSection title="Project Milestones" className="min-h-[180px] flex-1" />
            )}
        </div>

        {canSeeDevelopers ? (
          <ClientProjectTeamCard projectId={project?.id} className="lg:col-span-4 lg:row-start-1" />
        ) : (
          <LockedSection title="Development Team" className="lg:col-span-4 lg:row-start-1 min-h-[180px]" />
        )}

        {/* Row 2: activity feed | assets + discussion — matched height */}
        {canSeeProgress ? (
        <div className="flex h-[460px] flex-col lg:col-span-8 lg:row-start-2 lg:h-[520px]">
          <ClientRecentActivityPanel
            logs={activityLogs}
            loading={isLoadingLogs}
            totalCount={activityLogTotal}
            className="h-full min-h-0 flex-1"
          />
        </div>
        ) : (
          <LockedSection title="Project Activity" className="lg:col-span-8 lg:row-start-2 h-[120px]" />
        )}

        <div className="flex h-[460px] flex-col gap-4 lg:col-span-4 lg:row-start-2 lg:h-[520px]">

          {canSeeDocuments ? (
          <Card className="shrink-0 bg-card shadow-sm">
            <CardHeader className="pb-2 p-4 border-b">
              <CardTitle className="flex items-center text-sm font-semibold">
                <ExternalLink className="mr-2 h-4 w-4 text-indigo-500" />
                Assets & Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[240px] overflow-y-auto overscroll-y-auto dialog-scroll p-3 space-y-2.5">
              {isLoadingResources ? (
                <Skeleton className="h-16 w-full" />
              ) : sharedResources.length ? (
                <div className="space-y-2 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Project resources
                  </p>
                  {sharedResources.map((r) => {
                    const isImage = r.mimeType?.startsWith("image/") && r.fileUrl;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/10 p-2"
                      >
                        {isImage ? (
                          <a href={r.fileUrl} target="_blank" rel="noreferrer" className="shrink-0">
                            <img
                              src={r.fileUrl}
                              alt={r.name}
                              className="h-10 w-10 rounded object-cover border"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium truncate">{r.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {r.uploaderName}
                            {r.category === "discussion" ? " · from discussion" : ""}
                          </p>
                        </div>
                        {(r.fileUrl || r.url) && (
                          <a
                            href={r.fileUrl || r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-primary hover:underline shrink-0"
                          >
                            Open
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
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
                (!project.repoUrl &&
                  !project.figmaUrl &&
                  !project.stagingUrl &&
                  !project.adminUrl &&
                  !project.websiteUrl &&
                  !sharedResources.length) && (
                  <div className="text-center text-[10px] text-muted-foreground py-4 border border-dashed rounded bg-muted/5">
                    No linked environment assets yet.
                  </div>
                )
              )}
            </CardContent>
          </Card>
          ) : (
            <LockedSection title="Assets & Deliverables" description="Ask your Client Admin to grant you access to project resources and links." className="shrink-0" />
          )}

          {canSeeDiscussions ? (
          <Card className="flex min-h-0 flex-1 flex-col bg-card shadow-sm">
            <CardHeader className="pb-2 p-4 border-b flex flex-row items-center justify-between space-y-0 shrink-0">
              <CardTitle className="flex items-center text-sm font-semibold">
                <MessageSquare className="mr-2 h-4 w-4 text-emerald-500" />
                Project Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden relative">
              <div
                ref={discussionScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-y-auto dialog-scroll p-4 space-y-3"
              >
                {isLoadingComments ? (
                  <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : channelMessages.length > 0 ? (
                  channelMessages.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <CommentAuthorPresence
                        authorId={c.authorId}
                        authorName={c.authorName}
                        authorAvatarUrl={c.authorAvatarUrl}
                        className="h-6 w-6 border shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0 bg-muted/30 rounded-lg px-2.5 py-1.5 border border-border/40 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-foreground text-[10px] truncate">{c.authorName}</span>
                          <span className="text-[8px] text-muted-foreground shrink-0">{c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : "just now"}</span>
                        </div>
                        <CommentBody
                          comment={c}
                          isSent={c.authorId === user?.id}
                          mentionCandidates={mentionCandidates}
                          compact
                          bubbleClassName="border-0 bg-transparent p-0 shadow-none"
                          onImageLoad={() => {
                            const el = discussionScrollRef.current;
                            if (el) el.scrollTop = el.scrollHeight;
                          }}
                        />
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
              
              {canPostDiscussion ? (
                <div className="shrink-0 bg-[#f0f2f5] px-3 py-2 dark:bg-[#202c33]">
                  <ChatComposer
                    value={commentText}
                    onChange={setCommentText}
                    onSubmit={async (payload) => {
                      await handlePostComment(payload);
                      setCommentText("");
                    }}
                    isSubmitting={createCommentMutation.isPending}
                    placeholder="Type a message"
                    mentionCandidates={mentionCandidates}
                    enableEmojiPicker
                    enableVoice
                    size="compact"
                  />
                </div>
              ) : (
                <div className="shrink-0 border-t border-border/60 bg-muted/30 px-3 py-2 text-center text-[10px] text-muted-foreground">
                  Read-only access — ask your Client Admin for permission to reply.
                </div>
              )}
            </CardContent>
          </Card>
          ) : (
            <Card className="flex min-h-0 flex-1 flex-col bg-card shadow-sm">
              <CardHeader className="pb-2 p-4 border-b flex flex-row items-center justify-between space-y-0 shrink-0">
                <CardTitle className="flex items-center text-sm font-semibold">
                  <MessageSquare className="mr-2 h-4 w-4 text-emerald-500" />
                  Project Discussion
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <Lock className="mx-auto h-5 w-5 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-medium text-muted-foreground">Discussion is restricted</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Ask your Client Admin to grant access.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

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

      <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[min(90dvh,720px)] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3 pr-6">
              <span className="line-clamp-2 text-base font-semibold leading-snug">
                {project.name}
              </span>
              <Badge variant="outline" className="shrink-0 mt-0.5 border-primary/40 bg-primary/5 text-primary text-[10px]">
                {project.status.replace("_", " ").toUpperCase()}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Project overview, scope, and key milestones.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto dialog-scroll space-y-4 pr-1">
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <FormattedText
                className="text-sm text-foreground/90"
                fallback={
                  <p className="text-sm text-muted-foreground">No description provided yet.</p>
                }
              >
                {project.description}
              </FormattedText>
            </section>

            {canSeeDocuments && isLoadingResources ? (
              <Skeleton className="h-16 w-full" />
            ) : canSeeDocuments && sharedResources.length > 0 ? (
              <ProjectDescriptionResourceList resources={sharedResources} />
            ) : null}

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Completion
                </p>
                <p className="mt-1 text-lg font-bold">{project.completionPct}%</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Target deadline
                </p>
                <p className="mt-1 text-sm font-medium">
                  {project.deadline ? new Date(project.deadline).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </section>

            {project.techStack?.length ? (
              <section className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tech stack
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.techStack.map((tech: string) => (
                    <Badge key={tech} variant="secondary" className="text-[10px] px-2 py-0">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-xs"
              onClick={() => setDescriptionOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PortalPageShell>
  );
}
