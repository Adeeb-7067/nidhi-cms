import {
  clientsTable,
  clientTeamMembersTable,
  clientTeamActivityTable,
  usersTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import {
  CLIENT_SECTION_LABELS,
  adminPermissions,
  isValidLevel,
  isValidSection,
  permissionGranted,
  sanitisePermissions,
} from "../../../constants/client-team.js";
import { HttpError } from "../../../lib/http-error.js";
import { logger } from "../../../lib/logger.js";

/**
 * Resolve the client-company context for an authenticated user.
 *
 * Returns `null` for anyone who is neither a primary client contact nor an
 * active team member. The returned shape is intentionally generic so it can
 * be cached on `req` and consumed by every downstream check.
 *
 * @param {{ id: number, role: string } | null | undefined} user
 * @returns {Promise<null | {
 *   companyId: number,
 *   companyName: string,
 *   isAdmin: boolean,
 *   memberId: number | null,
 *   memberStatus: "active" | "pending",
 *   permissions: Record<string, string>
 * }>}
 */
export async function getClientContextForUser(user) {
  if (!user || user.role !== "client") return null;

  const adminCompany = await clientsTable
    .findOne({ userId: user.id })
    .select({ id: 1, companyName: 1, status: 1 })
    .lean();

  if (adminCompany) {
    return {
      companyId: adminCompany.id,
      companyName: adminCompany.companyName,
      isAdmin: true,
      memberId: null,
      memberStatus: "active",
      permissions: adminPermissions(),
    };
  }

  // Include `pending` members so the very first login can resolve their
  // company and auto-promote them to `active`. Only `inactive` is excluded.
  const member = await clientTeamMembersTable
    .findOne({ userId: user.id, status: { $ne: "inactive" } })
    .lean();
  if (!member) return null;

  const company = await clientsTable
    .findOne({ id: member.clientCompanyId })
    .select({ id: 1, companyName: 1, status: 1 })
    .lean();
  if (!company) return null;

  return {
    companyId: company.id,
    companyName: company.companyName,
    isAdmin: false,
    memberId: member.id,
    memberStatus: member.status,
    permissions: sanitisePermissions(member.permissions),
  };
}

/**
 * Memoise the client context on `req` so repeated middleware calls don't
 * trigger extra database lookups within a single request.
 */
export async function loadClientContext(req) {
  if (req._clientContextLoaded) return req.clientContext ?? null;
  const ctx = await getClientContextForUser(req.user);
  req.clientContext = ctx;
  req._clientContextLoaded = true;
  return ctx;
}

export function clientContextHasPermission(ctx, section, level) {
  if (!ctx) return false;
  if (ctx.isAdmin) return true;
  return permissionGranted(ctx.permissions?.[section], level);
}

/**
 * Inline permission check usable inside controllers. Non-client roles pass
 * through (they're guarded by their own role middleware). Client users get
 * a 403 if they don't satisfy the required section/level — including any
 * member with `none` for that section.
 *
 * Use this when a single endpoint serves multiple roles (e.g. /comments)
 * and a route-level middleware would over-restrict non-client traffic.
 */
export async function assertClientPermission(req, section, level = "view") {
  if (!isValidSection(section)) {
    throw new Error(`assertClientPermission: unknown section "${section}"`);
  }
  if (!isValidLevel(level)) {
    throw new Error(`assertClientPermission: unknown level "${level}"`);
  }
  if (!req.user) {
    throw new HttpError(401, "Please sign in to continue.", { code: "UNAUTHORIZED" });
  }
  // Only enforce on client accounts; staff/admin roles have their own gates.
  if (req.user.role !== "client") return;

  const ctx = await loadClientContext(req);
  if (clientContextHasPermission(ctx, section, level)) return;

  const sectionLabel = CLIENT_SECTION_LABELS[section] ?? section;
  throw new HttpError(
    403,
    `Your team account does not have ${level} access to ${sectionLabel}. Contact your Client Admin.`,
    { code: "FORBIDDEN", field: section },
  );
}

/**
 * Append a row to `client_team_activity`. Always non-throwing — activity
 * logging must never break a successful user request.
 */
export async function recordClientTeamActivity({
  clientCompanyId,
  actor,
  isAdmin,
  action,
  section,
  entityType,
  entityId,
  summary,
  metadata,
  ipAddress,
}) {
  if (!clientCompanyId || !action) return;
  try {
    const id = await getNextSequence("client_team_activity");
    await clientTeamActivityTable.create({
      id,
      clientCompanyId,
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      actorIsAdmin: Boolean(isAdmin),
      action,
      section: section ?? null,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      summary: summary ?? null,
      metadata: metadata ?? null,
      ipAddress: ipAddress ?? null,
    });
  } catch (err) {
    logger.warn({ err, action, clientCompanyId }, "Failed to record client team activity");
  }
}

/**
 * Fire-and-forget helper for places where the caller already has a `req`
 * and just needs to log "this client did X". Returns immediately if the
 * actor is not part of any client company.
 */
export async function recordClientTeamActivityFromRequest(req, payload) {
  const ctx = await loadClientContext(req);
  if (!ctx) return;
  await recordClientTeamActivity({
    clientCompanyId: ctx.companyId,
    actor: req.user,
    isAdmin: ctx.isAdmin,
    ipAddress: req.ip ?? null,
    ...payload,
  });
}

/**
 * Lookup that powers existing project/company access checks (see
 * services/access/company-access.js). Returns the parent client company for
 * the primary contact OR for any active team member.
 */
export async function findClientCompanyForUser(userId) {
  if (!userId) return null;
  const direct = await clientsTable.findOne({ userId });
  if (direct) return direct;

  // Match `pending` AND `active` so a member who hasn't completed their
  // first sign-in yet still resolves to their parent company. Only fully
  // deactivated members are denied here.
  const member = await clientTeamMembersTable
    .findOne({ userId, status: { $ne: "inactive" } })
    .lean();
  if (!member) return null;
  return clientsTable.findOne({ id: member.clientCompanyId });
}

/**
 * Return every user ID that belongs to a given client company — primary
 * contact PLUS every team member whose account is still usable (active or
 * pending first-login). Used by realtime/notification fan-out so team
 * members are not silently excluded from their own company's discussions.
 */
export async function getClientCompanyUserIds(companyId) {
  if (companyId == null) return [];
  const ids = new Set();

  const company = await clientsTable
    .findOne({ id: companyId }, { userId: 1 })
    .lean();
  if (company?.userId != null) ids.add(company.userId);

  const members = await clientTeamMembersTable
    .find({ clientCompanyId: companyId, status: { $ne: "inactive" } }, { userId: 1 })
    .lean();
  for (const m of members) {
    if (m.userId != null) ids.add(m.userId);
  }
  return Array.from(ids);
}

/**
 * Resolve the human-readable name & avatar for an actor row when the cached
 * `req.user` doesn't have it. Used by activity-log responses.
 */
export async function hydrateActorMeta(actorIds) {
  if (!actorIds.length) return new Map();
  const rows = await usersTable
    .find({ id: { $in: actorIds } }, { id: 1, name: 1, email: 1, avatarUrl: 1 })
    .lean();
  return new Map(rows.map((r) => [r.id, r]));
}
