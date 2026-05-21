import mongoose from "mongoose";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// In Mongoose, models are attached to a connection or the global mongoose instance.
// We can pre-connect globally using standard node initialization.
mongoose.connect(process.env.DATABASE_URL).catch(err => {
  console.error("Failed to connect to MongoDB", err);
});

export const db = mongoose.connection;

export * from "./schema";
