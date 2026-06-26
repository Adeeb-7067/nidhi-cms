export const EXIT_WORKFLOW_STAGES = [
  "Resignation",
  "Approval",
  "Knowledge transfer",
  "Asset return",
  "FnF settlement",
  "Exit",
] as const;

export const EXIT_REQUEST_STATUSES = ["active", "completed", "cancelled"] as const;

export function exitNoticeTone(days: number): "danger" | "warning" | "success" {
  if (days < 7) return "danger";
  if (days < 14) return "warning";
  return "success";
}
