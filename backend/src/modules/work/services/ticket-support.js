import { ticketsTable, usersTable } from "../../../models/schema/index.js";
import { notFound, forbidden } from "../../../utils/route-errors.js";
import { devPortalStaffRoles, isDevPortalStaffRole } from "../../../constants/user-roles.js";
import { userHasPermission } from "../../identity/services/permissions.service.js";
import { getAccessibleProjectIds } from "../../access/services/list-scope.js";

export const TICKET_AUDIENCES = ["client", "staff"];
const STAFF_CREATOR_ROLES = new Set([...devPortalStaffRoles, "super_admin"]);

export function ticketAudienceFromRole(role) {
  return role === "client" ? "client" : "staff";
}

export function isStaffTicketRole(role) {
  return isDevPortalStaffRole(role);
}

const OPEN_TICKET_STATUSES = ["open", "pending"];

async function canViewAllTickets(user) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return userHasPermission(user.id, "admin_tickets", "view");
}

/** Role-scoped Mongo filter for GET /tickets list queries. */
export async function buildTicketListFilter(user, { audience } = {}) {
  const and = [];

  if (user.role === "client") {
    and.push({ creatorId: user.id });
    return and;
  }

  if (await canViewAllTickets(user)) {
    if (audience && audience !== "all") {
      const audienceFilter = await buildTicketAudienceCondition(audience);
      if (audienceFilter) and.push(audienceFilter);
    }
    return and;
  }

  // Creator / assignee, or tickets on accessible projects (Hybrid: no org-wide leak)
  const or = [{ creatorId: user.id }, { assignedTo: user.id }];
  const projectIds = await getAccessibleProjectIds(user);
  if (projectIds === null) {
    // Unrestricted project axis (finance) — still not org-wide tickets; keep self only
  } else if (projectIds.length) {
    or.push({ projectId: { $in: projectIds } });
  }
  and.push({ $or: or });
  return and;
}

/** Open ticket count for workspace KPIs — matches list visibility per role. */
export async function buildOpenTicketCountFilter(user) {
  const statusFilter = { status: { $in: OPEN_TICKET_STATUSES } };

  if (await canViewAllTickets(user)) return statusFilter;

  if (user.role === "client") {
    return { ...statusFilter, creatorId: user.id };
  }

  const or = [{ creatorId: user.id }, { assignedTo: user.id }];
  const projectIds = await getAccessibleProjectIds(user);
  if (projectIds?.length) {
    or.push({ projectId: { $in: projectIds } });
  }
  return { ...statusFilter, $or: or };
}

/** Mongo filter for super-admin Client vs Dev/QA tabs (includes legacy tickets without audience). */
export async function buildTicketAudienceCondition(audience) {
  if (audience !== "client" && audience !== "staff") return null;

  const clientUsers = await usersTable.find({ role: "client" }, { id: 1 }).lean();
  const clientIds = clientUsers.map((u) => u.id);

  if (audience === "client") {
    const or = [{ audience: "client" }];
    if (clientIds.length) {
      or.push({ audience: { $exists: false }, creatorId: { $in: clientIds } });
      or.push({ audience: null, creatorId: { $in: clientIds } });
    }
    return { $or: or };
  }

  const or = [{ audience: "staff" }];
  if (clientIds.length) {
    or.push({ audience: { $exists: false }, creatorId: { $nin: clientIds } });
    or.push({ audience: null, creatorId: { $nin: clientIds } });
  } else {
    or.push({ audience: { $exists: false } });
    or.push({ audience: null });
  }
  return { $or: or };
}

export function isStaffRole(role) {
  return STAFF_CREATOR_ROLES.has(role);
}

export async function loadTicketOrThrow(ticketId) {
  const ticket = await ticketsTable.findOne({ id: ticketId }).lean();
  if (!ticket) notFound("Ticket");
  return ticket;
}

export async function userCanAccessTicket(user, ticket) {
  if (await canViewAllTickets(user)) return true;
  if (ticket.creatorId === user.id) return true;
  if (ticket.assignedTo === user.id) return true;
  if (ticket.projectId != null) {
    const projectIds = await getAccessibleProjectIds(user);
    if (projectIds === null) return false;
    if (projectIds.includes(Number(ticket.projectId))) return true;
  }
  return false;
}

export async function assertTicketAccess(user, ticketId) {
  const ticket = await loadTicketOrThrow(ticketId);
  if (!(await userCanAccessTicket(user, ticket))) forbidden("You cannot access this ticket.");
  return ticket;
}

export async function getTicketParticipantIds(ticket, excludeUserId) {
  const ids = new Set([ticket.creatorId, ticket.assignedTo].filter(Boolean));
  if (excludeUserId) ids.delete(excludeUserId);
  const admins = await usersTable
    .find({ role: "super_admin", status: "active" }, { id: 1 })
    .lean();
  admins.forEach((a) => ids.add(a.id));
  return [...ids];
}

/** open → pending when support staff engages in chat */
export function nextStatusAfterReply(ticket, replierRole) {
  if (ticket.status === "resolved" || ticket.status === "closed") return null;
  if (replierRole === "super_admin" && ticket.status === "open") return "pending";
  if (replierRole === "super_admin") return null;
  if (ticket.status === "open") return "pending";
  return null;
}
