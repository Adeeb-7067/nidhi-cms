import {
  FinanceCheques,
  notificationsTable,
  usersTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { notifyUser } from "../../../lib/realtime.js";
import { logger } from "../../../lib/logger.js";
import { isDatabaseConnected } from "../../../lib/db.js";

/** Remind from 7 days before clearance through the clearance day (inclusive). */
const REMINDER_WINDOW_DAYS = 7;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameCalendarDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function daysUntilClearance(clearanceDate, now = new Date()) {
  const clear = startOfDay(clearanceDate).getTime();
  const today = startOfDay(now).getTime();
  return Math.round((clear - today) / (24 * 60 * 60 * 1000));
}

async function resolveAdminRecipientIds() {
  const admins = await usersTable
    .find({ role: { $in: ["super_admin", "finance"] }, status: "active" })
    .select({ id: 1 })
    .lean();
  return [...new Set(admins.map((a) => a.id))];
}

async function notifyChequeClearance({ cheque, daysLeft }) {
  const clearLabel = new Date(cheque.clearanceDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const title =
    daysLeft <= 0
      ? `Cheque ${cheque.chequeNumber} clears today`
      : `Cheque ${cheque.chequeNumber} clears in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const body = `Cheque ${cheque.chequeNumber} to ${cheque.payeeName} (₹${Number(cheque.amount).toLocaleString("en-IN")}) clears on ${clearLabel}.`;

  const recipientIds = await resolveAdminRecipientIds();
  await Promise.all(
    recipientIds.map(async (userId) => {
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "finance_cheque_clearance",
        title,
        body,
        entityType: "cheque",
        entityId: cheque.id,
        isRead: false,
        createdAt: new Date(),
      });
      notifyUser(userId, "notification", {
        type: "finance_cheque_clearance",
        title,
        body,
        entityType: "cheque",
        entityId: cheque.id,
      });
    }),
  );
}

async function runChequeClearanceReminderCheck() {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping cheque clearance reminders: database not connected");
    return;
  }

  const now = new Date();
  const windowEnd = new Date(startOfDay(now));
  windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);
  windowEnd.setHours(23, 59, 59, 999);

  const cheques = await FinanceCheques.find({
    status: "issued",
    clearanceDate: { $gte: startOfDay(now), $lte: windowEnd },
  }).lean();

  for (const cheque of cheques) {
    const daysLeft = daysUntilClearance(cheque.clearanceDate, now);
    if (daysLeft == null || daysLeft < 0 || daysLeft > REMINDER_WINDOW_DAYS) continue;
    if (cheque.lastReminderAt && isSameCalendarDay(new Date(cheque.lastReminderAt), now)) continue;

    try {
      await notifyChequeClearance({ cheque, daysLeft });
      await FinanceCheques.updateOne(
        { id: cheque.id },
        {
          $set: {
            lastReminderAt: now,
            ...(cheque.reminderStartedAt ? {} : { reminderStartedAt: now }),
          },
        },
      );
    } catch (err) {
      logger.error({ err, chequeId: cheque.id }, "Failed to send cheque clearance reminder");
    }
  }
}

function startChequeClearanceReminderJob() {
  const intervalMs = 60 * 60 * 1000;
  const tick = () => {
    runChequeClearanceReminderCheck().catch((err) =>
      logger.error({ err }, "Cheque clearance reminder job failed"),
    );
  };
  setInterval(tick, intervalMs);
  return tick;
}

export { startChequeClearanceReminderJob, runChequeClearanceReminderCheck };
