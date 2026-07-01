import {
  leaveTypesTable,
  leaveBalancesTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { getOrCreateSettings } from "../company-settings.js";
import { resolveWorkDayTimezone } from "../work-session-policy.js";
import { withJobLock } from "../jobs/withJobLock.js";
import { runInTx } from "../../lib/db-tx.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { logger } from "../../lib/logger.js";
import { isDatabaseConnected } from "../../lib/db.js";

/** Local hour (0–23) when the monthly accrual / carry-forward job fires. */
export const LEAVE_ACCRUAL_RUN_HOUR = 2;

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

/** Days to credit this employee for the monthly accrual run (Satyakabir: leave.monthlyQuota). */
export function resolveAccrualDaysPerMonth(user, settings) {
  const nested = user?.leave?.monthlyQuota;
  if (nested != null && Number.isFinite(Number(nested))) {
    return Math.max(0, Number(nested));
  }
  const legacy = user?.monthlyLeaveQuota;
  if (legacy != null && Number.isFinite(Number(legacy))) {
    return Math.max(0, Number(legacy));
  }
  const perUser = user?.leaveAccrualDaysPerMonth;
  if (perUser != null && Number.isFinite(Number(perUser))) {
    return Math.max(0, Number(perUser));
  }
  const global = settings?.hrmPaidLeavesPerMonth;
  if (global != null && Number.isFinite(Number(global))) {
    return Math.max(0, Number(global));
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

/** Calendar month key (YYYY-MM) in the company work-day timezone. */
export function currentAccrualPeriodKey(now = new Date(), tz) {
  const { year, month } = localDateParts(now, tz);
  return `${year}-${String(month).padStart(2, "0")}`;
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

  // Legacy upfront annual grant (pre-accrual model).
  if (max > 0 && allocated === max) {
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
// Monthly accrual (deduped per YYYY-MM per user)
// ---------------------------------------------------------------------------

/**
 * Credit this employee's monthly paid-leave accrual for `periodKey` if not already done.
 * Safe to call on balance reads and after admin saves leave quota.
 */
export async function ensureUserLeaveAccrualForPeriod(userId, options = {}) {
  const { periodKey: explicitPeriod, force = false, now = new Date() } = options;
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const periodKey = explicitPeriod ?? currentAccrualPeriodKey(now, tz);
  const { year, month } = parsePeriodKey(periodKey);
  const startMonth = settings.hrmLeaveYearStartMonth ?? 1;
  const leaveYear = getLeaveYearForDate(year, month, startMonth);

  const user = await usersTable.findOne({ id: userId }).lean();
  if (!user || user.status !== "active") return { skipped: "inactive", periodKey };
  if (!hrmEmployeeRoles.includes(user.role)) return { skipped: "not_hrm_employee", periodKey };

  const days = resolveAccrualDaysPerMonth(user, settings);
  if (days <= 0) return { skipped: "zero_quota", periodKey };

  if (!force && user.lastLeaveAccrualPeriod === periodKey) {
    return { skipped: "already_credited", periodKey, leaveYear };
  }

  const accrualType = await findAccrualLeaveType();
  if (!accrualType) return { skipped: "no_accrual_leave_type", periodKey };

  if (!force && !user.lastLeaveAccrualPeriod) {
    const existing = await leaveBalancesTable
      .findOne({ userId, leaveTypeId: accrualType.id, year: leaveYear })
      .lean();
    if (existing && (existing.allocated ?? 0) > 0) {
      await usersTable.updateOne({ id: userId }, { $set: { lastLeaveAccrualPeriod: periodKey } });
      await syncUserLeaveAvailable(userId, leaveYear);
      return { skipped: "legacy_balance_assumed", periodKey, leaveYear };
    }
  }

  await runInTx(async (session) => {
    const sessOpts = session ? { session } : {};
    const bal = await ensureBalanceRow(user.id, accrualType.id, leaveYear, session);
    const updated = await leaveBalancesTable.updateOne(
      { id: bal.id, version: bal.version },
      { $inc: { allocated: days, version: 1 } },
      sessOpts,
    );
    if (updated.modifiedCount !== 1) {
      throw new Error(`Accrual conflict for user ${user.id}`);
    }
    await usersTable.updateOne(
      { id: user.id },
      { $set: { lastLeaveAccrualPeriod: periodKey } },
      sessOpts,
    );
  });

  await syncUserLeaveAvailable(userId, leaveYear);

  return { credited: days, periodKey, leaveYear, leaveTypeId: accrualType.id };
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
  let carryOutcome = null;

  if (month === startMonth) {
    const targetLeaveYear = getLeaveYearForDate(year, month, startMonth);
    carryOutcome = await runLeaveCarryForward(targetLeaveYear);
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

    const staff = await usersTable
      .find({ role: { $in: hrmEmployeeRoles }, status: "active" }, { id: 1 })
      .lean();

    for (const user of staff) {
      await ensureUserLeaveAccrualForPeriod(user.id, { periodKey });
    }
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
        paidLeavesPerMonth: settings.hrmPaidLeavesPerMonth ?? 1,
      },
      "Leave accrual / carry-forward job scheduled (1st of month)",
    );
    // Backfill any missed accrual for the current month on startup.
    await backfillCurrentMonthAccrual();
  });

  setInterval(() => {
    void tick();
  }, JOB_TICK_MS);

  return tick;
}
