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
          <p className="font-medium text-foreground">How paid leave works</p>
          <p>
            Earn{" "}
            <span className="font-semibold text-foreground">
              {paidLeavesPerMonth} day{paidLeavesPerMonth === 1 ? "" : "s"}
            </span>{" "}
            each month. Unused days stack inside the current{" "}
            <span className="font-semibold text-foreground">{summary.cycleMonths}-month</span> cycle,
            then unused balance resets to zero.
          </p>
          <p>
            This cycle started{" "}
            <span className="font-semibold text-foreground">{summary.cycleStartDateLabel}</span>
            {" · "}
            <span className="font-semibold text-foreground">{summary.daysRemainingLabel}</span>
            {" · "}
            next reset{" "}
            <span className="font-semibold text-foreground">{summary.resetDateLabel}</span>
          </p>
          <p className="text-[11px]">
            Rejected or cancelled requests restore balance. Approved half days use{" "}
            <span className="font-semibold text-foreground">0.5</span> day.
          </p>
        </div>
      </div>
    </div>
  );
}
