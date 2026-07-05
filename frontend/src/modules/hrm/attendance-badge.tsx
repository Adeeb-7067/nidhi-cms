import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ATTENDANCE_STATUS_LABELS, normalizeAttendanceStatus } from "./constants";

export const ATTENDANCE_STATUS_CLASS: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  onsite: "bg-amber-500/10 text-amber-800 border-amber-500/25",
  late: "bg-amber-500/10 text-amber-800 border-amber-500/25",
  absent: "bg-red-500/10 text-red-600 border-red-500/20",
  wfh: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  on_leave: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  holiday: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  weekend: "bg-muted text-muted-foreground border-border",
  short: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  half_day: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  scheduled: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export function HrmAttendanceBadge({ status, suffix }: { status: string; suffix?: string }) {
  const normalized = status === "scheduled" ? "scheduled" : normalizeAttendanceStatus(status);
  const label = ATTENDANCE_STATUS_LABELS[normalized] ?? ATTENDANCE_STATUS_LABELS[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 text-xs font-medium", ATTENDANCE_STATUS_CLASS[normalized] ?? ATTENDANCE_STATUS_CLASS[status] ?? "")}
    >
      {label}
      {suffix}
    </Badge>
  );
}
