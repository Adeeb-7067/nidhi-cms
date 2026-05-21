import mongoose from "mongoose";
import * as schema from "@/models/schema";

console.log("[DB] Initializing MongoDB connection...");
console.log("[DB] DATABASE_URL available:", !!process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  // Log a safe version of the URL to verify it's correctly passed
  const safeUrl = url.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log("[DB] Connection URL:", safeUrl);

  // Register events BEFORE connecting
  mongoose.connection.on("connecting", () => console.log("[DB] MongoDB connecting..."));
  mongoose.connection.on("connected", () => console.log("[DB] MongoDB connected successfully!"));
  mongoose.connection.on("error", (err) => console.error("[DB] MongoDB connection error:", err));
  mongoose.connection.on("disconnected", () => console.warn("[DB] MongoDB disconnected!"));

  if (mongoose.connection.readyState === 0) {
    mongoose.connect(url, {
      serverSelectionTimeoutMS: 5000 // Fail faster if server can't be selected
    }).then(() => {
      console.log("[DB] Mongoose connect call resolved.");
    }).catch(err => {
      console.error("[DB] Failed to initiate MongoDB connection:", err);
    });
  } else {
    console.log("[DB] Mongoose already has connection state:", mongoose.connection.readyState);
  }
} else {
  console.error("[DB] Critical Error: DATABASE_URL is not defined in environment!");
}

export const db = mongoose.connection;
export type DB = typeof mongoose.connection;

/** True when Mongoose has an active MongoDB connection */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Resolves when MongoDB is connected, or rejects if connection fails.
 * Safe to call multiple times.
 */
export function whenDatabaseReady(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return Promise.reject(new Error("DATABASE_URL is not defined"));
  }
  if (isDatabaseConnected()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onConnected = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      mongoose.connection.off("connected", onConnected);
      mongoose.connection.off("error", onError);
    };
    mongoose.connection.once("connected", onConnected);
    mongoose.connection.once("error", onError);
  });
}
