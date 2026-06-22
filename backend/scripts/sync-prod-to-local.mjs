/**
 * Copy all MongoDB collections from production into the local DATABASE_URL.
 *
 * Setup (.env):
 *   DATABASE_URL=mongodb://localhost:27017/CMS          # local target
 *   PROD_DATABASE_URL=mongodb+srv://.../CMS             # prod source (read-only)
 *
 * Usage:
 *   node --env-file=.env ./scripts/sync-prod-to-local.mjs --confirm
 */
import mongoose from "mongoose";

const BATCH = 500;
const confirmed = process.argv.includes("--confirm");

function normalizeUri(uri) {
  return uri?.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@") ?? "";
}

function assertDifferentUris(prodUri, localUri) {
  const strip = (u) => u.replace(/\?.*$/, "").replace(/\/+$/, "").toLowerCase();
  if (strip(prodUri) === strip(localUri)) {
    throw new Error(
      "PROD_DATABASE_URL and DATABASE_URL look identical — refusing to sync.",
    );
  }
}

async function copyCollection(prodDb, localDb, name) {
  const prodCol = prodDb.collection(name);
  const localCol = localDb.collection(name);

  const count = await prodCol.countDocuments();
  if (count === 0) {
    console.log(`  ${name}: empty (skipped)`);
    return 0;
  }

  await localCol.deleteMany({});

  let copied = 0;
  let batch = [];
  const cursor = prodCol.find({}).batchSize(BATCH);

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH) {
      await localCol.insertMany(batch, { ordered: false });
      copied += batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    await localCol.insertMany(batch, { ordered: false });
    copied += batch.length;
  }

  const indexes = await prodCol.indexes();
  for (const idx of indexes) {
    if (idx.name === "_id_") continue;
    const { key, ns: _ns, v: _v, ...opts } = idx;
    try {
      await localCol.createIndex(key, opts);
    } catch {
      // index may already exist or be incompatible — non-fatal
    }
  }

  console.log(`  ${name}: ${copied} documents`);
  return copied;
}

async function main() {
  if (!confirmed) {
    console.error(
      "This replaces ALL data in your local DATABASE_URL with a prod copy.\n" +
        "Re-run with --confirm to proceed.",
    );
    process.exit(1);
  }

  const prodUri = process.env.PROD_DATABASE_URL || process.env.MONGODB_URI_PROD;
  const localUri = process.env.DATABASE_URL || process.env.MONGODB_URI;

  if (!prodUri) {
    throw new Error("Set PROD_DATABASE_URL to your production MongoDB connection string.");
  }
  if (!localUri) {
    throw new Error("Set DATABASE_URL to your local MongoDB connection string.");
  }

  assertDifferentUris(prodUri, localUri);

  console.log("Source (prod):", normalizeUri(prodUri));
  console.log("Target (local):", normalizeUri(localUri));
  console.log("\nConnecting...");

  const prodConn = mongoose.createConnection(prodUri);
  const localConn = mongoose.createConnection(localUri);

  await Promise.all([prodConn.asPromise(), localConn.asPromise()]);

  const prodDb = prodConn.db;
  const localDb = localConn.db;

  const collections = (await prodDb.listCollections().toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."))
    .sort();

  console.log(`\nCopying ${collections.length} collections...\n`);

  let totalDocs = 0;
  for (const name of collections) {
    totalDocs += await copyCollection(prodDb, localDb, name);
  }

  console.log(`\nDone. Copied ${totalDocs} documents into local "${localDb.databaseName}".`);
  console.log(
    "Note: uploaded files (avatars, screenshots) still come from object storage — your .env already points at prod Spaces.",
  );

  await Promise.all([prodConn.close(), localConn.close()]);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
