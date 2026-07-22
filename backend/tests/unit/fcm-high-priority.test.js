import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildHighPriorityFcmMulticast } from "../../src/services/push-notifications.js";

describe("high-priority FCM for all devices", () => {
  test("multicast includes Android, APNs, and Web high-priority headers", () => {
    const msg = buildHighPriorityFcmMulticast({
      tokens: ["token-a", "token-b"],
      title: "Test",
      body: "Body",
      data: { type: "ticket" },
    });

    assert.deepEqual(msg.tokens, ["token-a", "token-b"]);
    assert.equal(msg.notification.title, "Test");
    assert.equal(msg.android.priority, "high");
    assert.equal(msg.android.notification.priority, "high");
    assert.equal(msg.android.notification.channelId, "cms_alerts");
    assert.equal(msg.apns.headers["apns-priority"], "10");
    assert.equal(msg.apns.headers["apns-push-type"], "alert");
    assert.equal(msg.webpush.headers.Urgency, "high");
    assert.equal(msg.data.type, "ticket");
    assert.equal(msg.data.click_action, "FLUTTER_NOTIFICATION_CLICK");
  });
});
