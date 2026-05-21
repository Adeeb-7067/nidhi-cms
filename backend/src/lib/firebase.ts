import admin from "firebase-admin";
import { logger } from "./logger";

export function initFirebaseAdmin() {
  try {
    const existingApps = admin.apps ?? [];
    if (existingApps.length > 0) return;

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

    if (projectId && clientEmail && privateKey) {
      if (!admin.credential?.cert) {
        logger.warn(
          "Firebase Admin SDK loaded but credential API is unavailable. FCM push is disabled.",
        );
        return;
      }
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      logger.info("Firebase Admin initialized via environment variables.");
    } else {
      logger.warn(
        "Firebase Admin credentials not found (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). " +
          "FCM push is disabled; Socket.IO notifications still work.",
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Firebase Admin SDK");
  }
}

export function isFirebaseAdminReady(): boolean {
  return (admin.apps?.length ?? 0) > 0;
}

export function getFirebaseAdmin() {
  return admin;
}
