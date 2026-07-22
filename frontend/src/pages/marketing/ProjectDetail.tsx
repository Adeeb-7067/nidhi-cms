import { useMemo, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { differenceInCalendarDays, format } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  HardDrive,
  CheckSquare,
  Loader2,
  Percent,
  CalendarClock,
  FolderKanban,
  Clock,
  Megaphone,
  Calendar,
  Share2,
  ArrowRight,
  Gauge,
  IndianRupee,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalPageShell, PortalKpiGrid, PortalTabsList, PortalTabsTrigger } from "@/components/layout/portal-page-kit";
import { ProjectDetailPageSkeleton } from "@/components/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetProject, useUpdateProject, getGetProjectQueryKey, getListProjectsQueryKey } from "@/api";
import { DigitalProjectOverview, digitalOverviewModuleIcons } from "@/components/project/DigitalProjectOverview";
import { DigitalProjectServiceFields } from "@/components/project/DigitalProjectServiceFields";
import {
  EMPTY_DIGITAL_SERVICES,
  EMPTY_SOCIAL_LINKS,
  normalizeDigitalServicesForm,
  normalizeSocialLinksForm,
  type DigitalServicesForm,
  type SocialLinksForm,
} from "@/lib/project-type-fields";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMarketingAccounts,
  useUpdateMarketingAccount,
  useMarketingTasks,
  useMarketingApprovals,
  useMarketingPosts,
  useMarketingCampaigns,
  useMarketingGraphics,
  useMarketingVideos,
  useMarketingContent,
  useMarketingMediaTree,
  useMarketingSocial,
  useMarketingSeo,
  useMarketingPerformance,
} from "@/api/marketing";
import {
  MarketingPageHeader,
  MarketingEmptyState,
  MarketingStatusBadge,
  ApprovalStatusBadge,
  PlatformIconBadge,
  MarketingAssigneeSelect,
  parseAssigneeId,
} from "@/modules/marketing/components";
import {
  PACKAGE_LABELS,
  PLATFORM_LABELS,
  TASK_CATEGORY_LABELS,
  CONTENT_TYPE_LABELS,
  formatCompactCurrency,
  canManageMarketingClientCommercial,
  canViewMarketingClientBudget,
} from "@/modules/marketing/constants";
import type {
  MarketingPackage,
  MarketingPlatform,
  TaskStatus,
  TaskCategory,
  TaskPriority,
  ApprovalStage,
  PostScheduleStatus,
  CampaignStatus,
  VideoRenderStatus,
  ContentType,
} from "@/modules/marketing/types";
import { usePermissions } from "@/modules/permissions/usePermission";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const STATUS_LABELS: Record<string, string> = {
  scoping: "Scoping",
  in_progress: "In progress",
  on_hold: "On hold",
  uat: "UAT",
  completed: "Completed",
  maintenance: "Maintenance",
};

type WorkspaceForm = {
  package: MarketingPackage;
  monthlyBudgetInr: string;
  accountManagerId: string;
  status: "active" | "paused" | "ended";
  platforms: MarketingPlatform[];
  renewalDate: string;
  industry: string;
  city: string;
  performanceScore: string;
  notes: string;
};

const ACCOUNT_STATUS_LABELS: Record<WorkspaceForm["status"], string> = {
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as MarketingPlatform[];

function SectionEmpty({ message }: { message: string }) {
  return <p className="px-1 py-6 text-center text-xs text-muted-foreground">{message}</p>;
}

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
      <Link href={href}>
        {label} <ArrowRight className="h-3 w-3" />
      </Link>
    </Button>
  );
}

export default function MarketingProjectDetail() {
  const [, params] = useRoute("/marketing/projects/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const projectId = Number(params?.id);
  const enabled = Number.isFinite(projectId) && projectId > 0;
  const [tab, setTab] = useState("overview");
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [servicesForm, setServicesForm] = useState<DigitalServicesForm>({ ...EMPTY_DIGITAL_SERVICES });
  const [socialForm, setSocialForm] = useState<SocialLinksForm>({ ...EMPTY_SOCIAL_LINKS });
  const [platformsForm, setPlatformsForm] = useState<string[]>([]);
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceForm>({
    package: "standard",
    monthlyBudgetInr: "0",
    accountManagerId: "",
    status: "active",
    platforms: [],
    renewalDate: "",
    industry: "",
    city: "",
    performanceScore: "0",
    notes: "",
  });

  const { can } = usePermissions();
  const canEditWorkspace = can("marketing_clients", "edit");
  const canEditServices =
    user?.role === "super_admin" ||
    user?.role === "digital" ||
    user?.role === "bde" ||
    canEditWorkspace;
  const updateAccount = useUpdateMarketingAccount();
  const updateProject = useUpdateProject();

  const { data: project, isLoading, isError } = useGetProject(projectId, {
    query: { enabled },
  });
  const accountQuery = enabled ? { projectId } : undefined;
  const { data: accountsData, isLoading: accountsLoading } = useMarketingAccounts(accountQuery);
  const account = accountsData?.accounts?.[0] ?? null;
  const accountId = account?.id;
  const accountEnabled = Number.isFinite(accountId);

  const { data: tasksData, isLoading: tasksLoading } = useMarketingTasks(
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: approvalsData, isLoading: approvalsLoading } = useMarketingApprovals(
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: postsData, isLoading: postsLoading } = useMarketingPosts(
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: metaAdsData } = useMarketingCampaigns(
    "meta",
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: googleAdsData } = useMarketingCampaigns(
    "google",
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: graphicsData } = useMarketingGraphics(
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: videosData } = useMarketingVideos(
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: contentData } = useMarketingContent(
    accountEnabled ? { accountId } : undefined,
    { enabled: accountEnabled },
  );
  const { data: mediaTree } = useMarketingMediaTree(accountEnabled ? accountId : undefined);
  const { data: socialData } = useMarketingSocial(accountEnabled ? { accountId } : undefined);
  const { data: seoData } = useMarketingSeo(accountEnabled ? { accountId } : undefined);
  const { data: performanceData } = useMarketingPerformance(accountEnabled ? { accountId } : undefined);

  const tasks = tasksData?.tasks ?? [];
  const approvals = approvalsData?.approvals ?? [];
  const posts = postsData?.posts ?? [];
  const campaigns = [...(metaAdsData?.campaigns ?? []), ...(googleAdsData?.campaigns ?? [])];
  const graphics = graphicsData?.graphics ?? [];
  const videos = videosData?.videos ?? [];
  const content = contentData?.content ?? [];
  const socialMetrics = socialData?.metrics ?? [];
  const seoKeywords = seoData?.keywords ?? [];
  const performanceMembers = performanceData?.members ?? [];

  const mediaFileCount = useMemo(() => {
    const items = mediaTree?.items ?? [];
    return items.filter((i) => i.kind !== "folder").length;
  }, [mediaTree]);

  const digitalKpis = useMemo(() => {
    const openTasks = tasks.filter((t) =>
      ["not_started", "in_progress", "waiting_client_approval", "revision"].includes(t.status),
    ).length;
    const pendingApprovals = approvals.filter((a) =>
      ["internal_review", "client_review", "revision"].includes(a.stage),
    ).length;
    const scheduledPosts = posts.filter((p) => p.scheduleStatus === "scheduled").length;
    const activeAds = campaigns.filter((c) => c.status === "active").length;
    return { openTasks, pendingApprovals, scheduledPosts, activeAds };
  }, [tasks, approvals, posts, campaigns]);

  const projectKpis = useMemo(() => {
    const completion = project?.completionPct ?? 0;
    const daysToDeadline =
      project?.deadline != null
        ? differenceInCalendarDays(new Date(project.deadline), new Date())
        : null;
    return {
      status: STATUS_LABELS[project?.status ?? ""] ?? project?.status ?? "—",
      completion: `${completion}%`,
      daysToDeadline:
        daysToDeadline == null
          ? "—"
          : daysToDeadline >= 0
            ? `${daysToDeadline}d`
            : `${Math.abs(daysToDeadline)}d overdue`,
    };
  }, [project]);

  const openEditWorkspace = () => {
    if (!account) return;
    setWorkspaceForm({
      package: account.package as MarketingPackage,
      monthlyBudgetInr: String(account.monthlyBudgetInr ?? 0),
      accountManagerId:
        account.accountManagerId != null ? String(account.accountManagerId) : "",
      status: account.status,
      platforms: [...(account.platforms ?? [])] as MarketingPlatform[],
      renewalDate: account.renewalDate ? account.renewalDate.slice(0, 10) : "",
      industry: account.industry ?? "",
      city: account.city ?? "",
      performanceScore: String(account.performanceScore ?? 0),
      notes: account.notes ?? "",
    });
    setWorkspaceDialogOpen(true);
  };

  const openEditServices = () => {
    if (!project) return;
    setServicesForm(normalizeDigitalServicesForm(project.digitalServices));
    setSocialForm(normalizeSocialLinksForm(project.socialLinks));
    setPlatformsForm([...(project.techStack ?? [])]);
    setServicesDialogOpen(true);
  };

  const handleSaveServices = async () => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          digitalServices: servicesForm,
          socialLinks: socialForm,
          techStack: platformsForm,
        },
      });
      toast.success("Services & social profiles updated");
      setServicesDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      void queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ["marketing", "accounts"] });
    } catch (err) {
      toastApiError(err, "Failed to update services");
    }
  };

  const togglePlatform = (platform: MarketingPlatform) => {
    setWorkspaceForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((p) => p !== platform)
        : [...f.platforms, platform],
    }));
  };

  const handleSaveWorkspace = async () => {
    if (!account) return;
    const canManageCommercial = canManageMarketingClientCommercial(user?.role);
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        data: {
          ...(canManageCommercial
            ? {
                package: workspaceForm.package,
                monthlyBudgetInr: Number(workspaceForm.monthlyBudgetInr),
              }
            : {}),
          accountManagerId: parseAssigneeId(workspaceForm.accountManagerId),
          status: workspaceForm.status,
          platforms: workspaceForm.platforms,
          renewalDate: workspaceForm.renewalDate || null,
          industry: workspaceForm.industry.trim() || undefined,
          city: workspaceForm.city.trim() || undefined,
          performanceScore: Number(workspaceForm.performanceScore),
          notes: workspaceForm.notes.trim() || undefined,
        },
      });
      toast.success("Workspace updated");
      setWorkspaceDialogOpen(false);
    } catch (err) {
      toastApiError(err, "Failed to update workspace");
    }
  };

  if (!enabled) {
    return (
      <PortalPageShell>
        <MarketingEmptyState
          icon={Briefcase}
          title="Invalid project"
          description="That project link is not valid."
          actionLabel="Back to projects"
          onAction={() => navigate("/marketing/projects")}
        />
      </PortalPageShell>
    );
  }

  if (isError || (!isLoading && (!project || project.type !== "digital"))) {
    return (
      <PortalPageShell>
        <MarketingEmptyState
          icon={Briefcase}
          title="Project not found"
          description="Only Digital-type projects appear here. Create or edit type under Manage → Projects."
          actionLabel="Back to projects"
          onAction={() => navigate("/marketing/projects")}
        />
      </PortalPageShell>
    );
  }

  const q = accountId ? `?account=${accountId}` : "";
  const companyLabel = project?.companyName || project?.clientName || "Digital project";
  const activeServices = [
    project?.digitalServices?.seo ? "SEO" : null,
    project?.digitalServices?.metaAds ? "Meta Ads" : null,
    project?.digitalServices?.googleAds ? "Google Ads" : null,
  ].filter(Boolean);
  const headerDescription = [
    companyLabel,
    account ? PACKAGE_LABELS[account.package] ?? account.package : null,
    activeServices.length ? activeServices.join(" · ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title={project?.name ?? "Project"}
        description={headerDescription}
        breadcrumbs={[
          { label: "Digital", href: "/marketing" },
          { label: "Projects", href: "/marketing/projects" },
          { label: project?.name ?? "…" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEditServices && project ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={openEditServices}
              >
                <Pencil className="h-3.5 w-3.5" />
                Services
              </Button>
            ) : null}
            {account && (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                  <Link href={`/marketing/tasks${q}`}>
                    <CheckSquare className="h-3.5 w-3.5" />
                    Tasks
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                  <Link href={`/marketing/calendar${q}`}>
                    <Calendar className="h-3.5 w-3.5" />
                    Calendar
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                  <Link href={`/marketing/media${q}`}>
                    <HardDrive className="h-3.5 w-3.5" />
                    Media
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link href="/marketing/projects">
                <ArrowLeft className="h-3.5 w-3.5" />
                All projects
              </Link>
            </Button>
          </div>
        }
      />

      <PortalKpiGrid
        loading={isLoading || accountsLoading}
        columns={4}
        count={8}
        items={[
          { title: "Status", value: projectKpis.status, icon: FolderKanban, accent: "blue", delay: 0 },
          { title: "Completion", value: projectKpis.completion, icon: Percent, accent: "green", delay: 1 },
          {
            title: "Days to deadline",
            value: projectKpis.daysToDeadline,
            icon: CalendarClock,
            accent: "amber",
            delay: 2,
          },
          {
            title: "Performance",
            value: account ? `${account.performanceScore}%` : "—",
            icon: Gauge,
            accent: "violet",
            delay: 3,
          },
          {
            title: "Open tasks",
            value: digitalKpis.openTasks,
            icon: CheckSquare,
            accent: "blue",
            delay: 4,
          },
          {
            title: "Pending approvals",
            value: digitalKpis.pendingApprovals,
            icon: Clock,
            accent: "amber",
            delay: 5,
          },
          {
            title: "Posts scheduled",
            value: digitalKpis.scheduledPosts,
            icon: Share2,
            accent: "sky",
            delay: 6,
          },
          {
            title: "Ads running",
            value: digitalKpis.activeAds,
            icon: Megaphone,
            accent: "green",
            delay: 7,
          },
        ]}
      />

      {isLoading || !project ? (
        <ProjectDetailPageSkeleton />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <PortalTabsList>
            {(
              [
                ["overview", "Overview"],
                ["tasks", "Tasks"],
                ["approvals", "Approvals"],
                ["calendar", "Calendar"],
                ["ads", "Ads"],
                ["production", "Production"],
                ["media", "Media"],
              ] as const
            ).map(([value, label]) => (
              <PortalTabsTrigger key={value} value={value}>
                {label}
              </PortalTabsTrigger>
            ))}
          </PortalTabsList>

          <TabsContent value="overview" className="mt-0 space-y-4">
            {!account && !accountsLoading ? (
              <MarketingEmptyState
                icon={HardDrive}
                title="Digital workspace not ready"
                description="Open Tasks or Media once to provision this project's workspace. You can still manage services and social profiles below."
                actionLabel="Open tasks"
                onAction={() => navigate("/marketing/tasks")}
              />
            ) : null}
            <DigitalProjectOverview
              project={project}
              projectId={projectId}
              companyLabel={companyLabel}
              account={account}
              accountLoading={accountsLoading}
              accountQuery={q}
              canEditServices={canEditServices}
              canEditWorkspace={canEditWorkspace}
              canViewClientBudget={canViewMarketingClientBudget(user?.role)}
              canManageTeam={user?.role === "super_admin" || user?.role === "hr"}
              onEditServices={openEditServices}
              onEditWorkspace={openEditWorkspace}
              moduleLinks={[
                {
                  label: "Graphics",
                  value: graphics.length,
                  icon: digitalOverviewModuleIcons.Palette,
                  href: `/marketing/graphics${q}`,
                },
                {
                  label: "Videos",
                  value: videos.length,
                  icon: digitalOverviewModuleIcons.Film,
                  href: `/marketing/videos${q}`,
                },
                {
                  label: "Content pieces",
                  value: content.length,
                  icon: digitalOverviewModuleIcons.FileText,
                  href: `/marketing/content${q}`,
                },
                {
                  label: "Media files",
                  value: mediaFileCount,
                  icon: digitalOverviewModuleIcons.HardDrive,
                  href: `/marketing/media${q}`,
                },
                {
                  label: "Social platforms",
                  value: socialMetrics.length,
                  icon: digitalOverviewModuleIcons.Share2,
                  href: `/marketing/social${q}`,
                },
                {
                  label: "SEO keywords",
                  value: seoKeywords.length,
                  icon: digitalOverviewModuleIcons.Search,
                  href: `/marketing/seo${q}`,
                },
                {
                  label: "Team members",
                  value: performanceMembers.length,
                  icon: digitalOverviewModuleIcons.Gauge,
                  href: `/marketing/performance${q}`,
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Tasks for this project</CardTitle>
                <ViewAllLink href={`/marketing/tasks${q}`} label="Open tasks" />
              </CardHeader>
              <CardContent className="p-0">
                {tasksLoading ? (
                  <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading tasks">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <SectionEmpty message="No tasks yet for this digital project." />
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Task</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Priority</TableHead>
                          <TableHead className="text-xs">Assignee</TableHead>
                          <TableHead className="text-xs text-right">Deadline</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.slice(0, 25).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs font-medium">{t.title}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {TASK_CATEGORY_LABELS[t.category as TaskCategory] ?? t.category}
                            </TableCell>
                            <TableCell>
                              <MarketingStatusBadge variant="task" value={t.status as TaskStatus} />
                            </TableCell>
                            <TableCell>
                              <MarketingStatusBadge
                                variant="priority"
                                value={t.priority as TaskPriority}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {t.assignee ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                              {t.deadline ? format(new Date(t.deadline), "MMM d") : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Approvals</CardTitle>
                <ViewAllLink href={`/marketing/approvals${q}`} label="Open approvals" />
              </CardHeader>
              <CardContent className="p-0">
                {approvalsLoading ? (
                  <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading approvals">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                ) : approvals.length === 0 ? (
                  <SectionEmpty message="No approval items for this project." />
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Stage</TableHead>
                          <TableHead className="text-xs">Assignee</TableHead>
                          <TableHead className="text-xs text-right">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvals.slice(0, 25).map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="text-xs font-medium">{a.title}</TableCell>
                            <TableCell className="text-xs capitalize text-muted-foreground">
                              {a.type}
                            </TableCell>
                            <TableCell>
                              <ApprovalStatusBadge stage={a.stage as ApprovalStage} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {a.assignee ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                              {a.updatedAt ? format(new Date(a.updatedAt), "MMM d") : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled & published posts</CardTitle>
                <ViewAllLink href={`/marketing/calendar${q}`} label="Open calendar" />
              </CardHeader>
              <CardContent className="p-0">
                {postsLoading ? (
                  <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading posts">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <SectionEmpty message="No posts for this project yet." />
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Caption</TableHead>
                          <TableHead className="text-xs">Platform</TableHead>
                          <TableHead className="text-xs">Schedule</TableHead>
                          <TableHead className="text-xs">Approval</TableHead>
                          <TableHead className="text-xs text-right">When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posts.slice(0, 25).map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="max-w-[240px] truncate text-xs font-medium">
                              {p.caption || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              <PlatformIconBadge platform={p.platform} />
                            </TableCell>
                            <TableCell>
                              <MarketingStatusBadge
                                variant="postSchedule"
                                value={p.scheduleStatus as PostScheduleStatus}
                              />
                            </TableCell>
                            <TableCell>
                              <ApprovalStatusBadge stage={p.approvalStage as ApprovalStage} />
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                              {p.scheduledAt
                                ? format(new Date(p.scheduledAt), "MMM d, h:mm a")
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads" className="mt-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <ViewAllLink href={`/marketing/meta-ads${q}`} label="Meta ads" />
              <ViewAllLink href={`/marketing/google-ads${q}`} label="Google ads" />
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {campaigns.length === 0 ? (
                  <SectionEmpty message="No Meta or Google campaigns for this project." />
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Campaign</TableHead>
                          <TableHead className="text-xs">Network</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right">Budget</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.slice(0, 25).map((c) => (
                          <TableRow key={`${c.network ?? ("objective" in c ? "meta" : "google")}-${c.id}`}>
                            <TableCell className="text-xs font-medium">{c.name}</TableCell>
                            <TableCell className="text-xs capitalize text-muted-foreground">
                              {c.network === "google" ? "Google" : "Meta"}
                            </TableCell>
                            <TableCell>
                              <MarketingStatusBadge
                                variant="campaign"
                                value={c.status as CampaignStatus}
                              />
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {formatCompactCurrency(c.budgetInr ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="mt-0">
            <div className="grid gap-3 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Graphics</CardTitle>
                  <ViewAllLink href={`/marketing/graphics${q}`} label="All" />
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-0">
                  {graphics.length === 0 ? (
                    <SectionEmpty message="No graphics." />
                  ) : (
                    graphics.slice(0, 8).map((g) => (
                      <div
                        key={g.id}
                        className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2"
                      >
                        <p className="truncate text-xs font-medium">{g.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <ApprovalStatusBadge stage={g.status as ApprovalStage} />
                          <span className="text-[10px] text-muted-foreground">
                            {g.dueDate ? format(new Date(g.dueDate), "MMM d") : "—"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Videos</CardTitle>
                  <ViewAllLink href={`/marketing/videos${q}`} label="All" />
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-0">
                  {videos.length === 0 ? (
                    <SectionEmpty message="No videos." />
                  ) : (
                    videos.slice(0, 8).map((v) => (
                      <div
                        key={v.id}
                        className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2"
                      >
                        <p className="truncate text-xs font-medium">{v.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <MarketingStatusBadge
                            variant="videoRender"
                            value={v.renderStatus as VideoRenderStatus}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {v.dueDate ? format(new Date(v.dueDate), "MMM d") : "—"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Content</CardTitle>
                  <ViewAllLink href={`/marketing/content${q}`} label="All" />
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-0">
                  {content.length === 0 ? (
                    <SectionEmpty message="No content pieces." />
                  ) : (
                    content.slice(0, 8).map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2"
                      >
                        <p className="truncate text-xs font-medium">{c.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {CONTENT_TYPE_LABELS[c.type as ContentType] ?? c.type}
                          </span>
                          <ApprovalStatusBadge stage={c.status as ApprovalStage} />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium">Media vault</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {mediaFileCount} file{mediaFileCount === 1 ? "" : "s"} in this project's vault
                  </p>
                </div>
                <ViewAllLink href={`/marketing/media${q}`} label="Open vault" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="h-8 gap-1.5" asChild>
                    <Link href={`/marketing/media${q}`}>
                      <HardDrive className="h-3.5 w-3.5" />
                      Browse media files
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                    <Link href={`/marketing/reports${q}`}>
                      <IndianRupee className="h-3.5 w-3.5" />
                      Reports
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={servicesDialogOpen} onOpenChange={setServicesDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Services & social profiles</DialogTitle>
          </DialogHeader>
          <DigitalProjectServiceFields
            compact
            services={servicesForm}
            socialLinks={socialForm}
            platforms={platformsForm}
            onServicesChange={setServicesForm}
            onSocialLinksChange={setSocialForm}
            onPlatformsChange={setPlatformsForm}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setServicesDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateProject.isPending}
              onClick={() => void handleSaveServices()}
            >
              {updateProject.isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit digital workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {canManageMarketingClientCommercial(user?.role) ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Package</Label>
                <Select
                  value={workspaceForm.package}
                  onValueChange={(v) =>
                    setWorkspaceForm((f) => ({ ...f, package: v as MarketingPackage }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PACKAGE_LABELS) as MarketingPackage[]).map((pkg) => (
                      <SelectItem key={pkg} value={pkg}>
                        {PACKAGE_LABELS[pkg]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Package</Label>
                <p className="text-xs font-medium h-8 flex items-center">
                  {PACKAGE_LABELS[workspaceForm.package] ?? workspaceForm.package}
                </p>
              </div>
            )}
            {canViewMarketingClientBudget(user?.role) ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Monthly budget (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={workspaceForm.monthlyBudgetInr}
                  onChange={(e) =>
                    setWorkspaceForm((f) => ({ ...f, monthlyBudgetInr: e.target.value }))
                  }
                  className="h-8 text-xs"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs">Account manager</Label>
              <MarketingAssigneeSelect
                value={workspaceForm.accountManagerId}
                onValueChange={(v) => setWorkspaceForm((f) => ({ ...f, accountManagerId: v }))}
                placeholder="Select manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={workspaceForm.status}
                onValueChange={(v) =>
                  setWorkspaceForm((f) => ({
                    ...f,
                    status: v as WorkspaceForm["status"],
                  }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_STATUS_LABELS) as WorkspaceForm["status"][]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {ACCOUNT_STATUS_LABELS[status]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Platforms</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PLATFORMS.map((platform) => {
                  const selected = workspaceForm.platforms.includes(platform);
                  return (
                    <Badge
                      key={platform}
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-[10px] px-2 py-0.5 select-none",
                        selected && "hover:bg-primary/90",
                      )}
                      onClick={() => togglePlatform(platform)}
                    >
                      {PLATFORM_LABELS[platform]}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Renewal date</Label>
              <Input
                type="date"
                value={workspaceForm.renewalDate}
                onChange={(e) =>
                  setWorkspaceForm((f) => ({ ...f, renewalDate: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Industry</Label>
                <Input
                  value={workspaceForm.industry}
                  onChange={(e) => setWorkspaceForm((f) => ({ ...f, industry: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input
                  value={workspaceForm.city}
                  onChange={(e) => setWorkspaceForm((f) => ({ ...f, city: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Performance score (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={workspaceForm.performanceScore}
                onChange={(e) =>
                  setWorkspaceForm((f) => ({ ...f, performanceScore: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={workspaceForm.notes}
                onChange={(e) => setWorkspaceForm((f) => ({ ...f, notes: e.target.value }))}
                className="min-h-[72px] text-xs resize-y"
                placeholder="Internal notes about this workspace"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWorkspaceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveWorkspace()}
              disabled={updateAccount.isPending}
            >
              {updateAccount.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
