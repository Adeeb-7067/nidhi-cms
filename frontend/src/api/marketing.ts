import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import type {
  MarketingPackage,
  MarketingPlatform,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  ApprovalStage,
  PostScheduleStatus,
  MediaItemKind,
} from "@/modules/marketing/types";

// ── Types ────────────────────────────────────────────────────────────────

export interface MarketingAccount {
  id: number;
  companyId: number;
  companyName: string;
  projectName?: string | null;
  industry: string;
  city: string;
  projectId: number | null;
  package: MarketingPackage;
  accountManagerId: number | null;
  accountManager: string | null;
  platforms: MarketingPlatform[];
  monthlyBudgetInr: number;
  renewalDate: string | null;
  status: "active" | "paused" | "ended";
  performanceScore: number;
  notes?: string | null;
  usage?: {
    graphics: { used: number; quota: number };
    ugc: { used: number; quota: number };
    reels: { used: number; quota: number };
    blogs: { used: number; quota: number };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketingTaskDto {
  id: number;
  accountId: number;
  clientId: string;
  clientName: string;
  companyId: number;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  assignee: string | null;
  deadline: string | null;
  estimatedHours: number;
  description?: string | null;
  createdAt?: string;
}

export interface MarketingMediaDto {
  id: string;
  name: string;
  kind: MediaItemKind;
  parentId: string | null;
  accountId: number;
  companyId: number;
  sizeBytes?: number;
  extension?: string;
  url?: string;
  mimetype?: string;
  modifiedAt: string;
}

export interface MarketingDashboardDto {
  kpis: {
    todaysTasks: number;
    openTasks?: number;
    overdueTasks?: number;
    completedThisWeek?: number;
    pendingApprovals: number;
    adsRunning: number;
    postsScheduled: number;
    postsPublishedMonth?: number;
    clientCount: number;
    accountCount?: number;
    activeAccounts?: number;
    performanceScore: number;
    totalMonthlyBudget?: number;
    activeBudget?: number;
    mediaFiles?: number;
    graphicsCount?: number;
    videosInFlight?: number;
    contentDrafts?: number;
    campaignBudget?: number;
    totalReach?: number;
    totalImpressions?: number;
    totalLeads?: number;
  };
  tasksByStatus: { name: string; value: number }[];
  tasksByCategory: { name: string; value: number }[];
  tasksByPriority?: { name: string; value: number }[];
  approvalsByStage?: { name: string; value: number }[];
  approvalsByType?: { name: string; value: number }[];
  postsByPlatform?: { name: string; value: number }[];
  postsByStatus?: { name: string; value: number }[];
  accountsByPackage?: { name: string; value: number }[];
  accountsByStatus?: { name: string; value: number }[];
  campaignsByNetwork?: { name: string; value: number }[];
  campaignsByStatus?: { name: string; value: number }[];
  activityTrend?: { date: string; activity: number; completed: number }[];
  topAccounts?: {
    id: number;
    companyName: string;
    package: MarketingPackage;
    performanceScore: number;
    monthlyBudgetInr: number;
    platforms: MarketingPlatform[];
    status: string;
  }[];
  upcomingDeadlines?: {
    id: number;
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    status: TaskStatus;
    deadline: string | null;
    clientName: string;
    overdue: boolean;
  }[];
  activity: {
    id: string;
    message: string;
    actor: string;
    timestamp: string;
    type: string;
  }[];
}

export interface MarketingPostDto {
  id: number;
  accountId: number;
  clientName: string;
  platform: MarketingPlatform;
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
  approvalStage: ApprovalStage;
  scheduleStatus: PostScheduleStatus;
  assigneeId?: number | null;
  assignee: string | null;
}

export interface MarketingApprovalDto {
  id: number;
  title: string;
  type: string;
  clientName: string;
  accountId: number;
  stage: ApprovalStage;
  assigneeId?: number | null;
  assignee: string | null;
  updatedAt: string | null;
}

// ── Dashboard ────────────────────────────────────────────────────────────

export function useMarketingDashboard() {
  return useQuery({
    queryKey: ["marketing", "dashboard"],
    queryFn: () => customFetch<MarketingDashboardDto>(apiUrl("/api/marketing/dashboard")),
  });
}

// ── Accounts ─────────────────────────────────────────────────────────────

export function useMarketingAccounts(params?: {
  search?: string;
  status?: string;
  projectId?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.projectId != null) qs.set("projectId", String(params.projectId));
  qs.set("limit", "100");
  const q = qs.toString();
  return useQuery({
    queryKey: ["marketing", "accounts", params],
    queryFn: () =>
      customFetch<{ accounts: MarketingAccount[]; total: number }>(
        apiUrl(`/api/marketing/accounts${q ? `?${q}` : ""}`),
      ),
  });
}

export function useMarketingAccount(id: number | string | undefined) {
  const num = id != null ? Number(id) : NaN;
  return useQuery({
    queryKey: ["marketing", "accounts", num],
    enabled: Number.isFinite(num),
    queryFn: () => customFetch<MarketingAccount>(apiUrl(`/api/marketing/accounts/${num}`)),
  });
}

export function useCreateMarketingAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch<MarketingAccount>(apiUrl("/api/marketing/accounts"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "accounts"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "dashboard"] });
    },
  });
}

export function useUpdateMarketingAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      customFetch<MarketingAccount>(apiUrl(`/api/marketing/accounts/${id}`), {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["marketing", "accounts"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "accounts", vars.id] });
    },
  });
}

export function useDeleteMarketingAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean }>(apiUrl(`/api/marketing/accounts/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing"] });
    },
  });
}

// ── Tasks ────────────────────────────────────────────────────────────────

export function useMarketingTasks(
  params?: {
    accountId?: number;
    status?: string;
    category?: string;
  },
  options?: { enabled?: boolean },
) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  if (params?.status) qs.set("status", params.status);
  if (params?.category) qs.set("category", params.category);
  qs.set("limit", "200");
  const q = qs.toString();
  return useQuery({
    queryKey: ["marketing", "tasks", params],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      customFetch<{ tasks: MarketingTaskDto[]; total: number }>(
        apiUrl(`/api/marketing/tasks${q ? `?${q}` : ""}`),
      ),
  });
}

export function useCreateMarketingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch<MarketingTaskDto>(apiUrl("/api/marketing/tasks"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "dashboard"] });
    },
  });
}

export function useUpdateMarketingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch<MarketingTaskDto>(
        apiUrl(`/api/marketing/tasks/${id}?accountId=${accountId}`),
        {
          method: "PATCH",
          body: JSON.stringify({ ...data, accountId }),
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "dashboard"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "performance"] });
    },
  });
}

export function useDeleteMarketingTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: number; accountId: number }) =>
      customFetch<{ ok: boolean }>(
        apiUrl(`/api/marketing/tasks/${id}?accountId=${accountId}`),
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "dashboard"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "performance"] });
    },
  });
}

// ── Media ────────────────────────────────────────────────────────────────

export function useMarketingMediaTree(accountId: number | undefined) {
  return useQuery({
    queryKey: ["marketing", "media", "tree", accountId],
    enabled: Number.isFinite(accountId),
    queryFn: () =>
      customFetch<{ items: MarketingMediaDto[] }>(
        apiUrl(`/api/marketing/media/tree?accountId=${accountId}`),
      ),
  });
}

export function useMarketingMediaChildren(
  accountId: number | undefined,
  parentId: string | null,
) {
  const qs = new URLSearchParams();
  if (accountId) qs.set("accountId", String(accountId));
  if (parentId != null) qs.set("parentId", parentId);
  return useQuery({
    queryKey: ["marketing", "media", accountId, parentId],
    enabled: Number.isFinite(accountId),
    queryFn: () =>
      customFetch<{ items: MarketingMediaDto[] }>(apiUrl(`/api/marketing/media?${qs}`)),
  });
}

export function useCreateMarketingFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { accountId: number; parentId?: string | null; name: string }) =>
      customFetch<MarketingMediaDto>(apiUrl("/api/marketing/media/folders"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "media"] });
    },
  });
}

export function useRegisterMarketingFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch<MarketingMediaDto>(apiUrl("/api/marketing/media/files"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "media"] });
    },
  });
}

export function useRenameMarketingMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      accountId,
    }: {
      id: string | number;
      name: string;
      accountId: number;
    }) =>
      customFetch<MarketingMediaDto>(
        apiUrl(`/api/marketing/media/${id}?accountId=${accountId}`),
        {
          method: "PATCH",
          body: JSON.stringify({ name, accountId }),
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "media"] });
    },
  });
}

export function useDeleteMarketingMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string | number; accountId: number }) =>
      customFetch<{ ok: boolean }>(
        apiUrl(`/api/marketing/media/${id}?accountId=${accountId}`),
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "media"] });
    },
  });
}

export function useMoveMarketingMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      parentId,
    }: {
      id: string | number;
      accountId: number;
      parentId: string | number | null;
    }) =>
      customFetch<MarketingMediaDto>(
        apiUrl(`/api/marketing/media/${id}/move?accountId=${accountId}`),
        {
          method: "POST",
          body: JSON.stringify({
            accountId,
            parentId: parentId == null ? null : Number(parentId),
          }),
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "media"] });
    },
  });
}

// ── Posts / Approvals ────────────────────────────────────────────────────

export function useMarketingPosts(
  params?: { accountId?: number },
  options?: { enabled?: boolean },
) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  qs.set("limit", "200");
  return useQuery({
    queryKey: ["marketing", "posts", params],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      customFetch<{ posts: MarketingPostDto[]; total: number }>(
        apiUrl(`/api/marketing/posts?${qs}`),
      ),
  });
}

export function useMarketingApprovals(
  params?: { accountId?: number },
  options?: { enabled?: boolean },
) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  qs.set("limit", "200");
  return useQuery({
    queryKey: ["marketing", "approvals", params],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      customFetch<{ approvals: MarketingApprovalDto[]; total: number }>(
        apiUrl(`/api/marketing/approvals?${qs}`),
      ),
  });
}

export function useUpdateMarketingApprovalStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      stage,
      accountId,
    }: {
      id: number;
      stage: ApprovalStage;
      accountId: number;
    }) =>
      customFetch<{ id: number; stage: ApprovalStage }>(
        apiUrl(`/api/marketing/approvals/${id}/stage?accountId=${accountId}`),
        { method: "PATCH", body: JSON.stringify({ stage, accountId }) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "approvals"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "posts"] });
      void qc.invalidateQueries({ queryKey: ["marketing", "dashboard"] });
    },
  });
}

export function useUpdateMarketingApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: number;
      accountId: number;
      data: { assigneeId?: number | null; title?: string };
    }) =>
      customFetch<MarketingApprovalDto>(
        apiUrl(`/api/marketing/approvals/${id}?accountId=${accountId}`),
        { method: "PATCH", body: JSON.stringify({ ...data, accountId }) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["marketing", "approvals"] });
    },
  });
}

// ── Graphics / Videos / Content queues ───────────────────────────────────

export interface MarketingGraphicDto {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  accountId: number;
  status: ApprovalStage;
  revisionCount: number;
  brandGuidelineUrl: string;
  fileTypes: ("figma" | "psd" | "ai" | "png")[];
  assigneeId?: number | null;
  assignee: string;
  dueDate: string | null;
}

export interface MarketingVideoDto {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  accountId: number;
  renderStatus: string;
  hasVoiceover: boolean;
  hasSubtitles: boolean;
  hasThumbnail: boolean;
  exportTarget: "reel" | "shorts" | "facebook";
  assigneeId?: number | null;
  assignee: string;
  dueDate: string | null;
}

export interface MarketingContentDto {
  id: string;
  title: string;
  type: "blog" | "caption" | "script" | "email";
  clientName: string;
  accountId: number;
  status: ApprovalStage;
  seoScore: number;
  wordCount: number;
  assigneeId?: number | null;
  assignee: string;
  dueDate: string | null;
}

export function useMarketingGraphics(
  params?: { accountId?: number },
  options?: { enabled?: boolean },
) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  qs.set("limit", "200");
  return useQuery({
    queryKey: ["marketing", "graphics", params],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      customFetch<{ graphics: MarketingGraphicDto[]; total: number }>(
        apiUrl(`/api/marketing/graphics?${qs}`),
      ),
  });
}

export function useMarketingVideos(
  params?: { accountId?: number },
  options?: { enabled?: boolean },
) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  qs.set("limit", "200");
  return useQuery({
    queryKey: ["marketing", "videos", params],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      customFetch<{ videos: MarketingVideoDto[]; total: number }>(
        apiUrl(`/api/marketing/videos?${qs}`),
      ),
  });
}

export function useMarketingContent(
  params?: { accountId?: number },
  options?: { enabled?: boolean },
) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  qs.set("limit", "200");
  return useQuery({
    queryKey: ["marketing", "content", params],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      customFetch<{ content: MarketingContentDto[]; total: number }>(
        apiUrl(`/api/marketing/content?${qs}`),
      ),
  });
}

// ── Ads / Social / SEO / Performance / Reports ───────────────────────────

export interface MarketingMetaCampaignDto {
  id: string;
  name: string;
  clientName: string;
  accountId: number;
  network: "meta";
  objective: string;
  status: string;
  budgetInr: number;
  audience: string;
  reach: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  roas: number;
}

export interface MarketingGoogleCampaignDto {
  id: string;
  name: string;
  clientName: string;
  accountId: number;
  network: "google";
  type: string;
  status: string;
  budgetInr: number;
  keywords: string[];
  qualityScore: number;
  cpa: number;
  roas: number;
  conversions: number;
}

export function useMarketingCampaigns(
  network: "meta" | "google",
  params?: { accountId?: number },
  options?: { enabled?: boolean },
) {
  const qs = new URLSearchParams({ network, limit: "200" });
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  return useQuery({
    queryKey: ["marketing", "campaigns", network, params],
    enabled: options?.enabled ?? true,
    queryFn: () =>
      customFetch<{
        campaigns: (MarketingMetaCampaignDto | MarketingGoogleCampaignDto)[];
        total: number;
      }>(apiUrl(`/api/marketing/campaigns?${qs}`)),
  });
}

export interface MarketingSocialMetricDto {
  id: number;
  accountId: number;
  clientName?: string;
  platform: MarketingPlatform;
  followers: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  bestPostTitle: string;
  worstPostTitle: string;
}

export function useMarketingSocial(params?: { accountId?: number }) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  const q = qs.toString();
  return useQuery({
    queryKey: ["marketing", "social", params],
    queryFn: () =>
      customFetch<{ metrics: MarketingSocialMetricDto[] }>(
        apiUrl(`/api/marketing/social${q ? `?${q}` : ""}`),
      ),
  });
}

export function useMarketingSeo(params?: { accountId?: number }) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  const q = qs.toString();
  return useQuery({
    queryKey: ["marketing", "seo", params],
    queryFn: () =>
      customFetch<{
        keywords: {
          id: string;
          keyword: string;
          clientName: string;
          accountId: number;
          currentRank: number;
          previousRank: number;
          trend: "up" | "down" | "stable";
          searchVolume: number;
          url: string;
        }[];
        audits: {
          id: string;
          clientName: string;
          accountId: number;
          score: number;
          issues: number;
          lastAuditDate: string | null;
        }[];
        backlinksSummary: {
          total: number;
          newThisMonth: number;
          lost: number;
          domainAuthority: number;
        };
        monthlyRankingTrend: { month: string; avgRank: number; keywordsTop10: number }[];
        coreWebVitals: {
          metric: string;
          value: string;
          status: "good" | "needs_improvement" | "poor";
        }[];
        derivedMetricsNote?: string;
      }>(apiUrl(`/api/marketing/seo${q ? `?${q}` : ""}`)),
  });
}

export function useMarketingPerformance(params?: { accountId?: number }) {
  const qs = new URLSearchParams();
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  const q = qs.toString();
  return useQuery({
    queryKey: ["marketing", "performance", params],
    queryFn: () =>
      customFetch<{
        members: {
          id: string;
          name: string;
          role: string;
          tasksCompleted: number;
          avgDeliveryDays: number;
          clientRating: number;
          clientRatingIsEstimated?: boolean;
          productivityPct: number;
          lateDeliveryPct: number;
        }[];
      }>(apiUrl(`/api/marketing/performance${q ? `?${q}` : ""}`)),
  });
}

export function useMarketingReports(params?: { accountId?: number }) {
  const qs = new URLSearchParams({ limit: "100" });
  if (params?.accountId) qs.set("accountId", String(params.accountId));
  return useQuery({
    queryKey: ["marketing", "reports", params],
    queryFn: () =>
      customFetch<{
        reports: {
          id: string;
          title: string;
          period: "daily" | "weekly" | "monthly";
          generatedAt: string;
          accountId?: number | null;
          clientName?: string;
        }[];
        total: number;
      }>(apiUrl(`/api/marketing/reports?${qs}`)),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, keys: string[][]) {
  for (const key of keys) void qc.invalidateQueries({ queryKey: key });
}

export function useCreateMarketingPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/posts"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      invalidate(qc, [["marketing", "posts"], ["marketing", "approvals"], ["marketing", "dashboard"]]),
  });
}

export function useCreateMarketingGraphic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/graphics"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "graphics"]]),
  });
}

export function useCreateMarketingVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/videos"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "videos"]]),
  });
}

export function useCreateMarketingContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/content"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "content"]]),
  });
}

export function useCreateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/campaigns"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "campaigns"]]),
  });
}

export function useCreateMarketingSeoKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/seo/keywords"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "seo"]]),
  });
}

export function useCreateMarketingReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/reports"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "reports"]]),
  });
}

export function useUpdateMarketingPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch(apiUrl(`/api/marketing/posts/${id}?accountId=${accountId}`), {
        method: "PATCH",
        body: JSON.stringify({ ...data, accountId }),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "posts"], ["marketing", "approvals"], ["marketing", "dashboard"]]),
  });
}

export function useDeleteMarketingPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/posts/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "posts"], ["marketing", "approvals"], ["marketing", "dashboard"]]),
  });
}

export function useDeleteMarketingApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/approvals/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "approvals"], ["marketing", "dashboard"]]),
  });
}

export function useUpdateMarketingGraphic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: string | number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch(apiUrl(`/api/marketing/graphics/${id}?accountId=${accountId}`), {
        method: "PATCH",
        body: JSON.stringify({ ...data, accountId }),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "graphics"]]),
  });
}

export function useDeleteMarketingGraphic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string | number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/graphics/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "graphics"]]),
  });
}

export function useUpdateMarketingVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: string | number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch(apiUrl(`/api/marketing/videos/${id}?accountId=${accountId}`), {
        method: "PATCH",
        body: JSON.stringify({ ...data, accountId }),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "videos"]]),
  });
}

export function useDeleteMarketingVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string | number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/videos/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "videos"]]),
  });
}

export function useUpdateMarketingContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: string | number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch(apiUrl(`/api/marketing/content/${id}?accountId=${accountId}`), {
        method: "PATCH",
        body: JSON.stringify({ ...data, accountId }),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "content"]]),
  });
}

export function useDeleteMarketingContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string | number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/content/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "content"]]),
  });
}

export function useUpdateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: string | number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch(apiUrl(`/api/marketing/campaigns/${id}?accountId=${accountId}`), {
        method: "PATCH",
        body: JSON.stringify({ ...data, accountId }),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "campaigns"], ["marketing", "dashboard"]]),
  });
}

export function useDeleteMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string | number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/campaigns/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "campaigns"], ["marketing", "dashboard"]]),
  });
}

export function useUpsertMarketingSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      customFetch(apiUrl("/api/marketing/social"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "social"]]),
  });
}

export function useDeleteMarketingSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/social/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "social"]]),
  });
}

export function useUpdateMarketingSeoKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: string | number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch(apiUrl(`/api/marketing/seo/keywords/${id}?accountId=${accountId}`), {
        method: "PATCH",
        body: JSON.stringify({ ...data, accountId }),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "seo"]]),
  });
}

export function useDeleteMarketingSeoKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string | number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/seo/keywords/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "seo"]]),
  });
}

export function useUpdateMarketingReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      accountId,
      data,
    }: {
      id: string | number;
      accountId: number;
      data: Record<string, unknown>;
    }) =>
      customFetch(apiUrl(`/api/marketing/reports/${id}?accountId=${accountId}`), {
        method: "PATCH",
        body: JSON.stringify({ ...data, accountId }),
      }),
    onSuccess: () => invalidate(qc, [["marketing", "reports"]]),
  });
}

export function useDeleteMarketingReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accountId }: { id: string | number; accountId: number }) =>
      customFetch(apiUrl(`/api/marketing/reports/${id}?accountId=${accountId}`), {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, [["marketing", "reports"]]),
  });
}
