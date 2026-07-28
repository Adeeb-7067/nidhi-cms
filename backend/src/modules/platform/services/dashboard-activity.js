import {
  auditLogsTable,
  usersTable,
  projectsTable,
  clientsTable,
  ticketsTable,
  bugsTable,
} from "../../../models/schema/index.js";

const NOISE_ENTITY_TYPES = new Set(["auth", "presence", "analytics", "health"]);

const ENTITY_SINGULAR = {
  projects: "project",
  clients: "client",
  companies: "client",
  logs: "daily log",
  bugs: "bug",
  tickets: "ticket",
  users: "user",
  requests: "resource request",
  comments: "comment",
  tasks: "task",
  apk: "APK release",
  reports: "report",
  session: "portal",
};

function formatActivityAction(action, entityType, newVal) {
  if (action === "login") return "signed in to";
  if (action === "logout") return "signed out of";
  if (action === "impersonate") return "impersonated";
  if (action === "stop_impersonate") return "stopped impersonating";

  const label = ENTITY_SINGULAR[entityType] ?? entityType?.replace(/_/g, " ") ?? "record";
  const verb = newVal?.title ?? newVal?.companyName ?? newVal?.name;

  if (action.startsWith("POST_")) return `created ${label}`;
  if (action.startsWith("PATCH_") || action.startsWith("PUT_")) return `updated ${label}`;
  if (action.startsWith("DELETE_")) return `deleted ${label}`;

  if (verb) return `changed ${label}`;
  return `updated ${label}`;
}

function fallbackEntityName(log) {
  if (log.action === "login" || log.action === "logout") return ENTITY_SINGULAR.session;
  const type = log.entityType ?? "record";
  const label = ENTITY_SINGULAR[type] ?? type;
  if (log.entityId != null) return `${label} #${log.entityId}`;
  if (log.newVal?.title) return String(log.newVal.title);
  if (log.newVal?.companyName) return String(log.newVal.companyName);
  if (log.newVal?.name) return String(log.newVal.name);
  return label;
}

async function resolveEntityNames(logs) {
  const byType = new Map();
  for (const log of logs) {
    if (log.entityId == null) continue;
    const type = log.entityType === "companies" ? "clients" : log.entityType;
    if (!byType.has(type)) byType.set(type, new Set());
    byType.get(type).add(log.entityId);
  }

  const nameByTypeId = new Map();

  const projectIds = [...(byType.get("projects") ?? [])];
  if (projectIds.length) {
    const rows = await projectsTable.find({ id: { $in: projectIds } }).select("id title").lean();
    for (const r of rows) nameByTypeId.set(`projects:${r.id}`, r.title);
  }

  const clientIds = [...new Set([...(byType.get("clients") ?? []), ...(byType.get("companies") ?? [])])];
  if (clientIds.length) {
    const rows = await clientsTable.find({ id: { $in: clientIds } }).select("id companyName").lean();
    for (const r of rows) nameByTypeId.set(`clients:${r.id}`, r.companyName);
  }

  const ticketIds = [...(byType.get("tickets") ?? [])];
  if (ticketIds.length) {
    const rows = await ticketsTable.find({ id: { $in: ticketIds } }).select("id title").lean();
    for (const r of rows) nameByTypeId.set(`tickets:${r.id}`, r.title);
  }

  const bugIds = [...(byType.get("bugs") ?? [])];
  if (bugIds.length) {
    const rows = await bugsTable.find({ id: { $in: bugIds } }).select("id title bugNumber").lean();
    for (const r of rows) {
      nameByTypeId.set(`bugs:${r.id}`, r.bugNumber ? `${r.bugNumber} — ${r.title}` : r.title);
    }
  }

  const userIds = [...(byType.get("users") ?? [])];
  if (userIds.length) {
    const rows = await usersTable.find({ id: { $in: userIds } }).select("id name").lean();
    for (const r of rows) nameByTypeId.set(`users:${r.id}`, r.name);
  }

  const result = new Map();
  for (const log of logs) {
    const type = log.entityType === "companies" ? "clients" : log.entityType;
    const key = log.entityId != null ? `${type}:${log.entityId}` : null;
    const resolved = key ? nameByTypeId.get(key) : null;
    result.set(log.id, resolved ?? fallbackEntityName(log));
  }
  return result;
}

function baseActivityQuery({ actorId, entityType } = {}) {
  const query = {
    action: { $not: /refresh/i },
  };
  if (entityType) {
    // Explicit area filter may include normally-noisy types (e.g. auth / sign-in).
    query.entityType = String(entityType);
  } else {
    query.entityType = { $nin: [...NOISE_ENTITY_TYPES] };
  }
  if (actorId != null && Number.isFinite(Number(actorId))) {
    query.actorId = Number(actorId);
  }
  return query;
}

async function formatActivityRows(logs) {
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id) => id != null))];
  const actors =
    actorIds.length > 0
      ? await usersTable.find({ id: { $in: actorIds } }).select("id name avatarUrl role").lean()
      : [];
  const actorById = new Map(actors.map((u) => [u.id, u]));
  const entityNames = await resolveEntityNames(logs);

  return logs.map((log) => {
    const actor = log.actorId ? actorById.get(log.actorId) : null;
    return {
      id: log.id,
      actorId: log.actorId ?? null,
      actorName: actor?.name ?? "System",
      actorRole: actor?.role ?? null,
      actorAvatarUrl: actor?.avatarUrl ?? null,
      action: formatActivityAction(log.action, log.entityType, log.newVal),
      rawAction: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? null,
      entityName: entityNames.get(log.id) ?? fallbackEntityName(log),
      timestamp: (log.createdAt ?? new Date()).toISOString(),
    };
  });
}

/**
 * Human-readable recent audit events for the admin dashboard.
 */
async function buildRecentActivity(limit = 12) {
  const raw = await auditLogsTable
    .find(baseActivityQuery())
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 40))
    .lean();

  return formatActivityRows(raw.slice(0, limit));
}

/**
 * Paginated CMS-wide activity feed (admin Activity page).
 */
async function listRecentActivity({
  page = 1,
  limit = 50,
  actorId = null,
  entityType = null,
  q = null,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const query = baseActivityQuery({ actorId, entityType });

  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    const matchedActors = await usersTable
      .find({ name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })
      .select("id")
      .lean();
    const ids = matchedActors.map((u) => u.id);
    if (ids.length === 0) {
      return { items: [], total: 0, page: safePage, limit: safeLimit };
    }
    if (query.actorId != null && !ids.includes(query.actorId)) {
      return { items: [], total: 0, page: safePage, limit: safeLimit };
    }
    query.actorId = { $in: ids };
  }

  const skip = (safePage - 1) * safeLimit;
  const [raw, total] = await Promise.all([
    auditLogsTable.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    auditLogsTable.countDocuments(query),
  ]);

  return {
    items: await formatActivityRows(raw),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

export { buildRecentActivity, listRecentActivity, formatActivityAction };
