import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let cachedFcmToken: string | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
  } catch (err) {
    console.warn("Firebase service worker registration failed:", err);
    return null;
  }
}

export const initFirebase = async (): Promise<Messaging | null> => {
  if (!isFirebaseConfigured()) {
    console.warn("Firebase configuration not found. Push notifications disabled.");
    return null;
  }

  // FCM requires HTTPS — degrade gracefully in Electron (file:// context)
  if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) return null;

    await registerServiceWorker();
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
  return null;
};

export const requestFirebaseToken = async (vapidKey: string): Promise<string | null> => {
  if (!messaging) return null;

  try {
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") {
      console.warn("Notification permission not granted.");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (currentToken) {
      cachedFcmToken = currentToken;
      return currentToken;
    }
    console.warn("No FCM registration token available.");
    return null;
  } catch (err) {
    console.error("An error occurred while retrieving FCM token.", err);
    return null;
  }
};

export function getCachedFcmToken(): string | null {
  return cachedFcmToken;
}

/** Best-effort: resolve the device token for logout even if it was not cached this session. */
export async function resolveFcmTokenForLogout(): Promise<string | null> {
  if (cachedFcmToken) return cachedFcmToken;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey || !isFirebaseConfigured()) return null;
  await initFirebase();
  return requestFirebaseToken(vapidKey);
}

/** Invalidate local FCM registration so this browser stops receiving pushes. */
export async function revokeFirebaseToken(): Promise<void> {
  if (!messaging) return;
  try {
    await deleteToken(messaging);
  } catch (err) {
    console.warn("Failed to delete local FCM token.", err);
  } finally {
    cachedFcmToken = null;
  }
}

/** Subscribe to foreground FCM messages (returns unsubscribe). */
export function subscribeForegroundMessages(
  handler: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void,
): () => void {
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}
