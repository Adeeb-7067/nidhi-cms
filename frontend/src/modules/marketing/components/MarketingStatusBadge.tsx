import { CmsStatusChip } from "@/components/cms";
import type {
  TaskStatus,
  TaskPriority,
  CampaignStatus,
  PostScheduleStatus,
  VideoRenderStatus,
} from "../types";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  CAMPAIGN_STATUS_LABELS,
  POST_SCHEDULE_STATUS_LABELS,
  VIDEO_RENDER_STATUS_LABELS,
} from "../constants";

type MarketingBadgeVariant = "task" | "priority" | "campaign" | "postSchedule" | "videoRender";

const taskStyles: Record<TaskStatus, string> = {
  not_started: "bg-gray-500/10 text-gray-600 border-gray-500/25",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  waiting_client_approval: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  revision: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/25",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-gray-500/10 text-gray-600 border-gray-500/25",
  medium: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  high: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  urgent: "bg-red-500/10 text-red-600 border-red-500/25",
};

const campaignStyles: Record<CampaignStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  paused: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  draft: "bg-gray-500/10 text-gray-600 border-gray-500/25",
  ended: "bg-red-500/10 text-red-600 border-red-500/25",
};

const postScheduleStyles: Record<PostScheduleStatus, string> = {
  scheduled: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  published: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  rejected: "bg-red-500/10 text-red-600 border-red-500/25",
};

const videoRenderStyles: Record<VideoRenderStatus, string> = {
  raw_uploaded: "bg-gray-500/10 text-gray-600 border-gray-500/25",
  editing: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  voiceover_pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  rendering: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  ready: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  exported: "bg-green-500/10 text-green-700 border-green-500/25",
};

function getLabel(variant: MarketingBadgeVariant, status: string): string {
  switch (variant) {
    case "task":
      return TASK_STATUS_LABELS[status as TaskStatus] ?? status;
    case "priority":
      return TASK_PRIORITY_LABELS[status as TaskPriority] ?? status;
    case "campaign":
      return CAMPAIGN_STATUS_LABELS[status as CampaignStatus] ?? status;
    case "postSchedule":
      return POST_SCHEDULE_STATUS_LABELS[status as PostScheduleStatus] ?? status;
    case "videoRender":
      return VIDEO_RENDER_STATUS_LABELS[status as VideoRenderStatus] ?? status;
    default:
      return status;
  }
}

function getStyle(variant: MarketingBadgeVariant, status: string): string {
  switch (variant) {
    case "task":
      return taskStyles[status as TaskStatus] ?? "bg-muted text-muted-foreground";
    case "priority":
      return priorityStyles[status as TaskPriority] ?? "bg-muted text-muted-foreground";
    case "campaign":
      return campaignStyles[status as CampaignStatus] ?? "bg-muted text-muted-foreground";
    case "postSchedule":
      return postScheduleStyles[status as PostScheduleStatus] ?? "bg-muted text-muted-foreground";
    case "videoRender":
      return videoRenderStyles[status as VideoRenderStatus] ?? "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function MarketingStatusBadge({
  variant,
  status,
  value,
  className,
}: {
  variant: MarketingBadgeVariant;
  /** Preferred prop name */
  status?: string;
  /** Alias used by some pages */
  value?: string;
  className?: string;
}) {
  const resolved = status ?? value ?? "";
  return (
    <CmsStatusChip
      label={getLabel(variant, resolved)}
      colorClassName={getStyle(variant, resolved)}
      className={className}
    />
  );
}
