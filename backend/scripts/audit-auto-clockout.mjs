import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.DATABASE_URL);
const col = mongoose.connection.db.collection("worksessions");
const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const byReason = await col
  .aggregate([
    { $match: { endedAt: { $gte: since }, stopReason: { $ne: null } } },
    { $group: { _id: "$stopReason", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ])
  .toArray();

console.log("Stop reasons last 7 days:");
for (const r of byReason) console.log(`  ${r._id}: ${r.n}`);

const autoReasons = [
  "shift_ended",
  "system_sleep",
  "client_disconnected",
  "network_lost",
  "system_shutdown",
  "app_quit",
  "day_ended",
];

const top = await col
  .aggregate([
    {
      $match: {
        endedAt: { $gte: since },
        stopReason: { $in: autoReasons },
      },
    },
    {
      $group: {
        _id: { userId: "$userId", reason: "$stopReason" },
        n: { $sum: 1 },
      },
    },
    { $sort: { n: -1 } },
    { $limit: 25 },
  ])
  .toArray();

console.log("\nTop auto-stop by user:");
for (const r of top) {
  console.log(`  user ${r._id.userId}  ${r._id.reason}  x${r.n}`);
}

const withPauses = await col
  .find({ startedAt: { $gte: since }, "pausePeriods.0": { $exists: true } })
  .project({ userId: 1, pausePeriods: 1 })
  .limit(200)
  .toArray();

const byStop = {};
let gapMs = 0;
let gapN = 0;
let long = 0;
let longMs = 0;

for (const s of withPauses) {
  for (const p of s.pausePeriods || []) {
    if (!p.pausedAt || !p.resumedAt) continue;
    const ms = new Date(p.resumedAt) - new Date(p.pausedAt);
    if (ms <= 0) continue;
    gapMs += ms;
    gapN += 1;
    const reason = p.stopReason || "unknown";
    byStop[reason] = (byStop[reason] || 0) + 1;
    if (ms >= 30 * 60 * 1000) {
      long += 1;
      longMs += ms;
    }
  }
}

console.log("\nPause gap stopReasons (sample):", byStop);
console.log(
  "Avg pause gap min:",
  gapN ? (gapMs / gapN / 60000).toFixed(1) : "n/a",
  "n=",
  gapN,
);
console.log(
  "Pauses >=30min:",
  long,
  "avg min",
  long ? (longMs / long / 60000).toFixed(1) : "n/a",
);

// Today's incomplete: how many currently inactive with shift_ended / sleep today
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);
const todayEnds = await col
  .aggregate([
    {
      $match: {
        endedAt: { $gte: startOfDay },
        stopReason: { $in: autoReasons },
      },
    },
    { $group: { _id: "$stopReason", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ])
  .toArray();
console.log("\nAuto-stops today:");
for (const r of todayEnds) console.log(`  ${r._id}: ${r.n}`);

await mongoose.disconnect();
