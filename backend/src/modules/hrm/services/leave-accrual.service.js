import {
  leaveTypesTable,
  leaveBalancesTable,
  usersTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { hrmEmployeeRoles } from "../../../constants/user-roles.js";
import { getOrCreateSettings } from "../../settings/services/company-settings.js";
import { resolveWorkDayTimezone } from "../../monitoring/services/work-session-policy.js";
import { withJobLock } from "../../jobs/services/withJobLock.js";
import { runInTx } from "../../../lib/db-tx.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { logger } from "../../../lib/logger.js";
import { isDatabaseConnected } from "../../../lib/db.js";

/** Local hour (0–23) when the monthly accrual / carry-forward job fires. */
export const LEAVE_ACCRUAL_RUN_HOUR = 2;
/** Default paid-leave reset interval: unused balance forfeits every N months. */
export const LEAVE_RESET_CYCLE_MONTHS = 3;

const ACCRUAL_LEAVE_CODE = "EL";
const JOB_TICK_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested without DB)
// ---------------------------------------------------------------------------

/** Remaining paid leave days on a balance row. */
export function computeAvailableBalance({ allocated = 0, carriedForward = 0, used = 0, pending = 0 }) {
  return Math.max(0, allocated + carriedForward - used - pending);
}

/**
 * Leave-year label for balance rows when the year does not start in January.
 * Example: startMonth=4 → dates in Apr–Dec 2026 map to 2026; Jan–Mar 2026 map to 2025.
 */
export function getLeaveYearForDate(year, month, startMonth = 1) {
  const sm = Math.min(12, Math.max(1, startMonth));
  return month >= sm ? year : year - 1;
}

/**
 * True on the first month of each leave cycle (default every 3 months).
 * Example with startMonth=1, cycle=3 → Jan, Apr, Jul, Oct.
 * Within a cycle, monthly accrual is cumulative so unused days carry forward month-to-month.
 * On cycle-start months the prior cycle balance is forfeited before the new accrual credits.
 */
export function isLeaveCycleResetMonth(month, startMonth = 1, cycleMonths = LEAVE_RESET_CYCLE_MONTHS) {
  const sm = Math.min(12, Math.max(1, startMonth));
  const cycle = Math.min(12, Math.max(1, Number(cycleMonths) || LEAVE_RESET_CYCLE_MONTHS));
  return ((month - sm + 12) % 12) % cycle === 0;
}

/**
 * True during the first reset-cycle of a leave year (e.g. start=6, cycle=3 → Jun/Jul/Aug).
 * Used to reclaim EL that was mis-bucketed into the prior leave-year label after settings changes.
 */
export function isInFirstLeaveCycle(month, startMonth = 1, cycleMonths = LEAVE_RESET_CYCLE_MONTHS) {
  const sm = Math.min(12, Math.max(1, startMonth));
  const cycle = Math.min(12, Math.max(1, Number(cycleMonths) || LEAVE_RESET_CYCLE_MONTHS));
  const offset = (month - sm + 12) % 12;
  return offset < cycle;
}

/**
 * Whether an older leave-year balance row should be folded into the current leave year.
 * Touch date (last accrual/update) must itself map to the current leave year under
 * today's start-month setting — otherwise it is a true closed-year leftover.
 * Missing touch metadata is treated as closed-year (do not reclaim) so pre-cycle
 * months like May are not pulled into a June-start cycle.
 */
export function shouldReclaimStrandedAccrualTouch({
  calendarMonth,
  startMonth = 1,
  cycleMonths = LEAVE_RESET_CYCLE_MONTHS,
  currentLeaveYear,
  touchYear,
  touchMonth,
}) {
  if (!isInFirstLeaveCycle(calendarMonth, startMonth, cycleMonths)) return false;
  if (touchYear == null || touchMonth == null) return false;
  return getLeaveYearForDate(touchYear, touchMonth, startMonth) === currentLeaveYear;
}

/** Resolve configured leave reset cycle length from company settings. */
export function resolveLeaveResetCycleMonths(settings) {
  const configured = settings?.hrmLeaveResetCycleMonths;
  if (configured != null && Number.isFinite(Number(configured))) {
    return Math.min(12, Math.max(1, Number(configured)));
  }
  return LEAVE_RESET_CYCLE_MONTHS;
}

/** Days to credit this employee for the monthly accrual run (Satyakabir: leave.monthlyQuota). */
export function resolveAccrualDaysPerMonth(user, settings) {
  // Explicit per-employee override from Employee file ("Leave accrual / month").
  const perUser = user?.leaveAccrualDaysPerMonth;
  if (perUser != null && Number.isFinite(Number(perUser))) {
    return Math.max(0, Number(perUser));
  }
  // Company HRM setting — applies to every employee without a personal override.
  const global = settings?.hrmPaidLeavesPerMonth;
  if (global != null && Number.isFinite(Number(global))) {
    return Math.max(0, Number(global));
  }
  // Legacy nested / monthlyLeaveQuota only when leaveAccrualDaysPerMonth was never set
  // and company setting is also unset. Do not prefer a stale nested quota over company default.
  const nested = user?.leave?.monthlyQuota;
  if (nested != null && Number.isFinite(Number(nested))) {
    return Math.max(0, Number(nested));
  }
  const legacy = user?.monthlyLeaveQuota;
  if (legacy != null && Number.isFinite(Number(legacy))) {
    return Math.max(0, Number(legacy));
  }
  return 1;
}

/**
 * Unused days eligible for carry-forward from a prior-year balance.
 * Returns 0 when the leave type disallows carry-forward.
 */
export function computeCarryForwardAmount(priorBalance, leaveType) {
  if (!leaveType?.carryForwardAllowed) return 0;
  if (!priorBalance) return 0;
  return computeAvailableBalance(priorBalance);
}

/**
 * Oldest-accrued-first consumption plan across leave types (lower fifoPriority first).
 * Returns per-type deductions and any unpaid overflow (LOP days).
 */
export function allocateOldestFirst(leaveTypes, balanceByTypeId, daysToConsume) {
  const sorted = [...leaveTypes]
    .filter((t) => t.status !== "inactive" && t.isPaid !== false)
    .sort((a, b) => (a.fifoPriority ?? 0) - (b.fifoPriority ?? 0));

  let remaining = Math.max(0, daysToConsume);
  const allocations = [];

  for (const type of sorted) {
    if (remaining <= 0) break;
    const bal = balanceByTypeId.get(type.id) ?? {
      allocated: 0,
      carriedForward: 0,
      used: 0,
      pending: 0,
    };
    const available = computeAvailableBalance(bal);
    const take = Math.min(remaining, available);
    if (take > 0) {
      allocations.push({ leaveTypeId: type.id, code: type.code, days: take });
      remaining -= take;
    }
  }

  return {
    allocations,
    unpaidDays: Math.max(0, remaining),
  };
}

// ---------------------------------------------------------------------------
// Timezone helpers (mirrors daily-log-compliance.js)
// ---------------------------------------------------------------------------

function localDateParts(date, tz) {
  if (tz) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [y, m, d] = fmt.format(date).split("-").map(Number);
    return { year: y, month: m, day: d };
  }
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function localHour(date, tz) {
  if (tz) {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
    }).format(date);
    const parsed = Number.parseInt(hour, 10);
    return parsed === 24 ? 0 : parsed;
  }
  return date.getUTCHours();
}

function parsePeriodKey(periodKey) {
  const [y, m] = String(periodKey).split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    throw new Error(`Invalid accrual period key: ${periodKey}`);
  }
  return { year: y, month: m };
}

/** Next calendar month key after `periodKey` (YYYY-MM). */
export function nextAccrualPeriodKey(periodKey) {
  const { year, month } = parsePeriodKey(periodKey);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** Previous calendar month key before `periodKey` (YYYY-MM). */
export function previousAccrualPeriodKey(periodKey) {
  const { year, month } = parsePeriodKey(periodKey);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

/** Shift a YYYY-MM period by `delta` months (negative = earlier). */
export function shiftAccrualPeriodKey(periodKey, deltaMonths) {
  const { year, month } = parsePeriodKey(periodKey);
  const idx = year * 12 + (month - 1) + deltaMonths;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * First month of the leave cycle that contains `periodKey`
 * (e.g. Aug with June start / 3-month cycle → 2026-06).
 */
export function currentCycleStartPeriodKey(periodKey, startMonth = 1, cycleMonths = LEAVE_RESET_CYCLE_MONTHS) {
  const { year, month } = parsePeriodKey(periodKey);
  const sm = Math.min(12, Math.max(1, startMonth));
  const cycle = Math.min(12, Math.max(1, Number(cycleMonths) || LEAVE_RESET_CYCLE_MONTHS));
  const offset = (month - sm + 12) % 12;
  const monthsIntoCycle = offset % cycle;
  return shiftAccrualPeriodKey(periodKey, -monthsIntoCycle);
}

/**
 * Inclusive list of accrual months from `fromPeriod` through `throughPeriod`.
 */
export function listAccrualPeriodsInclusive(fromPeriod, throughPeriod) {
  if (!fromPeriod || !throughPeriod || fromPeriod > throughPeriod) return [];
  if (fromPeriod === throughPeriod) return [throughPeriod];
  return [fromPeriod, ...listAccrualPeriodsAfter(fromPeriod, throughPeriod)];
}

/**
 * Months that should earn leave in the active cycle through `throughPeriod`.
 * Starts at the later of cycle start and joining month (when provided).
 */
export function listEligibleAccrualPeriodsInCycle({
  throughPeriod,
  startMonth = 1,
  cycleMonths = LEAVE_RESET_CYCLE_MONTHS,
  joinPeriod = null,
}) {
  if (!throughPeriod) return [];
  const cycleStart = currentCycleStartPeriodKey(throughPeriod, startMonth, cycleMonths);
  const from =
    joinPeriod && joinPeriod > cycleStart ? joinPeriod : cycleStart;
  if (from > throughPeriod) return [];
  return listAccrualPeriodsInclusive(from, throughPeriod);
}

/** Expected earned days for the active cycle (quota × eligible months). */
export function expectedAccruedDaysInCycle({
  throughPeriod,
  startMonth = 1,
  cycleMonths = LEAVE_RESET_CYCLE_MONTHS,
  joinPeriod = null,
  daysPerMonth = 1,
}) {
  const periods = listEligibleAccrualPeriodsInCycle({
    throughPeriod,
    startMonth,
    cycleMonths,
    joinPeriod,
  });
  const days = Math.max(0, Number(daysPerMonth) || 0);
  return Math.round(periods.length * days * 100) / 100;
}

/**
 * Accrual months to credit when catching up from `lastPeriod` (exclusive) through `throughPeriod` (inclusive).
 * When `lastPeriod` is null, only `throughPeriod` is credited.
 * Optional `notBeforePeriod` drops months before join / eligibility.
 */
export function listAccrualPeriodsAfter(lastPeriod, throughPeriod, { notBeforePeriod = null } = {}) {
  if (!throughPeriod) return [];
  let periods;
  if (!lastPeriod) {
    periods = [throughPeriod];
  } else if (lastPeriod >= throughPeriod) {
    periods = [];
  } else {
    periods = [];
    let cursor = nextAccrualPeriodKey(lastPeriod);
    while (cursor <= throughPeriod) {
      periods.push(cursor);
      if (cursor === throughPeriod) break;
      cursor = nextAccrualPeriodKey(cursor);
    }
  }
  if (!notBeforePeriod) return periods;
  return periods.filter((p) => p >= notBeforePeriod);
}

/** Calendar month key (YYYY-MM) in the company work-day timezone. */
export function currentAccrualPeriodKey(now = new Date(), tz) {
  const { year, month } = localDateParts(now, tz);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Join-month key for accrual eligibility.
 * YYYY-MM-DD strings are treated as calendar dates (not UTC-midnight instants)
 * so IST/other zones do not shift the join month backward.
 */
export function accrualPeriodKeyFromJoiningDate(joiningDate, tz) {
  if (joiningDate == null || joiningDate === "") return null;
  if (typeof joiningDate === "string") {
    const m = joiningDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  const d = joiningDate instanceof Date ? joiningDate : new Date(joiningDate);
  if (Number.isNaN(d.getTime())) return null;
  return currentAccrualPeriodKey(d, tz);
}

export function leaveProfileFieldsTouched(patchKeys) {
  const keys = new Set(patchKeys);
  return keys.has("leaveAccrualDaysPerMonth") || keys.has("monthlyLeaveQuota") || keys.has("leave");
}

async function findAccrualLeaveType() {
  let type = await leaveTypesTable.findOne({ code: ACCRUAL_LEAVE_CODE, status: "active" }).lean();
  if (type) return type;
  type = await leaveTypesTable
    .findOne({ status: "active", isPaid: { $ne: false } })
    .sort({ fifoPriority: 1 })
    .lean();
  return type;
}

/**
 * One-time self-heal: balances created before accrual-only model may have been
 * seeded with maxDaysPerYear (EL=15, CL=12, SL=10) despite no usage. Reset to 0.
 * Also clears carriedForward that only exists from prior-year auto-seeds (no accrual).
 */
export async function reconcileAutoSeededBalance(bal, leaveType) {
  if (!bal || !leaveType || leaveType.isPaid === false) return bal;

  const max = leaveType.maxDaysPerYear ?? 0;
  const used = bal.used ?? 0;
  const pending = bal.pending ?? 0;
  const allocated = bal.allocated ?? 0;
  const carriedForward = bal.carriedForward ?? 0;

  if (used > 0 || pending > 0) return bal;

  let nextAllocated = allocated;
  let nextCarried = carriedForward;

  // Legacy upfront annual grant (pre-accrual model) — never strip earned monthly EL accrual.
  if (max > 0 && allocated === max && leaveType.code !== ACCRUAL_LEAVE_CODE) {
    nextAllocated = 0;
  }

  // Legacy carry-forward from a prior year that only had auto-seeded allocation.
  if (
    leaveType.code === ACCRUAL_LEAVE_CODE &&
    nextAllocated === 0 &&
    carriedForward > 0 &&
    carriedForward <= max
  ) {
    nextCarried = 0;
  }

  if (nextAllocated === allocated && nextCarried === carriedForward) return bal;

  const updated = await leaveBalancesTable.findOneAndUpdate(
    { id: bal.id, version: bal.version },
    {
      $set: { allocated: nextAllocated, carriedForward: nextCarried },
      $inc: { version: 1 },
    },
    { new: true },
  );
  return updated ?? bal;
}

/** Reconcile all balance rows for a user/year (run on every balance read). */
export async function reconcileUserLeaveBalances(userId, year) {
  const y = year ?? new Date().getFullYear();
  const types = await leaveTypesTable.find({ status: "active" }).lean();
  let changed = false;
  for (const type of types) {
    const bal = await leaveBalancesTable.findOne({ userId, leaveTypeId: type.id, year: y });
    if (!bal) continue;
    const fixed = await reconcileAutoSeededBalance(bal, type);
    if (fixed && (fixed.allocated !== bal.allocated || fixed.carriedForward !== bal.carriedForward)) {
      changed = true;
    }
  }
  if (changed) {
    await syncUserLeaveAvailable(userId, y);
  }
  return changed;
}

/**
 * Set EL `allocated` to months earned in the active cycle × days/month (join-aware).
 * Used for over-accrual heal and instant recalculation when paid-leave quota changes.
 * Never reduces below used + pending.
 */
export async function reconcileCycleAccrualBalance(userId, options = {}) {
  const {
    periodKey,
    startMonth = 1,
    cycleMonths = LEAVE_RESET_CYCLE_MONTHS,
    daysPerMonth = 1,
    leaveYear,
    accrualType,
    joiningDate = null,
    tz = null,
  } = options;
  if (!accrualType || !periodKey || leaveYear == null) return { skipped: "missing_context" };

  const joinPeriod = joiningDate
    ? accrualPeriodKeyFromJoiningDate(joiningDate, tz)
    : null;
  const expected = expectedAccruedDaysInCycle({
    throughPeriod: periodKey,
    startMonth,
    cycleMonths,
    joinPeriod,
    daysPerMonth,
  });

  // Authoritative cycle math — always write by id so quota up/down never sticks on a stale version.
  let bal = await leaveBalancesTable
    .findOne({ userId, leaveTypeId: accrualType.id, year: leaveYear })
    .lean();
  if (!bal) {
    const created = await ensureBalanceRow(userId, accrualType.id, leaveYear, null);
    bal = typeof created.toObject === "function" ? created.toObject() : created;
  }

  const allocated = bal.allocated ?? 0;
  const carriedForward = bal.carriedForward ?? 0;
  const used = bal.used ?? 0;
  const pending = bal.pending ?? 0;
  const floor = Math.round((used + pending) * 100) / 100;
  // Instant cycle math: earned = eligible months × quota (works for both increases and decreases).
  const nextAllocated = Math.max(floor, expected);
  const nextCarried = 0;

  if (nextAllocated === allocated && nextCarried === carriedForward) {
    return { skipped: "in_range", allocated, expected, daysPerMonth };
  }

  await leaveBalancesTable.updateOne(
    { id: bal.id },
    { $set: { allocated: nextAllocated, carriedForward: nextCarried }, $inc: { version: 1 } },
  );

  return {
    adjusted: true,
    from: allocated,
    to: nextAllocated,
    expected,
    daysPerMonth,
    clearedCarry: carriedForward,
  };
}

/**
 * Recalculate this employee's paid-leave balance for the current cycle from their
 * (or company) days/month quota. Call when leaveAccrualDaysPerMonth changes.
 * Pass `daysPerMonthOverride` from the just-saved patch so we never re-read a stale quota.
 */
export async function recomputeUserLeaveAccrualForCurrentCycle(userId, options = {}) {
  const { now = new Date(), daysPerMonthOverride } = options;
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const periodKey = currentAccrualPeriodKey(now, tz);
  const startMonth = settings.hrmLeaveYearStartMonth ?? 1;
  const cycleMonths = resolveLeaveResetCycleMonths(settings);
  const { year, month } = parsePeriodKey(periodKey);
  const leaveYear = getLeaveYearForDate(year, month, startMonth);

  const user = await usersTable.findOne({ id: userId }).lean();
  if (!user || user.status !== "active") return { skipped: "inactive", periodKey };
  if (!hrmEmployeeRoles.includes(user.role)) return { skipped: "not_hrm_employee", periodKey };

  const accrualType = await findAccrualLeaveType();
  if (!accrualType) return { skipped: "no_accrual_leave_type", periodKey };

  let daysPerMonth;
  if (daysPerMonthOverride !== undefined) {
    // Explicit patch value (including null → inherit company default).
    daysPerMonth =
      daysPerMonthOverride == null || daysPerMonthOverride === ""
        ? resolveAccrualDaysPerMonth({ leaveAccrualDaysPerMonth: null, leave: null }, settings)
        : Math.max(0, Number(daysPerMonthOverride) || 0);
  } else {
    daysPerMonth = resolveAccrualDaysPerMonth(user, settings);
  }

  const result = await reconcileCycleAccrualBalance(userId, {
    periodKey,
    startMonth,
    cycleMonths,
    daysPerMonth,
    leaveYear,
    accrualType,
    joiningDate: user.joiningDate,
    tz,
  });

  const alreadyMarked = user.lastLeaveAccrualPeriod === periodKey;
  if (result.adjusted || !alreadyMarked) {
    await usersTable.updateOne({ id: userId }, { $set: { lastLeaveAccrualPeriod: periodKey } });
  }
  if (result.adjusted) {
    await syncUserLeaveAvailable(userId, leaveYear);
  } else if (!alreadyMarked) {
    await syncUserLeaveAvailable(userId, leaveYear);
  }

  return { periodKey, leaveYear, daysPerMonth, ...result };
}

/** Mirror Satyakabir leaveAvailable / leaveBalance on the user profile (EL accrual pool only). */
export async function syncUserLeaveAvailable(userId, year) {
  const y = year ?? new Date().getFullYear();
  const accrualType = await findAccrualLeaveType();
  if (!accrualType) {
    await usersTable.updateOne({ id: userId }, { $set: { leaveAvailable: 0, leaveBalance: 0 } });
    return 0;
  }
  const bal = await leaveBalancesTable
    .findOne({ userId, leaveTypeId: accrualType.id, year: y })
    .lean();
  const total = bal ? computeAvailableBalance(bal) : 0;
  const rounded = Math.round(total * 10) / 10;
  await usersTable.updateOne(
    { id: userId },
    { $set: { leaveAvailable: rounded, leaveBalance: rounded } },
  );
  return rounded;
}

async function ensureBalanceRow(userId, leaveTypeId, leaveYear, session) {
  let query = leaveBalancesTable.findOne({ userId, leaveTypeId, year: leaveYear });
  if (session) query = query.session(session);
  let bal = await query;
  if (bal) {
    const type = await leaveTypesTable.findOne({ id: leaveTypeId }).lean();
    if (type) {
      bal = await reconcileAutoSeededBalance(bal, type);
    }
    return bal;
  }

  const id = await getNextSequence("leave_balances");
  const doc = {
    id,
    userId,
    leaveTypeId,
    year: leaveYear,
    allocated: 0,
    used: 0,
    pending: 0,
    carriedForward: 0,
    version: 0,
  };
  if (session) {
    const created = await leaveBalancesTable.create([doc], { session });
    return created[0];
  }
  return leaveBalancesTable.create(doc);
}

// ---------------------------------------------------------------------------
// Carry-forward (runs once per leave-year, deduped per target year)
// ---------------------------------------------------------------------------

export async function runLeaveCarryForward(targetLeaveYear) {
  const periodKey = String(targetLeaveYear);
  const outcome = await withJobLock("hrm_carry_forward", periodKey, async () => {
    const settings = await getOrCreateSettings();
    const cfStartYear = settings.hrmLeaveCarryForwardStartYear ?? 2026;
    if (targetLeaveYear < cfStartYear) {
      return { skipped: "before_carry_forward_start_year", targetLeaveYear };
    }

    const priorYear = targetLeaveYear - 1;
    const types = await leaveTypesTable.find({ status: "active" }).lean();
    const cfTypes = types.filter((t) => t.carryForwardAllowed);
    if (!cfTypes.length) return { carried: 0, employees: 0 };

    const staff = await usersTable
      .find({ role: { $in: hrmEmployeeRoles }, status: "active" })
      .lean();

    let carriedTotal = 0;
    let employeeCount = 0;

    await runInTx(async (session) => {
      const sessOpts = session ? { session } : {};
      for (const user of staff) {
        let userCarried = 0;
        for (const type of cfTypes) {
          // Earned-leave accrual pool uses monthly carry within a 3-month cycle, not yearly carry.
          if (type.code === ACCRUAL_LEAVE_CODE) continue;
          const prior = await leaveBalancesTable
            .findOne({ userId: user.id, leaveTypeId: type.id, year: priorYear })
            .session(session ?? null)
            .lean();
          const amount = computeCarryForwardAmount(prior, type);
          if (amount <= 0) continue;

          const current = await ensureBalanceRow(user.id, type.id, targetLeaveYear, session);
          const updated = await leaveBalancesTable.updateOne(
            { id: current.id, version: current.version },
            { $inc: { carriedForward: amount, version: 1 } },
            sessOpts,
          );
          if (updated.modifiedCount !== 1) {
            throw new Error(`Carry-forward conflict for user ${user.id} type ${type.id}`);
          }
          userCarried += amount;
        }
        if (userCarried > 0) {
          employeeCount += 1;
          carriedTotal += userCarried;
        }
      }
    });

    await logHrmAudit({
      actorId: null,
      action: "leave_carry_forward",
      entityType: "leave_balance",
      entityId: null,
      severity: "info",
      metadata: { targetLeaveYear, priorYear, carriedTotal, employeeCount },
    });

    return { targetLeaveYear, priorYear, carriedTotal, employeeCount };
  });

  return outcome;
}

// ---------------------------------------------------------------------------
// Leave cycle reset — forfeit unused EL accrual pool every N months (default 3)
// ---------------------------------------------------------------------------

async function resetUserAccrualLeaveBalance(userId, leaveYear, accrualType, session) {
  const bal = await leaveBalancesTable
    .findOne({ userId, leaveTypeId: accrualType.id, year: leaveYear })
    .session(session ?? null);
  if (!bal) return 0;

  const available = computeAvailableBalance(bal);
  const hasCounters =
    (bal.allocated ?? 0) > 0 ||
    (bal.carriedForward ?? 0) > 0 ||
    (bal.used ?? 0) > 0 ||
    (bal.pending ?? 0) > 0;
  if (!hasCounters) return 0;

  const sessOpts = session ? { session } : {};
  const updated = await leaveBalancesTable.updateOne(
    { id: bal.id, version: bal.version },
    {
      $set: { allocated: 0, carriedForward: 0, used: 0, pending: 0 },
      $inc: { version: 1 },
    },
    sessOpts,
  );
  if (updated.modifiedCount !== 1) {
    throw new Error(`Leave cycle reset conflict for user ${userId}`);
  }
  return available;
}

/**
 * Move unused EL sitting on older leave-year rows into the current leave year.
 * Fixes month-forward gaps when leave-year start month changed (e.g. June credit
 * stored under 2025 while the current Jun–Aug cycle expects it on 2026).
 * Only runs during the first cycle of the leave year.
 */
export async function reclaimStrandedPriorYearAccrual(userId, options = {}) {
  const { now = new Date() } = options;
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const { year, month } = localDateParts(now, tz);
  const startMonth = settings.hrmLeaveYearStartMonth ?? 1;
  const cycleMonths = resolveLeaveResetCycleMonths(settings);

  if (!isInFirstLeaveCycle(month, startMonth, cycleMonths)) {
    return { skipped: "not_first_cycle" };
  }

  const leaveYear = getLeaveYearForDate(year, month, startMonth);
  const accrualType = await findAccrualLeaveType();
  if (!accrualType) return { skipped: "no_accrual_leave_type" };

  const olderRows = await leaveBalancesTable
    .find({ userId, leaveTypeId: accrualType.id, year: { $lt: leaveYear } })
    .lean();
  if (!olderRows.length) return { skipped: "nothing_to_reclaim", leaveYear };

  let reclaimedTotal = 0;
  for (const prior of olderRows) {
    const stranded = computeAvailableBalance(prior);
    if (stranded <= 0) continue;

    const touchDate = prior.updatedAt
      ? new Date(prior.updatedAt)
      : prior.createdAt
        ? new Date(prior.createdAt)
        : null;
    const touchParts = touchDate ? localDateParts(touchDate, tz) : null;
    if (
      !shouldReclaimStrandedAccrualTouch({
        calendarMonth: month,
        startMonth,
        cycleMonths,
        currentLeaveYear: leaveYear,
        touchYear: touchParts?.year,
        touchMonth: touchParts?.month,
      })
    ) {
      continue;
    }

    await runInTx(async (session) => {
      const sessOpts = session ? { session } : {};
      const priorRow = await leaveBalancesTable
        .findOne({ id: prior.id })
        .session(session ?? null);
      if (!priorRow) return;
      const amount = computeAvailableBalance(priorRow);
      if (amount <= 0) return;

      const cleared = await leaveBalancesTable.updateOne(
        { id: priorRow.id, version: priorRow.version },
        {
          $set: { allocated: 0, carriedForward: 0, used: 0, pending: 0 },
          $inc: { version: 1 },
        },
        sessOpts,
      );
      if (cleared.modifiedCount !== 1) {
        throw new Error(`Stranded leave reclaim conflict (prior) for user ${userId}`);
      }

      const current = await ensureBalanceRow(userId, accrualType.id, leaveYear, session);
      const moved = await leaveBalancesTable.updateOne(
        { id: current.id, version: current.version },
        { $inc: { allocated: amount, version: 1 } },
        sessOpts,
      );
      if (moved.modifiedCount !== 1) {
        throw new Error(`Stranded leave reclaim conflict (current) for user ${userId}`);
      }
      reclaimedTotal += amount;
    });
  }

  if (reclaimedTotal <= 0) {
    return { skipped: "nothing_to_reclaim", leaveYear };
  }

  await syncUserLeaveAvailable(userId, leaveYear);
  return { reclaimed: reclaimedTotal, leaveYear, leaveTypeId: accrualType.id };
}

/**
 * Clear leave quota fields that merely mirror the company default so every
 * employee without a true personal override inherits HRM settings changes.
 * True overrides (e.g. 2 or 4 days/month) are preserved on leaveAccrualDaysPerMonth.
 */
export async function syncStaffLeaveQuotasToCompanyPolicy() {
  const settings = await getOrCreateSettings();
  const companyDefault = resolveAccrualDaysPerMonth({}, settings);
  const staff = await usersTable
    .find(
      { role: { $in: hrmEmployeeRoles }, status: "active" },
      { id: 1, leaveAccrualDaysPerMonth: 1, monthlyLeaveQuota: 1, leave: 1 },
    )
    .lean();

  let cleared = 0;
  let preservedOverrides = 0;

  for (const user of staff) {
    const explicit = user.leaveAccrualDaysPerMonth;
    const nested = user.leave?.monthlyQuota;
    const legacy = user.monthlyLeaveQuota;

    // Personal override different from company default — keep it.
    if (explicit != null && Number.isFinite(Number(explicit)) && Number(explicit) !== companyDefault) {
      preservedOverrides += 1;
      continue;
    }
    // Legacy nested-only override — promote to leaveAccrualDaysPerMonth so it stays explicit.
    if (
      (explicit == null || !Number.isFinite(Number(explicit))) &&
      nested != null &&
      Number.isFinite(Number(nested)) &&
      Number(nested) !== companyDefault
    ) {
      await usersTable.updateOne(
        { id: user.id },
        {
          $set: {
            leaveAccrualDaysPerMonth: Number(nested),
            monthlyLeaveQuota: Number(nested),
            leave: { ...(user.leave && typeof user.leave === "object" ? user.leave : {}), monthlyQuota: Number(nested) },
          },
        },
      );
      preservedOverrides += 1;
      continue;
    }

    const storesDefault =
      (explicit != null && Number(explicit) === companyDefault) ||
      (nested != null && Number(nested) === companyDefault) ||
      (legacy != null && Number(legacy) === companyDefault);
    if (!storesDefault) continue;

    await usersTable.updateOne(
      { id: user.id },
      {
        $set: {
          leaveAccrualDaysPerMonth: null,
          monthlyLeaveQuota: null,
          leave: { ...(user.leave && typeof user.leave === "object" ? user.leave : {}), monthlyQuota: null },
        },
      },
    );
    cleared += 1;
  }

  return { companyDefault, cleared, preservedOverrides, staffCount: staff.length };
}

/**
 * After leave-calendar settings change (or on demand): fold stranded EL and
 * catch up accrual so month-forward balances match the active cycle for everyone.
 */
export async function healLeaveBalancesForAllStaff(options = {}) {
  const { now = new Date(), reason = "manual" } = options;
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const periodKey = currentAccrualPeriodKey(now, tz);

  const quotaSync = await syncStaffLeaveQuotasToCompanyPolicy();

  const staff = await usersTable
    .find({ role: { $in: hrmEmployeeRoles }, status: "active" }, { id: 1 })
    .lean();

  let reclaimedTotal = 0;
  let reclaimedEmployees = 0;
  let accrualEmployees = 0;

  for (const user of staff) {
    const reclaim = await reclaimStrandedPriorYearAccrual(user.id, { now });
    if (reclaim.reclaimed > 0) {
      reclaimedTotal += reclaim.reclaimed;
      reclaimedEmployees += 1;
    }
    const accrual = await ensureUserLeaveAccrualForPeriod(user.id, { periodKey, now });
    if (accrual.credited > 0) accrualEmployees += 1;
    // Recompute cycle earned from (possibly updated) days/month quota.
    await recomputeUserLeaveAccrualForCurrentCycle(user.id, { now });
  }

  await logHrmAudit({
    actorId: null,
    action: "leave_balance_heal",
    entityType: "leave_balance",
    entityId: null,
    severity: "info",
    metadata: {
      reason,
      periodKey,
      reclaimedTotal,
      reclaimedEmployees,
      accrualEmployees,
      staffCount: staff.length,
      quotaSync,
    },
  });

  logger.info(
    { reason, periodKey, reclaimedTotal, reclaimedEmployees, accrualEmployees, quotaSync },
    "Leave balance heal completed",
  );

  return {
    periodKey,
    reclaimedTotal,
    reclaimedEmployees,
    accrualEmployees,
    staffCount: staff.length,
    quotaSync,
  };
}

/**
 * Forfeit unused EL on a closed leave-year label (called when a new leave year starts).
 */
export async function forfeitPriorLeaveYearAccrual(priorLeaveYear) {
  const accrualType = await findAccrualLeaveType();
  if (!accrualType) return { skipped: "no_accrual_leave_type" };

  const staff = await usersTable
    .find({ role: { $in: hrmEmployeeRoles }, status: "active" }, { id: 1 })
    .lean();

  let forfeitTotal = 0;
  let employeeCount = 0;

  await runInTx(async (session) => {
    for (const user of staff) {
      const forfeited = await resetUserAccrualLeaveBalance(
        user.id,
        priorLeaveYear,
        accrualType,
        session,
      );
      if (forfeited > 0) {
        forfeitTotal += forfeited;
        employeeCount += 1;
      }
    }
  });

  await logHrmAudit({
    actorId: null,
    action: "leave_prior_year_forfeit",
    entityType: "leave_balance",
    entityId: null,
    severity: "info",
    metadata: { priorLeaveYear, forfeitTotal, employeeCount, leaveTypeCode: accrualType.code },
  });

  return { priorLeaveYear, forfeitTotal, employeeCount };
}

/**
 * Forfeit unused paid-leave balance and zero counters for the accrual leave type.
 * Runs on the first month of each leave cycle (every 3 months by default).
 */
export async function runLeaveCycleReset(periodKey, leaveYear) {
  const outcome = await withJobLock("hrm_leave_cycle_reset", periodKey, async () => {
    const accrualType = await findAccrualLeaveType();
    if (!accrualType) return { skipped: "no_accrual_leave_type", periodKey };

    const staff = await usersTable
      .find({ role: { $in: hrmEmployeeRoles }, status: "active" })
      .lean();

    let forfeitTotal = 0;
    let employeeCount = 0;

    await runInTx(async (session) => {
      for (const user of staff) {
        const forfeited = await resetUserAccrualLeaveBalance(
          user.id,
          leaveYear,
          accrualType,
          session,
        );
        if (forfeited > 0) {
          forfeitTotal += forfeited;
          employeeCount += 1;
        }
      }
    });

    for (const user of staff) {
      await syncUserLeaveAvailable(user.id, leaveYear);
    }

    await logHrmAudit({
      actorId: null,
      action: "leave_cycle_reset",
      entityType: "leave_balance",
      entityId: null,
      severity: "info",
      metadata: { periodKey, leaveYear, forfeitTotal, employeeCount, leaveTypeCode: accrualType.code },
    });

    return { periodKey, leaveYear, forfeitTotal, employeeCount, leaveTypeId: accrualType.id };
  });

  return outcome;
}

// ---------------------------------------------------------------------------
// Monthly accrual (deduped per YYYY-MM per user)
// ---------------------------------------------------------------------------

/**
 * Credit this employee's monthly paid-leave accrual for `periodKey` if not already done.
 * Catches up every missed month since `lastLeaveAccrualPeriod` so unused days
 * accumulate within each cycle before the quarterly reset month.
 */
export async function ensureUserLeaveAccrualForPeriod(userId, options = {}) {
  const { periodKey: explicitPeriod, force = false, now = new Date() } = options;
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const periodKey = explicitPeriod ?? currentAccrualPeriodKey(now, tz);
  const startMonth = settings.hrmLeaveYearStartMonth ?? 1;
  const cycleMonths = resolveLeaveResetCycleMonths(settings);

  let user = await usersTable.findOne({ id: userId }).lean();
  if (!user || user.status !== "active") return { skipped: "inactive", periodKey };
  if (!hrmEmployeeRoles.includes(user.role)) return { skipped: "not_hrm_employee", periodKey };

  const days = resolveAccrualDaysPerMonth(user, settings);
  const accrualType = await findAccrualLeaveType();
  if (!accrualType) return { skipped: "no_accrual_leave_type", periodKey };

  const { year, month } = parsePeriodKey(periodKey);
  const leaveYear = getLeaveYearForDate(year, month, startMonth);

  // Fold prior-year stranded EL into the current leave year during the first cycle
  // so June unused days appear in Jul/Aug when leave-year start is June.
  await reclaimStrandedPriorYearAccrual(userId, { now });

  if (days <= 0) {
    if (isLeaveCycleResetMonth(month, startMonth, cycleMonths)) {
      await runInTx(async (session) => {
        await resetUserAccrualLeaveBalance(userId, leaveYear, accrualType, session);
      });
      await syncUserLeaveAvailable(userId, leaveYear);
    }
    return { skipped: "zero_quota", periodKey };
  }

  if (!force && user.lastLeaveAccrualPeriod === periodKey) {
    const healed = await reconcileCycleAccrualBalance(userId, {
      periodKey,
      startMonth,
      cycleMonths,
      daysPerMonth: days,
      leaveYear,
      accrualType,
      joiningDate: user.joiningDate,
      tz,
    });
    if (healed?.adjusted) {
      await syncUserLeaveAvailable(userId, leaveYear);
    }
    return { skipped: "already_credited", periodKey, ...healed };
  }

  if (!force && !user.lastLeaveAccrualPeriod) {
    const existing = await leaveBalancesTable
      .findOne({ userId, leaveTypeId: accrualType.id, year: leaveYear })
      .lean();
    const hasEarnedBalance =
      existing &&
      ((existing.allocated ?? 0) > 0 || (existing.used ?? 0) > 0 || (existing.pending ?? 0) > 0);
    if (hasEarnedBalance) {
      await usersTable.updateOne({ id: userId }, { $set: { lastLeaveAccrualPeriod: periodKey } });
      await reconcileCycleAccrualBalance(userId, {
        periodKey,
        startMonth,
        cycleMonths,
        daysPerMonth: days,
        leaveYear,
        accrualType,
        joiningDate: user.joiningDate,
        tz,
      });
      await syncUserLeaveAvailable(userId, leaveYear);
      return { skipped: "legacy_balance_synced", periodKey };
    }
  }

  const joinPeriod = user.joiningDate
    ? accrualPeriodKeyFromJoiningDate(user.joiningDate, tz)
    : null;

  const periodsToCredit = force
    ? [periodKey]
    : listAccrualPeriodsAfter(user.lastLeaveAccrualPeriod, periodKey, {
        notBeforePeriod: joinPeriod,
      });
  if (!periodsToCredit.length) {
    await usersTable.updateOne({ id: userId }, { $set: { lastLeaveAccrualPeriod: periodKey } });
    await reconcileCycleAccrualBalance(userId, {
      periodKey,
      startMonth,
      cycleMonths,
      daysPerMonth: days,
      leaveYear,
      accrualType,
      joiningDate: user.joiningDate,
      tz,
    });
    return { skipped: "already_credited", periodKey };
  }

  let creditedTotal = 0;
  let lastCreditedPeriod = user.lastLeaveAccrualPeriod;

  await runInTx(async (session) => {
    const sessOpts = session ? { session } : {};
    for (const creditPeriod of periodsToCredit) {
      const { year, month } = parsePeriodKey(creditPeriod);
      const creditLeaveYear = getLeaveYearForDate(year, month, startMonth);

      // Always forfeit prior-cycle balance when crossing a reset month during catch-up.
      if (isLeaveCycleResetMonth(month, startMonth, cycleMonths)) {
        await resetUserAccrualLeaveBalance(userId, creditLeaveYear, accrualType, session);
      }

      const bal = await ensureBalanceRow(userId, accrualType.id, creditLeaveYear, session);
      const updated = await leaveBalancesTable.updateOne(
        { id: bal.id, version: bal.version },
        { $inc: { allocated: days, version: 1 } },
        sessOpts,
      );
      if (updated.modifiedCount !== 1) {
        throw new Error(`Accrual conflict for user ${userId} period ${creditPeriod}`);
      }
      creditedTotal += days;
      lastCreditedPeriod = creditPeriod;
    }

    await usersTable.updateOne(
      { id: userId },
      { $set: { lastLeaveAccrualPeriod: lastCreditedPeriod } },
      sessOpts,
    );
  });

  await reconcileCycleAccrualBalance(userId, {
    periodKey,
    startMonth,
    cycleMonths,
    daysPerMonth: days,
    leaveYear,
    accrualType,
    joiningDate: user.joiningDate,
    tz,
  });
  await syncUserLeaveAvailable(userId, leaveYear);

  return {
    credited: creditedTotal,
    periodKey: lastCreditedPeriod,
    leaveYear,
    leaveTypeId: accrualType.id,
    periodsCredited: periodsToCredit.length,
  };
}

export async function runMonthlyLeaveAccrual(periodKey) {
  const outcome = await withJobLock("hrm_accrual", periodKey, async () => {
    const { year, month } = parsePeriodKey(periodKey);
    const settings = await getOrCreateSettings();
    const startMonth = settings.hrmLeaveYearStartMonth ?? 1;
    const leaveYear = getLeaveYearForDate(year, month, startMonth);

    const accrualType = await findAccrualLeaveType();
    if (!accrualType) {
      return { skipped: "no_accrual_leave_type", periodKey };
    }

    const staff = await usersTable
      .find({ role: { $in: hrmEmployeeRoles }, status: "active" })
      .lean();

    let creditedTotal = 0;
    let employeeCount = 0;

    for (const user of staff) {
      const result = await ensureUserLeaveAccrualForPeriod(user.id, { periodKey });
      if (result.credited) {
        creditedTotal += result.credited;
        employeeCount += 1;
      }
    }

    await logHrmAudit({
      actorId: null,
      action: "leave_accrual",
      entityType: "leave_balance",
      entityId: null,
      severity: "info",
      metadata: { periodKey, leaveYear, creditedTotal, employeeCount, leaveTypeCode: accrualType.code },
    });

    return { periodKey, leaveYear, creditedTotal, employeeCount, leaveTypeId: accrualType.id };
  });

  return outcome;
}

// ---------------------------------------------------------------------------
// Scheduled job — 1st of each month at 02:00 in compliance timezone
// ---------------------------------------------------------------------------

let lastAccrualRunKey = null;
let accrualTickInFlight = false;

export async function runLeaveAccrualTick(now = new Date()) {
  if (!isDatabaseConnected()) {
    return { skipped: "database_unavailable" };
  }

  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const { year, month, day } = localDateParts(now, tz);
  const hour = localHour(now, tz);

  if (day !== 1 || hour !== LEAVE_ACCRUAL_RUN_HOUR) {
    return { skipped: "outside_schedule", day, hour, timezone: tz };
  }

  const periodKey = `${year}-${String(month).padStart(2, "0")}`;
  const runKey = `${periodKey}:${LEAVE_ACCRUAL_RUN_HOUR}`;
  if (lastAccrualRunKey === runKey) {
    return { skipped: "already_ran_in_process", runKey };
  }
  lastAccrualRunKey = runKey;

  const startMonth = settings.hrmLeaveYearStartMonth ?? 1;
  const cycleMonths = resolveLeaveResetCycleMonths(settings);
  let carryOutcome = null;

  // Year-end: forfeit unused EL on the closed leave-year label, then carry CL/SL.
  if (month === startMonth) {
    const targetLeaveYear = getLeaveYearForDate(year, month, startMonth);
    await forfeitPriorLeaveYearAccrual(targetLeaveYear - 1);
    carryOutcome = await runLeaveCarryForward(targetLeaveYear);
  }

  // Quarterly reset for all staff (including zero-quota) before monthly accrual credits.
  if (isLeaveCycleResetMonth(month, startMonth, cycleMonths)) {
    const leaveYear = getLeaveYearForDate(year, month, startMonth);
    await runLeaveCycleReset(periodKey, leaveYear);
  }

  const accrualOutcome = await runMonthlyLeaveAccrual(periodKey);

  const summary = { periodKey, timezone: tz, carryOutcome, accrualOutcome };
  logger.info(summary, "Leave accrual tick completed");
  return summary;
}

/** Reset in-process dedup guard (tests only). */
export function _resetAccrualTickStateForTests() {
  lastAccrualRunKey = null;
  accrualTickInFlight = false;
}

/**
 * Backfill accrual for the current month for all active employees.
 * Safe to call on startup — each employee's accrual is idempotent (deduped by
 * lastLeaveAccrualPeriod + withJobLock). Only credits periods that were missed.
 */
export async function backfillCurrentMonthAccrual() {
  try {
    const settings = await getOrCreateSettings();
    const tz = resolveWorkDayTimezone(settings.complianceTimezone);
    const periodKey = currentAccrualPeriodKey(new Date(), tz);
    const accrualType = await findAccrualLeaveType();
    if (!accrualType) return;

    // Heal first so any leave-year start change while the API was down is corrected
    // before monthly catch-up credits.
    await healLeaveBalancesForAllStaff({ reason: "startup_backfill" });
    logger.info({ periodKey }, "Leave accrual startup backfill complete");
  } catch (err) {
    logger.error({ err }, "Leave accrual startup backfill failed");
  }
}

export function startLeaveAccrualJob() {
  const tick = async () => {
    if (accrualTickInFlight) return;
    accrualTickInFlight = true;
    try {
      await runLeaveAccrualTick();
    } catch (err) {
      logger.error({ err }, "Leave accrual job tick failed");
      lastAccrualRunKey = null;
    } finally {
      accrualTickInFlight = false;
    }
  };

  void getOrCreateSettings().then(async (settings) => {
    const tz = resolveWorkDayTimezone(settings.complianceTimezone);
    logger.info(
      {
        runHour: LEAVE_ACCRUAL_RUN_HOUR,
        timezone: tz,
        leaveYearStartMonth: settings.hrmLeaveYearStartMonth ?? 1,
        leaveResetCycleMonths: resolveLeaveResetCycleMonths(settings),
        paidLeavesPerMonth: settings.hrmPaidLeavesPerMonth ?? 1,
      },
      "Leave accrual job scheduled (1st of month; unused EL carries within each cycle, resets every 3 months)",
    );
    // Backfill any missed accrual for the current month on startup.
    await backfillCurrentMonthAccrual();
  });

  setInterval(() => {
    void tick();
  }, JOB_TICK_MS);

  return tick;
}
