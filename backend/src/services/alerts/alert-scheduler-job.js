import { alertsTable, alertDeliveriesTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { emitToUsers, broadcast } from "../../lib/realtime.js";
import { isDatabaseConnected } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

let tickInFlight = false;

async function resolveRecipientIds(alert) {
  if (alert.audienceType === "user") {
    return alert.targetUserId ? [alert.targetUserId] : [];
  }
  if (alert.audienceType === "role") {
    const users = await usersTable.find({ role: alert.targetRole, status: "active" }, { id: 1 }).lean();
    return users.map((u) => u.id);
  }
  const users = await usersTable.find({ status: "active" }, { id: 1 }).lean();
  return users.map((u) => u.id);
}

async function fireAlert(alert) {
  const claimed = await alertsTable.findOneAndUpdate(
    { id: alert.id, status: "scheduled" },
    { $set: { status: "sent", firedAt: new Date() } }
  );
  if (!claimed) return;

  const recipientIds = await resolveRecipientIds(alert);
  if (recipientIds.length > 0) {
    const deliveries = await Promise.all(
      recipientIds.map(async (userId) => ({
        id: await getNextSequence("alert_deliveries"),
        alertId: alert.id,
        userId,
        dismissedAt: null,
        createdAt: new Date(),
      }))
    );
    await alertDeliveriesTable.insertMany(deliveries, { ordered: false }).catch((err) => {
      logger.warn({ err, alertId: alert.id }, "Some alert deliveries could not be inserted");
    });
  }

  const payload = {
    id: alert.id,
    title: alert.title,
    description: alert.description,
    photoUrl: alert.photoUrl ?? null,
  };
  if (alert.audienceType === "all") {
    broadcast("alert:new", payload);
  } else {
    emitToUsers(recipientIds, "alert:new", payload);
  }
}

async function runAlertSchedulerTick() {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    if (!isDatabaseConnected()) return;
    const due = await alertsTable.find({ status: "scheduled", scheduledAt: { $lte: new Date() } });
    for (const alert of due) {
      await fireAlert(alert).catch((err) => {
        logger.error({ err, alertId: alert.id }, "Failed to fire scheduled alert");
      });
    }
  } finally {
    tickInFlight = false;
  }
}

function startAlertSchedulerJob() {
  const intervalMs = 30 * 1000;
  setInterval(() => {
    void runAlertSchedulerTick();
  }, intervalMs);
  return runAlertSchedulerTick;
}

export { startAlertSchedulerJob };
