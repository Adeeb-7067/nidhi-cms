import { createServer } from "node:http";
import app from "./app";
import { getRequiredPort } from "@/config";
import { logger } from "@/lib/logger";
import { initRealtime } from "@/lib/realtime";
import { initFirebaseAdmin } from "@/lib/firebase";
import { startInventoryExpiryJob } from "@/services/inventory/expiry-job";
import { getStorageBackend, isObjectStorageEnabled } from "@/lib/file-storage";
import mongoose from "mongoose";
import { whenDatabaseReady } from "@/lib/db";
const port = getRequiredPort();
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
void whenDatabaseReady().then(bootstrapInventoryJob).catch((err) => {
  logger.warn(
    { err },
    "Inventory expiry job deferred: database unavailable (check DATABASE_URL / network)"
  );
});
mongoose.connection.on("connected", bootstrapInventoryJob);
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      { port },
      `Port ${port} is already in use. Stop the other API process (or close the terminal running it), then start again.`
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
      bucket: isObjectStorageEnabled() ? process.env.LINODE_OBJECT_BUCKET : void 0
    },
    "Server listening with Realtime enabled"
  );
});
