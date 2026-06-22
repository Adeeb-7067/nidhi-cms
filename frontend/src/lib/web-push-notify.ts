/** OS / browser notification for work-session events (works in web and Electron). */

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function showWebPushNotification(
  title: string,
  body: string,
  options?: { tag?: string; onClick?: () => void },
) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      icon: "/logo.png",
      tag: options?.tag ?? "cms-work-session",
      requireInteraction: true,
    });
    notification.onclick = () => {
      window.focus();
      options?.onClick?.();
      notification.close();
    };
  } catch {
    /* ignore — permission revoked or unsupported context */
  }
}
