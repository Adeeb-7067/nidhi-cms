import {
  auditLogsTable,
  usersTable,
  projectsTable,
  clientsTable,
  ticketsTable,
  bugsTable,
} from "../models/schema/index.js";

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

/**
 * Human-readable recent audit events for the admin dashboard.
 */
async function buildRecentActivity(limit = 12) {
  const raw = await auditLogsTable
    .find({
      entityType: { $nin: [...NOISE_ENTITY_TYPES] },
    })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit * 3, 40))
    .lean();

  const logs = raw.filter((log) => {
    if (log.action?.includes("refresh")) return false;
    return true;
  });

  const slice = logs.slice(0, limit);
  const actorIds = [...new Set(slice.map((l) => l.actorId).filter((id) => id != null))];
  const actors =
    actorIds.length > 0
      ? await usersTable.find({ id: { $in: actorIds } }).select("id name avatarUrl").lean()
      : [];
  const actorById = new Map(actors.map((u) => [u.id, u]));
  const entityNames = await resolveEntityNames(slice);

  return slice.map((log) => {
    const actor = log.actorId ? actorById.get(log.actorId) : null;
    return {
      id: log.id,
      actorName: actor?.name ?? "System",
      actorAvatarUrl: actor?.avatarUrl ?? null,
      action: formatActivityAction(log.action, log.entityType, log.newVal),
      entityType: log.entityType,
      entityName: entityNames.get(log.id) ?? fallbackEntityName(log),
      timestamp: (log.createdAt ?? new Date()).toISOString(),
    };
  });
}

export { buildRecentActivity, formatActivityAction };
