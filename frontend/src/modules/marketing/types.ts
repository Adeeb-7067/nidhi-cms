export type MarketingPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "youtube"
  | "google"
  | "website"
  | "tiktok"
  | "pinterest"
  | "snapchat"
  | "whatsapp";

/** What is being scheduled on a calendar entry. */
export type PostContentFormat =
  | "graphic"
  | "reel"
  | "long_video"
  | "short_video"
  | "comment"
  | "sharing"
  | "story_upload"
  | "blog"
  | "seo_optimization"
  | "festival_story"
  | "post";

export type MarketingPackage = "basic" | "standard" | "premium" | "enterprise";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "waiting_client_approval"
  | "revision"
  | "completed"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskCategory =
  | "ads"
  | "seo"
  | "content"
  | "graphics"
  | "video"
  | "social"
  | "reporting";

export type ApprovalStage =
  | "internal_review"
  | "client_review"
  | "revision"
  | "approved"
  | "scheduled"
  | "published";

export type PostScheduleStatus = "scheduled" | "pending" | "published" | "rejected";

export type GraphicFileType = "figma" | "psd" | "ai" | "png";

export type VideoExportTarget = "reel" | "shorts" | "facebook";

export type VideoRenderStatus =
  | "raw_uploaded"
  | "editing"
  | "voiceover_pending"
  | "rendering"
  | "ready"
  | "exported";

export type ContentType = "blog" | "caption" | "script" | "email";

export type MetaCampaignObjective =
  | "awareness"
  | "traffic"
  | "engagement"
  | "leads"
  | "conversions"
  | "app_installs";

export type GoogleCampaignType =
  | "search"
  | "display"
  | "shopping"
  | "performance_max"
  | "youtube";

export type CampaignStatus = "active" | "paused" | "draft" | "ended";

export type RankingTrend = "up" | "down" | "stable";

export interface MarketingTask {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  clientId: string;
  clientName: string;
  assignee: string;
  deadline: string;
  estimatedHours: number;
  createdAt: string;
}

export interface PackageQuota {
  graphics: number;
  ugc: number;
  reels: number;
  blogs: number;
  adSets: number;
}

export interface MarketingClient {
  id: string;
  company: string;
  industry: string;
  package: MarketingPackage;
  accountManager: string;
  platforms: MarketingPlatform[];
  monthlyBudgetInr: number | null;
  renewalDate: string;
  city: string;
  performanceScore: number;
}

export interface ClientDeliverableUsage {
  graphics: { used: number; quota: number };
  ugc: { used: number; quota: number };
  reels: { used: number; quota: number };
  blogs: { used: number; quota: number };
}

export interface ClientCampaign {
  id: string;
  name: string;
  platform: MarketingPlatform;
  status: CampaignStatus;
  budgetInr: number;
  spentInr: number;
  startDate: string;
  endDate: string;
}

export interface CalendarPost {
  id: string;
  clientId: string;
  clientName: string;
  platform: MarketingPlatform;
  contentFormat?: PostContentFormat;
  caption: string;
  hashtags: string[];
  scheduledAt: string;
  approvalStage: ApprovalStage;
  scheduleStatus: PostScheduleStatus;
  assignee: string;
}

export interface GraphicRequest {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  status: ApprovalStage;
  revisionCount: number;
  brandGuidelineUrl: string;
  fileTypes: GraphicFileType[];
  assignee: string;
  dueDate: string;
}

export interface VideoRequest {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  renderStatus: VideoRenderStatus;
  hasVoiceover: boolean;
  hasSubtitles: boolean;
  hasThumbnail: boolean;
  exportTarget: VideoExportTarget;
  assignee: string;
  dueDate: string;
}

export interface SocialPlatformMetrics {
  platform: MarketingPlatform;
  followers: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  bestPostTitle: string;
  worstPostTitle: string;
}

export interface MetaAdCampaign {
  id: string;
  name: string;
  clientName: string;
  objective: MetaCampaignObjective;
  status: CampaignStatus;
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

export interface GoogleAdCampaign {
  id: string;
  name: string;
  clientName: string;
  type: GoogleCampaignType;
  status: CampaignStatus;
  budgetInr: number;
  keywords: string[];
  qualityScore: number;
  cpa: number;
  roas: number;
  conversions: number;
}

export interface SeoKeyword {
  id: string;
  keyword: string;
  clientName: string;
  currentRank: number;
  previousRank: number;
  trend: RankingTrend;
  searchVolume: number;
  url: string;
}

export interface SeoAudit {
  id: string;
  clientName: string;
  score: number;
  issues: number;
  lastAuditDate: string;
}

export interface CoreWebVital {
  metric: string;
  value: string;
  status: "good" | "needs_improvement" | "poor";
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  clientName: string;
  status: ApprovalStage;
  seoScore: number;
  wordCount: number;
  assignee: string;
  dueDate: string;
}

export interface ApprovalItem {
  id: string;
  title: string;
  type: string;
  clientName: string;
  stage: ApprovalStage;
  assignee: string;
  updatedAt: string;
}

export interface TeamMemberPerformance {
  id: string;
  name: string;
  role: string;
  tasksCompleted: number;
  avgDeliveryDays: number;
  clientRating: number;
  productivityPct: number;
  lateDeliveryPct: number;
}

export interface MarketingReport {
  id: string;
  title: string;
  period: "daily" | "weekly" | "monthly";
  generatedAt: string;
  clientName?: string;
}

export interface MarketingActivity {
  id: string;
  message: string;
  actor: string;
  timestamp: string;
  type: "task" | "approval" | "campaign" | "post";
}

export interface MarketingDashboardKpis {
  todaysTasks: number;
  pendingApprovals: number;
  adsRunning: number;
  postsScheduled: number;
  clientCount: number;
  performanceScore: number;
}

export type MediaItemKind = "folder" | "image" | "document" | "video" | "other";

export interface MediaItem {
  id: string;
  name: string;
  kind: MediaItemKind;
  /** Parent folder id; null = root (This PC) */
  parentId: string | null;
  /** Linked marketing client when this folder represents a client vault */
  clientId?: string;
  sizeBytes?: number;
  modifiedAt: string;
  extension?: string;
}
