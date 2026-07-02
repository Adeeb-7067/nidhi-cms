/**
 * Monitoring stack audit — DB integrity + API smoke tests.
 * Run: node scripts/audit-monitoring.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";
import {
  employeeScreenshotsTable,
  workSessionsTable,
  monitoringConsentsTable,
  usersTable,
} from "../src/models/schema/index.js";
import { getOrCreateSettings } from "../src/services/company-settings.js";
import { computeSessionDurations } from "../src/services/work-sessions.service.js";
import { monitorableStaffRoles } from "../src/constants/user-roles.js";
import { signAccessToken } from "../src/lib/jwt.js";

const API_BASE = process.env.AUDIT_API_BASE || "http://localhost:15000";
const issues = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  issues.push(msg);
  console.log(`  ✗ ${msg}`);
}

function info(msg) {
  console.log(`  · ${msg}`);
}

async function getTokensFromDb() {
  const admin = await usersTable.findOne({ role: "super_admin", status: "active" }).lean();
  const dev = await usersTable
    .findOne({ role: { $in: monitorableStaffRoles }, employeeId: { $ne: null }, status: "active" })
    .lean();
  if (!admin) throw new Error("No active super_admin in DB");
  const adminToken = signAccessToken({ userId: admin.id, role: admin.role });
  let devToken;
  let devUser;
  if (dev) {
    devToken = signAccessToken({ userId: dev.id, role: dev.role });
    devUser = { id: dev.id, name: dev.name, role: dev.role };
  }
  return { admin, adminToken, dev, devToken, devUser };
}

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

async function auditDatabase() {
  console.log("\n=== DATABASE ===");

  const settings = await getOrCreateSettings();
  pass(`Company settings loaded (screenshotEnabled=${settings.screenshotEnabled})`);

  const monitorableUsers = await usersTable.countDocuments({ role: { $in: monitorableStaffRoles } });
  info(`${monitorableUsers} monitorable staff users`);

  const screenshotTotal = await employeeScreenshotsTable.countDocuments();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const screenshotsToday = await employeeScreenshotsTable.countDocuments({
    takenAt: { $gte: todayStart, $lte: todayEnd },
  });
  pass(`${screenshotTotal} total screenshots (${screenshotsToday} today)`);

  const missingFileUrl = await employeeScreenshotsTable.countDocuments({
    $or: [{ fileUrl: null }, { fileUrl: "" }],
  });
  if (missingFileUrl > 0) fail(`${missingFileUrl} screenshots missing fileUrl`);
  else pass("All screenshots have fileUrl");

  const duplicateActive = await workSessionsTable.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (duplicateActive.length > 0) {
    fail(`${duplicateActive.length} user(s) with multiple active sessions: ${JSON.stringify(duplicateActive)}`);
  } else pass("No duplicate active sessions per user");

  const activeCount = await workSessionsTable.countDocuments({ isActive: true });
  pass(`${activeCount} active work session(s)`);

  const staleHeartbeats = await workSessionsTable.countDocuments({
    isActive: true,
    lastHeartbeatAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) },
  });
  if (staleHeartbeats > 0) {
    info(`${staleHeartbeats} active session(s) with heartbeat older than 5 min`);
  }

  const consentTotal = await monitoringConsentsTable.countDocuments();
  pass(`${consentTotal} consent record(s)`);

  const pausedToday = await workSessionsTable.countDocuments({
    isActive: false,
    endedAt: { $gte: todayStart },
    stopReason: { $in: ["clock_out", "app_quit", "logout", "system_sleep", "network_lost", "client_disconnected"] },
  });
  info(`${pausedToday} resumable paused session(s) today`);

  const sampleActive = await workSessionsTable.findOne({ isActive: true }).lean();
  if (sampleActive) {
    const d = computeSessionDurations(sampleActive);
    if (d.activeDurationMs < 0 || d.pauseDurationMs < 0) {
      fail("Negative duration computed for active session");
    } else {
      pass("Session duration computation OK on sample active session");
    }
  }

  const orphanScreenshots = await employeeScreenshotsTable.countDocuments({
    sessionId: { $ne: null },
  });
  if (orphanScreenshots > 0) {
    const orphans = await employeeScreenshotsTable.aggregate([
      { $match: { sessionId: { $ne: null } } },
      { $lookup: { from: "worksessions", localField: "sessionId", foreignField: "id", as: "session" } },
      { $match: { session: { $size: 0 } } },
      { $count: "n" },
    ]);
    const n = orphans[0]?.n ?? 0;
    if (n > 0) info(`${n} screenshot(s) reference missing sessionId (historical OK if sessions purged)`);
  }
}

async function auditApi(adminToken, devToken, devUser) {
  console.log("\n=== API (admin) ===");

  let r = await apiGet("/api/monitoring/status", adminToken);
  if (r.ok && typeof r.body.screenshotEnabled === "boolean") {
    pass("GET /api/monitoring/status");
  } else fail(`GET /api/monitoring/status (${r.status})`);

  r = await apiGet("/api/monitoring/consents?limit=5", adminToken);
  if (r.ok && Array.isArray(r.body.data)) pass("GET /api/monitoring/consents");
  else fail(`GET /api/monitoring/consents (${r.status})`);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);
  const qs = new URLSearchParams({
    startDate: dayStart.toISOString(),
    endDate: dayEnd.toISOString(),
    page: "1",
    limit: "500",
  });

  r = await apiGet(`/api/screenshots?${qs}`, adminToken);
  if (r.ok && Array.isArray(r.body.data) && typeof r.body.total === "number") {
    pass(`GET /api/screenshots (page 1: ${r.body.data.length}/${r.body.total})`);
    if (r.body.total > 500 && r.body.data.length === 500) {
      info("Total > 500 — frontend fetchAllPages required (already implemented)");
    }
    const sample = r.body.data[0];
    if (sample?.fileUrl) {
      const imgRes = await fetch(sample.fileUrl);
      if (imgRes.ok) pass("Screenshot content proxy loads (sample image)");
      else fail(`Screenshot content proxy failed (${imgRes.status}) for id ${sample.id}`);
    }
  } else fail(`GET /api/screenshots (${r.status})`);

  r = await apiGet("/api/work-sessions/active-all", adminToken);
  if (r.ok && Array.isArray(r.body.data)) {
    pass(`GET /api/work-sessions/active-all (${r.body.total} active)`);
    const s = r.body.data[0];
    if (s && s.pausePeriods !== undefined && s.totalDurationMs !== undefined) {
      pass("Work session response includes pause/resume fields");
    } else if (s) {
      fail("Active session missing pausePeriods/totalDurationMs in API response");
    }
  } else fail(`GET /api/work-sessions/active-all (${r.status})`);

  r = await apiGet("/api/work-sessions?limit=5", adminToken);
  if (r.ok && Array.isArray(r.body.data)) pass("GET /api/work-sessions (admin list)");
  else fail(`GET /api/work-sessions (${r.status})`);

  console.log("\n=== API (monitorable staff) ===");

  if (!devToken) {
    info("No dev token — skipping staff API checks");
    return;
  }

  r = await apiGet("/api/monitoring/consent-status", devToken);
  if (r.ok && typeof r.body.hasConsented === "boolean") pass("GET /api/monitoring/consent-status");
  else fail(`GET /api/monitoring/consent-status (${r.status})`);

  r = await apiGet("/api/work-sessions/active", devToken);
  if (r.ok) pass("GET /api/work-sessions/active");
  else fail(`GET /api/work-sessions/active (${r.status})`);

  r = await apiGet(`/api/screenshots?${qs}`, devToken);
  if (r.ok) {
    const allOwn = r.body.data.every((s) => s.userId === devUser.id);
    if (allOwn) pass("Staff screenshot list scoped to own user");
    else fail("Staff screenshot list returned other users' data");
  } else fail(`GET /api/screenshots as staff (${r.status})`);
}

async function main() {
  console.log("Monitoring audit");
  console.log(`API: ${API_BASE}`);

  await mongoose.connect(process.env.DATABASE_URL);
  await auditDatabase();

  let adminToken;
  let devToken;
  let devUser;
  let admin;
  try {
    ({ admin, adminToken, devToken, devUser } = await getTokensFromDb());
    pass(`JWT issued for admin ${admin.email ?? admin.name} (id ${admin.id})`);
    if (devUser) pass(`JWT issued for staff ${devUser.name} (id ${devUser.id})`);
  } catch (err) {
    fail(`Token setup: ${err.message}`);
  }

  if (adminToken) await auditApi(adminToken, devToken, devUser);

  await mongoose.disconnect();

  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${passes.length}`);
  console.log(`Issues: ${issues.length}`);
  if (issues.length) {
    issues.forEach((i) => console.log(`  - ${i}`));
    process.exit(1);
  }
  console.log("All checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
