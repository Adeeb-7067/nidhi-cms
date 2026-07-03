import type {
  ApprovalStage,
  CampaignStatus,
  ContentType,
  GoogleCampaignType,
  GraphicFileType,
  MarketingPackage,
  MarketingPlatform,
  MetaCampaignObjective,
  PostScheduleStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  VideoExportTarget,
  VideoRenderStatus,
} from "./types";

export const MARKETING_ACCESS_ROLES = ["super_admin"] as const;

export const PACKAGE_LABELS: Record<MarketingPackage, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
  enterprise: "Enterprise",
};

export const PACKAGE_QUOTAS: Record<
  MarketingPackage,
  { graphics: number; ugc: number; reels: number; blogs: number; adSets: number }
> = {
  basic: { graphics: 4, ugc: 1, reels: 1, blogs: 2, adSets: 1 },
  standard: { graphics: 10, ugc: 3, reels: 2, blogs: 4, adSets: 2 },
  premium: { graphics: 20, ugc: 8, reels: 5, blogs: 8, adSets: 4 },
  enterprise: { graphics: 40, ugc: 15, reels: 10, blogs: 12, adSets: 8 },
};

export const PLATFORM_LABELS: Record<MarketingPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  youtube: "YouTube",
  google: "Google",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting_client_approval: "Waiting Client Approval",
  revision: "Revision",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "not_started",
  "in_progress",
  "waiting_client_approval",
  "revision",
  "completed",
  "cancelled",
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  ads: "Ads",
  seo: "SEO",
  content: "Content",
  graphics: "Graphics",
  video: "Video",
  social: "Social",
  reporting: "Reporting",
};

export const APPROVAL_STAGE_LABELS: Record<ApprovalStage, string> = {
  internal_review: "Internal Review",
  client_review: "Client Review",
  revision: "Revision",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
};

export const APPROVAL_STAGE_ORDER: ApprovalStage[] = [
  "internal_review",
  "client_review",
  "revision",
  "approved",
  "scheduled",
  "published",
];

export const POST_SCHEDULE_STATUS_LABELS: Record<PostScheduleStatus, string> = {
  scheduled: "Scheduled",
  pending: "Pending",
  published: "Published",
  rejected: "Rejected",
};

export const GRAPHIC_FILE_LABELS: Record<GraphicFileType, string> = {
  figma: "Figma",
  psd: "PSD",
  ai: "AI",
  png: "PNG",
};

export const VIDEO_RENDER_STATUS_LABELS: Record<VideoRenderStatus, string> = {
  raw_uploaded: "Raw uploaded",
  editing: "Editing",
  voiceover_pending: "Voiceover pending",
  rendering: "Rendering",
  ready: "Ready",
  exported: "Exported",
};

export const VIDEO_EXPORT_LABELS: Record<VideoExportTarget, string> = {
  reel: "Instagram Reel",
  shorts: "YouTube Shorts",
  facebook: "Facebook Video",
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog: "Blog",
  caption: "Caption",
  script: "Script",
  email: "Email",
};

export const META_OBJECTIVE_LABELS: Record<MetaCampaignObjective, string> = {
  awareness: "Brand awareness",
  traffic: "Traffic",
  engagement: "Engagement",
  leads: "Lead generation",
  conversions: "Conversions",
  app_installs: "App installs",
};

export const GOOGLE_CAMPAIGN_TYPE_LABELS: Record<GoogleCampaignType, string> = {
  search: "Search",
  display: "Display",
  shopping: "Shopping",
  performance_max: "Performance Max",
  youtube: "YouTube",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
  ended: "Ended",
};

export function formatCurrencyInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatCurrencyInr(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
