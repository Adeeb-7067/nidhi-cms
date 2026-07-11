import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useMyActiveWarnings } from "@/api/warnings";

function formatWindow(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

/**
 * Non-dismissible warning section shown at the top of an employee's dashboard.
 * Renders nothing when there are no active warnings for the current user.
 */
export function EmployeeWarningBanner({ enabled = true }: { enabled?: boolean }) {
  const { data } = useMyActiveWarnings(enabled);
  const warnings = data?.warnings ?? [];
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <div
          key={w.id}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/[0.08]"
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Warning
              </p>
              <span className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
                {formatWindow(w.startDate, w.endDate)}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-amber-900 dark:text-amber-100">
              {w.title}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
              {w.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
