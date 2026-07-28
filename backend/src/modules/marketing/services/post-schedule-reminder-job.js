import { marketingPostsTable } from "../../../models/schema/index.js";
import { isDatabaseConnected } from "../../../lib/db.js";
import { logger } from "../../../lib/logger.js";
import { notifyMarketingPostScheduleReminder } from "./post-notifications.js";

/** Look back this far so short outages still deliver due reminders. */
const LOOKBACK_MS = 30 * 60 * 1000;
const TICK_MS = 60 * 1000;

let tickInFlight = false;

async function runMarketingPostReminderTick() {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    if (!isDatabaseConnected()) return;

    const now = new Date();
    const lookback = new Date(now.getTime() - LOOKBACK_MS);

    const due = await marketingPostsTable
      .find({
        isDeleted: false,
        scheduledAt: { $gte: lookback, $lte: now },
        reminderSentAt: null,
        scheduleStatus: { $nin: ["published", "rejected"] },
      })
      .select({
        id: 1,
        accountId: 1,
        companyId: 1,
        caption: 1,
        scheduledAt: 1,
        assigneeId: 1,
        createdBy: 1,
        scheduleStatus: 1,
      })
      .limit(100)
      .lean();

    for (const post of due) {
      try {
        const claimed = await marketingPostsTable.findOneAndUpdate(
          { id: post.id, isDeleted: false, reminderSentAt: null },
          { $set: { reminderSentAt: now } },
          { new: false },
        );
        if (!claimed) continue;

        await notifyMarketingPostScheduleReminder(post);
      } catch (err) {
        logger.error({ err, postId: post.id }, "Failed marketing post schedule reminder");
        // Allow retry on next tick if notify failed after claim.
        await marketingPostsTable
          .updateOne({ id: post.id, reminderSentAt: now }, { $set: { reminderSentAt: null } })
          .catch(() => {});
      }
    }
  } finally {
    tickInFlight = false;
  }
}

function startMarketingPostReminderJob() {
  setInterval(() => {
    void runMarketingPostReminderTick();
  }, TICK_MS);
  return runMarketingPostReminderTick;
}

export { startMarketingPostReminderJob, runMarketingPostReminderTick };
