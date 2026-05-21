import type { WorkTask } from "@workspace/api-client-react";

export const TASK_STATUS_LABELS: Record<WorkTask["status"], string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
};

export const TASK_PRIORITY_LABELS: Record<WorkTask["priority"], string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const TASK_TYPE_LABELS: Record<WorkTask["type"], string> = {
  task: "Task",
  feature: "Feature",
  bug_fix: "Bug fix",
  qa: "QA",
  chore: "Chore",
};

export function taskStatusClass(status: WorkTask["status"]): string {
  switch (status) {
    case "done":
      return "text-green-600 border-green-500/30 bg-green-500/10";
    case "in_progress":
      return "text-blue-600 border-blue-500/30 bg-blue-500/10";
    case "in_review":
      return "text-violet-600 border-violet-500/30 bg-violet-500/10";
    case "blocked":
      return "text-red-600 border-red-500/30 bg-red-500/10";
    case "backlog":
      return "text-muted-foreground border-border bg-muted/30";
    default:
      return "text-amber-600 border-amber-500/30 bg-amber-500/10";
  }
}

export function taskPriorityClass(priority: WorkTask["priority"]): string {
  switch (priority) {
    case "urgent":
      return "text-red-600 border-red-500/30 bg-red-500/10";
    case "high":
      return "text-orange-600 border-orange-500/30 bg-orange-500/10";
    case "low":
      return "text-muted-foreground border-border bg-muted/30";
    default:
      return "text-blue-600 border-blue-500/30 bg-blue-500/10";
  }
}
