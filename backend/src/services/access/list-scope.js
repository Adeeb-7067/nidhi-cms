/**
 * Row-level list scoping for authenticated users.
 * `null` = unrestricted (caller may query without id filter).
 * `[]` = no access (force empty results).
 */
import {
  projectsTable,
  projectMembersTable,
  clientsTable,
} from "../../models/schema/index.js";
import { isDevPortalStaffRole } from "../../constants/user-roles.js";
import { findClientCompanyForUser } from "../client-team.js";
import { getScopedDigitalUserAccess } from "../marketing/helpers.js";
import { bdeCustomerOwnershipFilter } from "../../utils/sales-bde-customer-scope.js";

/** Roles that may list all companies (pickers / ops). Digital is project-scoped. */
export function canListAllCompanies(role) {
  return role === "super_admin" || role === "hr" || role === "finance";
}

/**
 * Finance needs org project picker for expenses/invoices.
 * Super admin sees everything. Everyone else is membership/company scoped.
 */
export function canListAllProjects(role) {
  return role === "super_admin" || role === "finance";
}

export async function getAccessibleProjectIds(user) {
  if (!user?.id) return [];
  const role = user.role;
  if (canListAllProjects(role)) return null;

  if (role === "digital") {
    const access = await getScopedDigitalUserAccess(user);
    return access.projectIds?.length ? access.projectIds : [];
  }

  if (role === "client") {
    const company = await findClientCompanyForUser(user.id);
    if (!company) return [];
    const rows = await projectsTable
      .find({ $or: [{ companyId: company.id }, { clientId: company.id }] })
      .select({ id: 1 })
      .lean();
    return rows.map((r) => r.id);
  }

  if (isDevPortalStaffRole(role) || role === "bde" || role === "hr") {
    const memberRows = await projectMembersTable.find({ userId: user.id }).select({ projectId: 1 }).lean();
    return memberRows.map((m) => m.projectId);
  }

  // Unknown / custom roles: deny by default
  return [];
}

export async function getAccessibleCompanyIds(user) {
  if (!user?.id) return [];
  const role = user.role;
  if (canListAllCompanies(role)) return null;

  if (role === "digital") {
    const access = await getScopedDigitalUserAccess(user);
    return access.companyIds?.length ? access.companyIds : [];
  }

  if (role === "client") {
    const company = await findClientCompanyForUser(user.id);
    return company ? [company.id] : [];
  }

  if (role === "bde") {
    const rows = await clientsTable.find(bdeCustomerOwnershipFilter(user.id)).select({ id: 1 }).lean();
    return rows.map((c) => c.id);
  }

  if (isDevPortalStaffRole(role)) {
    const memberRows = await projectMembersTable.find({ userId: user.id }).select({ projectId: 1 }).lean();
    const projectIds = memberRows.map((m) => m.projectId);
    if (!projectIds.length) return [];
    const projects = await projectsTable
      .find({ id: { $in: projectIds } })
      .select({ companyId: 1, clientId: 1 })
      .lean();
    return [
      ...new Set(
        projects.map((p) => p.companyId ?? p.clientId).filter((id) => id != null),
      ),
    ];
  }

  return [];
}

/** Apply id ∈ scope to a Mongo filter. Returns false if result must be empty. */
export function applyIdScope(query, field, ids) {
  if (ids === null) return true;
  if (!ids.length) return false;
  const existing = query[field];
  if (existing != null && typeof existing === "object" && existing.$in) {
    const allowed = new Set(ids);
    query[field] = { $in: existing.$in.filter((id) => allowed.has(id)) };
    return query[field].$in.length > 0;
  }
  if (existing != null && typeof existing === "number") {
    if (!ids.includes(existing)) return false;
    return true;
  }
  query[field] = { $in: ids };
  return true;
}
