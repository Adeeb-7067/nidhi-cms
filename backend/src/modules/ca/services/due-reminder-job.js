import {
  notificationsTable,
  usersTable,
  getNextSequence,
  caCalendarEventsTable,
  caGstFilingsTable,
  caTdsReturnsTable,
  caRocFilingsTable,
  caNoticesTable,
  caDinDscTable,
} from "../../../models/schema/index.js";
import { notifyUser } from "../../../lib/realtime.js";
import { logger } from "../../../lib/logger.js";
import { isDatabaseConnected } from "../../../lib/db.js";

const REMINDER_WINDOW_DAYS = 7;
const MS_DAY = 86_400_000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_DAY);
}

async function resolveCaRecipientIds() {
  const users = await usersTable
    .find({ role: { $in: ["super_admin", "ca"] }, status: "active" })
    .select({ id: 1 })
    .lean();
  return [...new Set(users.map((u) => u.id))];
}

async function alreadyNotifiedToday(userId, dedupeKey) {
  const today = startOfDay(new Date());
  const existing = await notificationsTable
    .findOne({
      userId,
      type: "ca_due_reminder",
      body: dedupeKey,
      createdAt: { $gte: today },
    })
    .select({ id: 1 })
    .lean();
  return Boolean(existing);
}

async function notifyCaUsers({ title, entityType, entityId, href, dedupeKey }) {
  const recipientIds = await resolveCaRecipientIds();
  await Promise.all(
    recipientIds.map(async (userId) => {
      if (await alreadyNotifiedToday(userId, dedupeKey)) return;
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "ca_due_reminder",
        title,
        body: dedupeKey,
        entityType,
        entityId,
        isRead: false,
        createdAt: new Date(),
      });
      notifyUser(userId, "notification", {
        type: "ca_due_reminder",
        title,
        body: dedupeKey,
        entityType,
        entityId,
        href,
      });
    }),
  );
}

function daysLeft(due, now = new Date()) {
  const clear = startOfDay(due).getTime();
  const today = startOfDay(now).getTime();
  return Math.round((clear - today) / MS_DAY);
}

async function runCaDueReminderCheck() {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping CA due reminders: database not connected");
    return;
  }

  const today = startOfDay(new Date());
  const windowEnd = addDays(today, REMINDER_WINDOW_DAYS);
  windowEnd.setHours(23, 59, 59, 999);

  const [calendar, gst, tds, roc, notices, dsc] = await Promise.all([
    caCalendarEventsTable
      .find({
        isDeleted: false,
        status: { $in: ["upcoming", "overdue"] },
        dueDate: { $lte: windowEnd },
        $or: [{ sourceKey: null }, { sourceKey: { $exists: false } }],
      })
      .limit(30)
      .lean(),
    caGstFilingsTable
      .find({
        isDeleted: false,
        status: { $in: ["pending", "overdue", "draft"] },
        dueDate: { $lte: windowEnd },
      })
      .limit(20)
      .lean(),
    caTdsReturnsTable
      .find({
        isDeleted: false,
        status: { $in: ["pending", "overdue", "draft"] },
        dueDate: { $lte: windowEnd },
      })
      .limit(15)
      .lean(),
    caRocFilingsTable
      .find({
        isDeleted: false,
        status: { $in: ["pending", "overdue", "draft"] },
        dueDate: { $lte: windowEnd },
      })
      .limit(15)
      .lean(),
    caNoticesTable
      .find({
        isDeleted: false,
        workflowStatus: { $in: ["received", "assigned", "replied"] },
        dueDate: { $lte: windowEnd },
      })
      .limit(20)
      .lean(),
    caDinDscTable
      .find({
        isDeleted: false,
        dscExpiry: { $lte: windowEnd },
      })
      .limit(15)
      .lean(),
  ]);

  for (const e of calendar) {
    const left = daysLeft(e.dueDate);
    const title =
      left < 0
        ? `Overdue: ${e.title}`
        : left === 0
          ? `Due today: ${e.title}`
          : `Due in ${left}d: ${e.title}`;
    await notifyCaUsers({
      title,
      entityType: "ca_calendar",
      entityId: e.id,
      href: "/ca/compliance-calendar",
      dedupeKey: `ca_calendar:${e.id}:${startOfDay(new Date()).toISOString().slice(0, 10)}`,
    });
  }

  for (const f of gst) {
    const left = daysLeft(f.dueDate);
    const label = `${f.returnType} ${f.period}`;
    const title =
      left < 0 ? `Overdue GST: ${label}` : left === 0 ? `GST due today: ${label}` : `GST due in ${left}d: ${label}`;
    await notifyCaUsers({
      title,
      entityType: "ca_gst",
      entityId: f.id,
      href: "/ca/gst",
      dedupeKey: `ca_gst:${f.id}:${startOfDay(new Date()).toISOString().slice(0, 10)}`,
    });
  }

  for (const f of tds) {
    const left = daysLeft(f.dueDate);
    const label = `${f.returnType} ${f.quarter}`;
    const title =
      left < 0 ? `Overdue TDS: ${label}` : left === 0 ? `TDS due today: ${label}` : `TDS due in ${left}d: ${label}`;
    await notifyCaUsers({
      title,
      entityType: "ca_tds",
      entityId: f.id,
      href: "/ca/tds",
      dedupeKey: `ca_tds:${f.id}:${startOfDay(new Date()).toISOString().slice(0, 10)}`,
    });
  }

  for (const f of roc) {
    const left = daysLeft(f.dueDate);
    const label = `${f.form} ${f.financialYear || ""}`.trim();
    const title =
      left < 0 ? `Overdue ROC: ${label}` : left === 0 ? `ROC due today: ${label}` : `ROC due in ${left}d: ${label}`;
    await notifyCaUsers({
      title,
      entityType: "ca_roc",
      entityId: f.id,
      href: "/ca/roc",
      dedupeKey: `ca_roc:${f.id}:${startOfDay(new Date()).toISOString().slice(0, 10)}`,
    });
  }

  for (const n of notices) {
    const left = daysLeft(n.dueDate);
    const title =
      left < 0
        ? `Overdue notice: ${n.reference}`
        : left === 0
          ? `Notice due today: ${n.reference}`
          : `Notice due in ${left}d: ${n.reference}`;
    await notifyCaUsers({
      title,
      entityType: "ca_notice",
      entityId: n.id,
      href: n.reference ? `/ca/notices?search=${encodeURIComponent(n.reference)}` : "/ca/notices",
      dedupeKey: `ca_notice:${n.id}:${startOfDay(new Date()).toISOString().slice(0, 10)}`,
    });
  }

  for (const d of dsc) {
    const left = daysLeft(d.dscExpiry);
    const name = d.directorName || "Director";
    const title =
      left < 0
        ? `DSC expired: ${name}`
        : left === 0
          ? `DSC expires today: ${name}`
          : `DSC expires in ${left}d: ${name}`;
    await notifyCaUsers({
      title,
      entityType: "ca_dsc",
      entityId: d.id,
      href: "/ca/din-dsc",
      dedupeKey: `ca_dsc:${d.id}:${startOfDay(new Date()).toISOString().slice(0, 10)}`,
    });
  }

  logger.info("CA due reminder check completed");
}

/** Daily job — same cadence pattern as finance cheque reminders. */
export function startCaDueReminderJob() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const tick = () => {
    void runCaDueReminderCheck().catch((err) =>
      logger.error({ err }, "CA due reminder job failed"),
    );
  };
  setInterval(tick, SIX_HOURS);
  return tick;
}
