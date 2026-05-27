import { usersTable } from "../models/schema/index.js";
import { logger } from "../lib/logger.js";

/**
 * CMS tab open = online. Away only when the client reports the tab is hidden.
 * HTTP heartbeats keep presence alive when Socket.IO is disconnected but the app is open.
 */
export const HTTP_PRESENCE_TTL_MS = 90_000;
const DB_LAST_SEEN_DEBOUNCE_MS = 2 * 60 * 1000;
const SWEEP_INTERVAL_MS = 30_000;

/** @type {Map<number, { socketIds: Set<string>, tabVisible: boolean, lastHeartbeatAt: Date, lastDbWriteAt?: Date, role?: string, _lastBroadcastStatus?: string }>} */
const liveByUserId = new Map();

/** @type {Map<number, string | null>} */
const offlineLastSeenIso = new Map();

let sweepTimer = null;
let broadcastFn = null;

function toIso(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isSessionLive(entry) {
  if (!entry) return false;
  if (entry.socketIds.size > 0) return true;
  return Date.now() - entry.lastHeartbeatAt.getTime() < HTTP_PRESENCE_TTL_MS;
}

function computeStatus(entry) {
  if (!isSessionLive(entry)) return "offline";
  if (entry.tabVisible === false) return "away";
  return "online";
}

function formatSnapshot(userId, entry, dbLastSeen) {
  const hasLive = isSessionLive(entry);
  const status = hasLive ? computeStatus(entry) : "offline";
  const lastSeenAt = hasLive
    ? new Date().toISOString()
    : offlineLastSeenIso.get(userId) ?? toIso(dbLastSeen) ?? null;
  return {
    userId,
    status,
    isActiveNow: status === "online",
    lastSeenAt,
    lastActivityAt: hasLive ? toIso(entry.lastHeartbeatAt) : null,
  };
}

async function persistLastSeen(userId) {
  const now = new Date();
  offlineLastSeenIso.set(userId, now.toISOString());
  try {
    await usersTable.updateOne({ id: userId }, { $set: { lastSeenAt: now } });
  } catch (err) {
    logger.warn({ err, userId }, "Failed to persist lastSeenAt");
  }
}

async function maybePersistLastSeen(userId, entry) {
  const now = Date.now();
  if (entry.lastDbWriteAt && now - entry.lastDbWriteAt < DB_LAST_SEEN_DEBOUNCE_MS) return;
  entry.lastDbWriteAt = now;
  await persistLastSeen(userId);
}

function emitPresence(userId) {
  if (!broadcastFn) return;
  const entry = liveByUserId.get(userId);
  const snapshot = formatSnapshot(userId, entry, null);
  broadcastFn(snapshot);
}

function sweepStaleSessions() {
  const now = Date.now();
  for (const [userId, entry] of liveByUserId) {
    const stale =
      entry.socketIds.size === 0 &&
      now - entry.lastHeartbeatAt.getTime() >= HTTP_PRESENCE_TTL_MS;
    if (stale) {
      liveByUserId.delete(userId);
      void persistLastSeen(userId);
      emitPresence(userId);
      continue;
    }
    const prev = entry._lastBroadcastStatus;
    const next = computeStatus(entry);
    if (prev !== next) {
      entry._lastBroadcastStatus = next;
      emitPresence(userId);
    }
  }
}

export function initPresenceBroadcast(emit) {
  broadcastFn = emit;
  if (!sweepTimer) {
    sweepTimer = setInterval(sweepStaleSessions, SWEEP_INTERVAL_MS);
    if (sweepTimer.unref) sweepTimer.unref();
  }
}

async function loadEntryRole(userId, entry) {
  if (entry.role) return;
  const user = await usersTable.findOne({ id: userId }, { role: 1 }).lean();
  if (user?.role) entry.role = user.role;
}

async function ensureEntry(userId) {
  let entry = liveByUserId.get(userId);
  if (!entry) {
    const user = await usersTable.findOne({ id: userId }, { role: 1, lastSeenAt: 1 }).lean();
    entry = {
      socketIds: new Set(),
      tabVisible: true,
      lastHeartbeatAt: new Date(),
      role: user?.role,
      _lastBroadcastStatus: "online",
    };
    liveByUserId.set(userId, entry);
    if (user?.lastSeenAt) offlineLastSeenIso.set(userId, toIso(user.lastSeenAt));
    if (!entry.role) void loadEntryRole(userId, entry);
  }
  return entry;
}

export async function registerSocket(userId, socketId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;

  const entry = await ensureEntry(id);
  entry.socketIds.add(socketId);
  entry.lastHeartbeatAt = new Date();
  entry.tabVisible = true;
  entry._lastBroadcastStatus = computeStatus(entry);
  emitPresence(id);
  return formatSnapshot(id, entry, null);
}

export async function unregisterSocket(userId, socketId) {
  const id = Number(userId);
  const entry = liveByUserId.get(id);
  if (!entry) return;

  entry.socketIds.delete(socketId);
  if (!isSessionLive(entry)) {
    liveByUserId.delete(id);
    await persistLastSeen(id);
    entry._lastBroadcastStatus = "offline";
    emitPresence(id);
    return;
  }
  emitPresence(id);
}

/**
 * @param {number} userId
 * @param {{ tabVisible?: boolean }} [opts] tabVisible false = background tab (away)
 */
export function touchPresence(userId, opts = {}) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;

  let entry = liveByUserId.get(id);
  const isNew = !entry;
  if (!entry) {
    entry = {
      socketIds: new Set(),
      tabVisible: opts.tabVisible !== false,
      lastHeartbeatAt: new Date(),
      _lastBroadcastStatus: "offline",
    };
    liveByUserId.set(id, entry);
    void loadEntryRole(id, entry);
  }

  const prevStatus = isNew ? "offline" : computeStatus(entry);
  entry.lastHeartbeatAt = new Date();
  if (opts.tabVisible !== undefined) {
    entry.tabVisible = opts.tabVisible;
  } else if (entry.tabVisible === undefined) {
    entry.tabVisible = true;
  }

  const nextStatus = computeStatus(entry);
  if (isNew || prevStatus !== nextStatus) {
    entry._lastBroadcastStatus = nextStatus;
    emitPresence(id);
  }

  void maybePersistLastSeen(id, entry);
  return formatSnapshot(id, entry, null);
}

export function getPresenceSnapshot(userId) {
  const id = Number(userId);
  const entry = liveByUserId.get(id);
  return formatSnapshot(id, entry, offlineLastSeenIso.get(id));
}

export function getLivePresenceMap() {
  const out = {};
  for (const [userId, entry] of liveByUserId) {
    if (isSessionLive(entry)) {
      out[userId] = formatSnapshot(userId, entry, null);
    }
  }
  return out;
}

export async function getPresenceForUserIds(ids) {
  const unique = [...new Set(ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  const presence = { ...getLivePresenceMap() };

  const missing = unique.filter((id) => !presence[id]);
  if (missing.length === 0) return presence;

  const users = await usersTable
    .find({ id: { $in: missing } }, { id: 1, lastSeenAt: 1 })
    .lean();

  for (const u of users) {
    if (!presence[u.id]) {
      if (u.lastSeenAt) offlineLastSeenIso.set(u.id, toIso(u.lastSeenAt));
      presence[u.id] = formatSnapshot(u.id, null, u.lastSeenAt);
    }
  }
  for (const id of missing) {
    if (!presence[id]) {
      presence[id] = formatSnapshot(id, null, null);
    }
  }
  return presence;
}

export function countOnlineByRoles(roles) {
  const roleSet = new Set(roles);
  let count = 0;
  for (const [, entry] of liveByUserId) {
    if (!isSessionLive(entry)) continue;
    if (roleSet.size && entry.role && !roleSet.has(entry.role)) continue;
    if (computeStatus(entry) === "online") count += 1;
  }
  return count;
}

export function attachPresenceToUser(user) {
  const snap = getPresenceSnapshot(user.id);
  return {
    ...user,
    presenceStatus: snap.status,
    isActiveNow: snap.isActiveNow,
    lastSeenAt: snap.lastSeenAt ?? user.lastSeenAt ?? null,
    lastActivityAt: snap.lastActivityAt,
  };
}
