/** Mirrors backend leave-accrual cycle helpers for UI display. */

export const DEFAULT_LEAVE_RESET_CYCLE_MONTHS = 3;

export function resolveLeaveResetCycleMonths(value?: number | null): number {
  if (value != null && Number.isFinite(Number(value))) {
    return Math.min(12, Math.max(1, Number(value)));
  }
  return DEFAULT_LEAVE_RESET_CYCLE_MONTHS;
}

/** Months from `month` until the next cycle-reset month (1st of that month). */
export function getMonthsUntilLeaveCycleReset(
  month: number,
  startMonth = 1,
  cycleMonths = DEFAULT_LEAVE_RESET_CYCLE_MONTHS,
): number {
  const sm = Math.min(12, Math.max(1, startMonth));
  const cycle = resolveLeaveResetCycleMonths(cycleMonths);
  const offset = (month - sm + 12) % 12;
  const rem = offset % cycle;
  if (rem === 0) return cycle;
  return cycle - rem;
}

/** Next date (local) when unused paid-leave balance is forfeited — always the 1st of a reset month. */
export function getNextLeaveCycleResetDate(
  now = new Date(),
  startMonth = 1,
  cycleMonths = DEFAULT_LEAVE_RESET_CYCLE_MONTHS,
): Date {
  const month = now.getMonth() + 1;
  const monthsUntil = getMonthsUntilLeaveCycleReset(month, startMonth, cycleMonths);
  let targetYear = now.getFullYear();
  let targetMonth = month + monthsUntil;
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }
  return new Date(targetYear, targetMonth - 1, 1);
}

/** First day of the current accrual cycle (after the last reset). */
export function getCurrentLeaveCycleStartDate(
  now = new Date(),
  startMonth = 1,
  cycleMonths = DEFAULT_LEAVE_RESET_CYCLE_MONTHS,
): Date {
  const month = now.getMonth() + 1;
  const sm = Math.min(12, Math.max(1, startMonth));
  const cycle = resolveLeaveResetCycleMonths(cycleMonths);
  const offset = (month - sm + 12) % 12;
  const monthsIntoCycle = offset % cycle;
  let targetYear = now.getFullYear();
  let targetMonth = month - monthsIntoCycle;
  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear -= 1;
  }
  return new Date(targetYear, targetMonth - 1, 1);
}

export type LeaveCycleResetSummary = {
  resetDate: Date;
  resetDateLabel: string;
  cycleStartDate: Date;
  cycleStartDateLabel: string;
  daysRemaining: number;
  cycleMonths: number;
  daysRemainingLabel: string;
};

export function formatLeaveCycleResetDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function getLeaveCycleResetSummary(options?: {
  now?: Date;
  leaveYearStartMonth?: number;
  resetCycleMonths?: number | null;
}): LeaveCycleResetSummary {
  const now = options?.now ?? new Date();
  const startMonth = options?.leaveYearStartMonth ?? 1;
  const cycleMonths = resolveLeaveResetCycleMonths(options?.resetCycleMonths);
  const resetDate = getNextLeaveCycleResetDate(now, startMonth, cycleMonths);
  const cycleStartDate = getCurrentLeaveCycleStartDate(now, startMonth, cycleMonths);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const resetStart = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate());
  const daysRemaining = Math.max(
    0,
    Math.round((resetStart.getTime() - todayStart.getTime()) / 86_400_000),
  );

  const daysRemainingLabel =
    daysRemaining === 0
      ? "resets today"
      : daysRemaining === 1
        ? "1 day left in this cycle"
        : `${daysRemaining} days left in this cycle`;

  return {
    resetDate,
    resetDateLabel: formatLeaveCycleResetDate(resetDate),
    cycleStartDate,
    cycleStartDateLabel: formatLeaveCycleResetDate(cycleStartDate),
    daysRemaining,
    cycleMonths,
    daysRemainingLabel,
  };
}
