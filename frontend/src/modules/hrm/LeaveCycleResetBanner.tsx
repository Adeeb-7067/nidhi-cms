import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { getLeaveCycleResetSummary } from "./leave-cycle-utils";

type Props = {
  leaveYearStartMonth?: number;
  resetCycleMonths?: number | null;
  paidLeavesPerMonth?: number;
  className?: string;
};

export function LeaveCycleResetBanner({
  leaveYearStartMonth = 1,
  resetCycleMonths,
  paidLeavesPerMonth = 1,
  className,
}: Props) {
  const summary = useMemo(
    () =>
      getLeaveCycleResetSummary({
        leaveYearStartMonth,
        resetCycleMonths,
      }),
    [leaveYearStartMonth, resetCycleMonths],
  );

  return (
    <div
      className={
        className ??
        "rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground"
      }
    >
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Paid leave cycle</p>
          <p>
            You earn{" "}
            <span className="font-semibold text-foreground">
              {paidLeavesPerMonth} day{paidLeavesPerMonth === 1 ? "" : "s"}
            </span>{" "}
            each month. Unused days carry forward within each{" "}
            <span className="font-semibold text-foreground">{summary.cycleMonths}-month</span> cycle, then
            expire.
          </p>
          <p>
            <span className="font-semibold text-foreground">{summary.daysRemainingLabel}</span>
            {" · "}
            Resets on{" "}
            <span className="font-semibold text-foreground">{summary.resetDateLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
