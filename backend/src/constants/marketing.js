/** Shared Digital marketing enums & package quotas — keep aligned with frontend modules/marketing. */

export const MARKETING_PACKAGES = ["basic", "standard", "premium", "enterprise"];
export const MARKETING_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "youtube",
  "google",
  "website",
  "tiktok",
  "pinterest",
  "snapchat",
  "whatsapp",
];

/** What is being scheduled: graphic, reel, long video, short video, comment, sharing, story upload, blog, seo optimization, festival story. */
export const MARKETING_POST_CONTENT_FORMATS = [
  "graphic",
  "reel",
  "long_video",
  "short_video",
  "comment",
  "sharing",
  "story_upload",
  "blog",
  "seo_optimization",
  "festival_story",
  "post",
];
export const MARKETING_ACCOUNT_STATUSES = ["active", "paused", "ended"];

export const MARKETING_TASK_STATUSES = [
  "not_started",
  "in_progress",
  "waiting_client_approval",
  "revision",
  "completed",
  "cancelled",
];
export const MARKETING_TASK_PRIORITIES = ["low", "medium", "high", "urgent"];
export const MARKETING_TASK_CATEGORIES = [
  "ads",
  "seo",
  "content",
  "graphics",
  "video",
  "social",
  "reporting",
];

export const MARKETING_APPROVAL_STAGES = [
  "internal_review",
  "client_review",
  "revision",
  "approved",
  "scheduled",
  "published",
];

export const MARKETING_POST_SCHEDULE_STATUSES = [
  "scheduled",
  "pending",
  "published",
  "rejected",
];

export const MARKETING_MEDIA_KINDS = ["folder", "image", "document", "video", "other"];

export const MARKETING_ACTIVITY_TYPES = ["task", "approval", "campaign", "post", "media", "account"];

export const MARKETING_GRAPHIC_FILE_TYPES = ["figma", "psd", "ai", "png"];
export const MARKETING_CONTENT_TYPES = ["blog", "caption", "script", "email"];
export const MARKETING_VIDEO_EXPORT_TARGETS = ["reel", "shorts", "facebook"];
export const MARKETING_VIDEO_RENDER_STATUSES = [
  "raw_uploaded",
  "editing",
  "voiceover_pending",
  "rendering",
  "ready",
  "exported",
];
export const MARKETING_CAMPAIGN_STATUSES = ["active", "paused", "draft", "ended"];
export const MARKETING_META_OBJECTIVES = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "conversions",
  "app_installs",
];
export const MARKETING_GOOGLE_TYPES = [
  "search",
  "display",
  "shopping",
  "performance_max",
  "youtube",
];
export const MARKETING_RANKING_TRENDS = ["up", "down", "stable"];
export const MARKETING_REPORT_PERIODS = ["daily", "weekly", "monthly"];

/** Monthly deliverable quotas by package (used for usage vs quota on account detail). */
export const PACKAGE_QUOTAS = {
  basic: { graphics: 4, ugc: 1, reels: 1, blogs: 2, adSets: 1 },
  standard: { graphics: 10, ugc: 3, reels: 2, blogs: 4, adSets: 2 },
  premium: { graphics: 20, ugc: 8, reels: 5, blogs: 8, adSets: 4 },
  enterprise: { graphics: 40, ugc: 15, reels: 10, blogs: 12, adSets: 8 },
};

/** Default media vault folders created under each account root. */
export const DEFAULT_MEDIA_SUBFOLDERS = [
  "Images",
  "Documents",
  "Brand assets",
  "Videos",
];
