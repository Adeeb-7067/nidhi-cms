import mongoose from "mongoose";
console.log("[DB] Initializing MongoDB connection...");
console.log("[DB] DATABASE_URL available:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const safeUrl = url.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log("[DB] Connection URL:", safeUrl);
  mongoose.connection.on("connecting", () => console.log("[DB] MongoDB connecting..."));
  mongoose.connection.on("connected", () => console.log("[DB] MongoDB connected successfully!"));
  mongoose.connection.on("error", (err) => console.error("[DB] MongoDB connection error:", err));
  mongoose.connection.on("disconnected", () => console.warn("[DB] MongoDB disconnected!"));
  if (mongoose.connection.readyState === 0) {
    mongoose.connect(url, {
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 10,   // max concurrent DB connections
      minPoolSize: 2,    // keep at least 2 warm connections in the pool
    }).then(() => {
      console.log("[DB] Mongoose connect call resolved.");
    }).catch((err) => {
      console.error("[DB] Failed to initiate MongoDB connection:", err);
    });
  } else {
    console.log("[DB] Mongoose already has connection state:", mongoose.connection.readyState);
  }
} else {
  console.error("[DB] Critical Error: DATABASE_URL is not defined in environment!");
}
const db = mongoose.connection;
function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
function whenDatabaseReady() {
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
    const onError = (err) => {
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
export {
  db,
  isDatabaseConnected,
  whenDatabaseReady
};
