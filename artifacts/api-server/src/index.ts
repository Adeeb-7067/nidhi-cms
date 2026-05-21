import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initRealtime } from "./lib/realtime";
import { initFirebaseAdmin } from "./lib/firebase";
import { startInventoryExpiryJob } from "./lib/inventory-expiry-job";
import { getStorageBackend, isObjectStorageEnabled } from "./lib/file-storage";
import mongoose from "mongoose";
import { whenDatabaseReady } from "./lib/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
initRealtime(server);
initFirebaseAdmin();

const runInventoryExpiryCheck = startInventoryExpiryJob();
let inventoryJobBootstrapped = false;
const bootstrapInventoryJob = () => {
  if (inventoryJobBootstrapped) return;
  inventoryJobBootstrapped = true;
  runInventoryExpiryCheck();
  logger.info("Inventory expiry job started");
};

void whenDatabaseReady()
  .then(bootstrapInventoryJob)
  .catch((err) => {
    logger.warn(
      { err },
      "Inventory expiry job deferred: database unavailable (check DATABASE_URL / network)",
    );
  });

mongoose.connection.on("connected", bootstrapInventoryJob);

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      { port },
      `Port ${port} is already in use. Stop the other API process (or close the terminal running it), then start again.`,
    );
    process.exit(1);
  }
  throw err;
});

server.listen(port, () => {
  logger.info(
    {
      port,
      fileStorage: getStorageBackend(),
      bucket: isObjectStorageEnabled() ? process.env.LINODE_OBJECT_BUCKET : undefined,
    },
    "Server listening with Realtime enabled",
  );
});
