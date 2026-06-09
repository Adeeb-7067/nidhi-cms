import {
  dailyLogsTable,
  usersTable,
  notificationsTable,
  getNextSequence
} from "../models/schema/index.js";
import { notifyUser } from "../lib/realtime.js";
import { sendDailyLogComplianceEmail } from "../lib/email.js";
import { logger } from "../lib/logger.js";
import { isDatabaseConnected } from "../lib/db.js";
import { getWorkPolicy, normalizeReminderHour } from "./company-settings.js";

const STAFF_LOG_ROLES = ["developer", "tester", "qa"];
const HOUR_TOLERANCE = 0.05;

function resolveTimezone(settingsTz) {
  return settingsTz?.trim() || process.env.COMPLIANCE_TIMEZONE?.trim() || null;
}

function localDateString(date = new Date(), tz = null) {
  if (tz) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
  }
  return date.toISOString().slice(0, 10);
}

function localWeekday(date = new Date(), tz = null) {
  if (tz) {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  }
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()];
}

function localHour(date = new Date(), tz = null) {
  if (tz) {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
      hourCycle: "h23"
    }).format(date);
    const parsed = Number.parseInt(hour, 10);
    return parsed === 24 ? 0 : parsed;
  }
  return date.getUTCHours();
}

function addDaysToDateString(dateStr, deltaDays) {
  const [y, m, d] = String(dateStr).split("-").map((n) => Number.parseInt(n, 10));
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return utc.toISOString().slice(0, 10);
}

/** Weekday label (Mon–Sun) for a YYYY-MM-DD date in the compliance timezone. */
function weekdayForDateString(dateStr, tz = null) {
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  if (tz) {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(anchor);
  }
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][anchor.getUTCDay()];
}

/**
 * Which log date to evaluate when the reminder fires.
 * - Morning reminder (before noon): previous calendar day.
 * - Evening reminder (noon+): the workday ending at the configured hour.
 *   After midnight and before that hour, still evaluate yesterday so a restart
 *   does not flag the new day with 0 hours logged.
 */
export function resolveComplianceTargetDate(now, tz, checkHour) {
  const today = localDateString(now, tz);
  const hour = localHour(now, tz);

  if (checkHour < 12) {
    return addDaysToDateString(today, -1);
  }

  if (hour < checkHour) {
    return addDaysToDateString(today, -1);
  }

  return today;
}

function resolveCheckHourFromEnv() {
  const raw = process.env.COMPLIANCE_CHECK_HOUR?.trim();
  if (!raw) return null;
  const hour = Number.parseInt(raw, 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    logger.warn({ raw }, "Invalid COMPLIANCE_CHECK_HOUR; using company settings");
    return null;
  }
  return hour;
}

async function getComplianceSchedule() {
  const policy = await getWorkPolicy();
  const hour = resolveCheckHourFromEnv() ?? policy.dailyLogReminderHour;
  const tz = resolveTimezone(policy.complianceTimezone);
  return { hour: normalizeReminderHour(hour), tz };
}

function dateKeyFromIso(dateStr) {
  return Number.parseInt(String(dateStr).replace(/-/g, ""), 10);
}

export async function sumLoggedHoursForDate(userId, logDate) {
  const rows = await dailyLogsTable
    .find({ developerId: userId, logDate }, { hoursSpent: 1 })
    .lean();
  const total = rows.reduce((sum, row) => sum + Number(row.hoursSpent ?? 0), 0);
  return Math.round(total * 100) / 100;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function isWeekendDate(dateStr, tz = null) {
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  if (tz) {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short"
    }).format(anchor);
    return weekday === "Sat" || weekday === "Sun";
  }
  const day = anchor.getUTCDay();
  return day === 0 || day === 6;
}

export async function buildComplianceCalendar(developerId, month, year) {
  const policy = await getWorkPolicy();
  const user = await usersTable.findOne({ id: developerId }).lean();
  const m = Number(month);
  const y = Number(year);
  const lastDay = daysInMonth(y, m);
  const tz = resolveTimezone(policy.complianceTimezone);
  const today = localDateString(new Date(), tz);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const logs = await dailyLogsTable
    .find({ developerId, logDate: { $gte: start, $lte: end } }, { logDate: 1, hoursSpent: 1 })
    .lean();

  const hoursByDate = {};
  for (const log of logs) {
    const key = log.logDate;
    hoursByDate[key] = (hoursByDate[key] || 0) + Number(log.hoursSpent ?? 0);
  }

  const days = [];
  let completeDays = 0;
  let incompleteDays = 0;
  let trackedWeekdays = 0;

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const loggedHours = Math.round((hoursByDate[dateStr] || 0) * 100) / 100;
    const weekend = isWeekendDate(dateStr, tz);
    const future = dateStr > today;
    const required =
      policy.dailyLogComplianceEnabled && !weekend ? policy.requiredDailyWorkHours : null;

    let status;
    if (future) {
      status = "future";
    } else if (weekend) {
      status = "weekend";
    } else if (!policy.dailyLogComplianceEnabled) {
      status = loggedHours > 0 ? "logged" : "no_logs";
    } else {
      trackedWeekdays += 1;
      const isComplete = loggedHours + HOUR_TOLERANCE >= policy.requiredDailyWorkHours;
      if (isComplete) {
        status = "complete";
        completeDays += 1;
      } else {
        status = "incomplete";
        incompleteDays += 1;
      }
    }

    const isComplete =
      required != null && !future && !weekend
        ? loggedHours + HOUR_TOLERANCE >= required
        : null;

    days.push({
      date: dateStr,
      loggedHours,
      requiredHours: required,
      isComplete,
      status
    });
  }

  return {
    developerId,
    developerName: user?.name ?? "Unknown",
    month: m,
    year: y,
    complianceEnabled: policy.dailyLogComplianceEnabled,
    requiredHours: policy.dailyLogComplianceEnabled ? policy.requiredDailyWorkHours : null,
    completeDays,
    incompleteDays,
    trackedWeekdays,
    days
  };
}

export async function buildDailyLogSummary(userId, logDate) {
  const policy = await getWorkPolicy();
  const loggedHours = await sumLoggedHoursForDate(userId, logDate);
  const requiredHours = policy.dailyLogComplianceEnabled
    ? policy.requiredDailyWorkHours
    : null;
  const remainingHours =
    requiredHours == null ? 0 : Math.max(0, Math.round((requiredHours - loggedHours) * 100) / 100);
  const isComplete =
    requiredHours == null ? true : loggedHours + HOUR_TOLERANCE >= requiredHours;

  return {
    date: logDate,
    complianceEnabled: policy.dailyLogComplianceEnabled,
    requiredHours,
    loggedHours,
    remainingHours,
    isComplete
  };
}

async function complianceAlertAlreadySent(userId, logDate) {
  const dateKey = dateKeyFromIso(logDate);
  const existing = await notificationsTable.findOne({
    userId,
    type: "log_compliance",
    entityType: "daily_log_compliance",
    entityId: dateKey
  });
  return Boolean(existing);
}

async function notifyIncompleteHours(user, summary) {
  const dateKey = dateKeyFromIso(summary.date);
  if (await complianceAlertAlreadySent(user.id, summary.date)) return false;

  const remaining = summary.remainingHours.toFixed(1);
  const logged = summary.loggedHours.toFixed(1);
  const required = summary.requiredHours?.toFixed(1) ?? "0";
  const title = "Daily log hours incomplete";
  const body = `You logged ${logged}h on ${summary.date}. Required: ${required}h. Please add ${remaining}h more in your daily logs.`;

  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId: user.id,
    type: "log_compliance",
    title,
    body,
    entityType: "daily_log_compliance",
    entityId: dateKey,
    relatedId: user.id,
    isRead: false,
    createdAt: new Date()
  });
  notifyUser(user.id, "notification", {
    id: notifId,
    type: "log_compliance",
    title,
    body,
    entityType: "daily_log_compliance",
    entityId: dateKey
  });

  if (user.email) {
    await sendDailyLogComplianceEmail({
      to: user.email,
      name: user.name,
      date: summary.date,
      loggedHours: summary.loggedHours,
      requiredHours: summary.requiredHours ?? 0,
      remainingHours: summary.remainingHours
    });
  }

  return true;
}

export async function runDailyLogComplianceCheck(forDate) {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping daily log compliance check: database not connected");
    return { checked: 0, notified: 0 };
  }

  const policy = await getWorkPolicy();
  if (!policy.dailyLogComplianceEnabled) {
    return { checked: 0, notified: 0, skipped: "disabled" };
  }

  const tz = resolveTimezone(policy.complianceTimezone);
  const logDate = forDate ?? localDateString(new Date(), tz);
  const weekday = weekdayForDateString(logDate, tz);
  if (weekday === "Sat" || weekday === "Sun") {
    return { checked: 0, notified: 0, skipped: "weekend", date: logDate };
  }

  const staff = await usersTable
    .find({ role: { $in: STAFF_LOG_ROLES }, status: "active" })
    .lean();

  let notified = 0;
  for (const user of staff) {
    const summary = await buildDailyLogSummary(user.id, logDate);
    if (summary.isComplete) continue;
    const sent = await notifyIncompleteHours(user, summary);
    if (sent) notified += 1;
  }

  return { checked: staff.length, notified, date: logDate };
}

let lastComplianceRunKey = null;
let complianceTickInFlight = false;

export function startDailyLogComplianceJob() {
  const intervalMs = 5 * 60 * 1000;

  const tick = async () => {
    if (complianceTickInFlight) return;
    complianceTickInFlight = true;
    try {
      if (!isDatabaseConnected()) return;

      const { hour: checkHour, tz } = await getComplianceSchedule();
      const now = new Date();
      const hour = localHour(now, tz);
      if (hour !== checkHour) return;

      if (!tz) {
        logger.warn(
          {
            runDateKey: localDateString(now, tz),
            checkHour,
            label: formatCheckHourLabel(checkHour)
          },
          "Skipping daily log compliance: set complianceTimezone in Organization settings or COMPLIANCE_TIMEZONE"
        );
        return;
      }

      const targetLogDate = resolveComplianceTargetDate(now, tz, checkHour);
      const runKey = `${targetLogDate}:${checkHour}`;
      if (lastComplianceRunKey === runKey) return;

      lastComplianceRunKey = runKey;
      const result = await runDailyLogComplianceCheck(targetLogDate);
      logger.info(
        {
          ...result,
          checkHour,
          timezone: tz,
          label: formatCheckHourLabel(checkHour),
          targetLogDate
        },
        "Daily log compliance check completed"
      );
    } catch (err) {
      logger.error({ err }, "Daily log compliance job failed");
      lastComplianceRunKey = null;
    } finally {
      complianceTickInFlight = false;
    }
  };

  void getComplianceSchedule().then(({ hour, tz }) => {
    logger.info(
      {
        checkHour: hour,
        timezone: tz || "UTC (set complianceTimezone in Organization settings)",
        label: formatCheckHourLabel(hour)
      },
      "Daily log compliance reminders scheduled"
    );
  });

  setInterval(() => {
    void tick();
  }, intervalMs);
  return tick;
}

function formatCheckHourLabel(hour24) {
  if (hour24 === 0) return "12:00 AM (midnight)";
  if (hour24 === 12) return "12:00 PM (noon)";
  if (hour24 === 23) return "11:00 PM";
  if (hour24 < 12) return `${hour24}:00 AM`;
  return `${hour24 - 12}:00 PM`;
}
