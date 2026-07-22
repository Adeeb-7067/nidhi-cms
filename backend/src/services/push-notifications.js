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
 * High-priority FCM payload for every client platform:
 * Android (native/Flutter), Apple (iOS/macOS), and Web Push.
 * Always use this — never send platform-specific low/normal priority defaults.
 */
export function buildHighPriorityFcmMulticast({ tokens, title, body, data = {} }) {
  const payload = stringifyFcmData({
    click_action: "FLUTTER_NOTIFICATION_CLICK",
    ...data,
    title,
    body,
  });

  return {
    tokens,
    notification: { title, body },
    data: payload,
    android: {
      priority: "high",
      ttl: 60_000,
      notification: {
        title,
        body,
        channelId: "cms_alerts",
        priority: "high",
        defaultSound: true,
        visibility: "public",
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
        "apns-push-type": "alert",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 3600),
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          "content-available": 1,
        },
      },
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "3600",
      },
      notification: {
        title,
        body,
        icon: "/logo.png",
        requireInteraction: true,
      },
      fcmOptions: { link: "/" },
    },
  };
}

/**
 * Send a high-priority FCM alert to an explicit token list (any device type).
 */
export async function sendHighPriorityFcmToTokens(tokens, { title, body, data = {} }) {
  const list = [...new Set((tokens ?? []).filter(Boolean))];
  if (!title || !body || !list.length) {
    return { sent: 0, failed: 0, skipped: "no_tokens_or_content" };
  }

  try {
    const admin = getFirebaseAdmin();
    if (!admin.apps.length) {
      return { sent: 0, failed: 0, skipped: "firebase_not_configured" };
    }

    const result = await admin.messaging().sendEachForMulticast(
      buildHighPriorityFcmMulticast({ tokens: list, title, body, data }),
    );

    const sent = result.responses.filter((r) => r.success).length;
    const failed = result.responses.filter((r) => !r.success).length;
    if (failed > 0) {
      logger.warn({ sent, failed }, "Some high-priority FCM deliveries failed");
    }
    return { sent, failed };
  } catch (err) {
    logger.error({ err }, "Failed to send high-priority FCM");
    return { sent: 0, failed: 0, error: true };
  }
}

/**
 * Send high-priority FCM to every registered token for a user
 * (mobile app, desktop web, or any other FCM client).
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

    return sendHighPriorityFcmToTokens(tokens, { title, body, data });
  } catch (err) {
    logger.error({ err, userId }, "Failed to send FCM notification to user");
    return { sent: 0, failed: 0, error: true };
  }
}

/** Alias — all CMS pushes are high-priority regardless of device. */
export const sendFcmToUser = sendWebPushToUser;
