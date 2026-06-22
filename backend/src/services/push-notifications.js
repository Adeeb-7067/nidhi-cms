import { getFirebaseAdmin } from "../lib/firebase.js";
import { logger } from "../lib/logger.js";
import { usersTable } from "../models/schema/index.js";
import { isUserAccountActive } from "./user-access.js";

function stringifyFcmData(data) {
  const out = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value == null) continue;
    out[key] = typeof value === "string" ? value : String(value);
  }
  return out;
}

/**
 * Send Firebase web push to all registered device tokens for a user.
 * Used for work-session auto clock-out and other high-priority alerts.
 */
export async function sendWebPushToUser(userId, { title, body, data = {} }) {
  if (!title || !body) return { sent: 0, failed: 0 };

  try {
    const user = await usersTable.findOne({ id: userId }).lean();
    if (!isUserAccountActive(user)) {
      return { sent: 0, failed: 0, skipped: "inactive" };
    }
    const tokens = user?.fcmTokens?.filter(Boolean) ?? [];
    if (!tokens.length) return { sent: 0, failed: 0, skipped: "no_tokens" };

    const admin = getFirebaseAdmin();
    if (!admin.apps.length) return { sent: 0, failed: 0, skipped: "firebase_not_configured" };

    const payload = stringifyFcmData({ ...data, title, body });

    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: payload,
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          title,
          body,
          icon: "/logo.png",
          requireInteraction: true,
        },
        fcmOptions: { link: "/" },
      },
    });

    const sent = result.responses.filter((r) => r.success).length;
    const failed = result.responses.filter((r) => !r.success).length;
    if (failed > 0) {
      logger.warn({ userId, sent, failed }, "Some FCM web push deliveries failed");
    }
    return { sent, failed };
  } catch (err) {
    logger.error({ err, userId }, "Failed to send web push notification");
    return { sent: 0, failed: 0, error: true };
  }
}
