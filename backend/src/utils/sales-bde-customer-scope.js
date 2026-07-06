/** BDE customer ownership rules for Sales CRM (list, detail, billing scope). */

import { notFound } from "./route-errors.js";

export function isSalesAdminRole(role) {
  return role === "super_admin" || role === "hr";
}

export function bdeCustomerOwnershipFilter(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    return { id: -1 };
  }
  return {
    $or: [{ assignedAdminId: id }, { createdBy: id }],
  };
}

export function bdeOwnsCustomer(client, userId) {
  const id = Number(userId);
  if (!client || !Number.isFinite(id)) return false;
  return client.assignedAdminId === id || client.createdBy === id;
}

export function resolveCustomerAssignedAdminId({
  userRole,
  userId,
  bodyAssignedAdminId,
  leadAssignedTo,
}) {
  if (userRole === "bde") {
    const id = Number(userId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  if (bodyAssignedAdminId != null) {
    const id = Number(bodyAssignedAdminId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  if (leadAssignedTo != null) {
    const id = Number(leadAssignedTo);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

export async function findBdeOwnedCustomerIds(clientsTable, userId) {
  const rows = await clientsTable
    .find(bdeCustomerOwnershipFilter(userId))
    .select({ id: 1 })
    .lean();
  return rows.map((c) => c.id);
}

/** Scoped filters for BDE dashboard, reports, and analytics. */
export async function buildBdeSalesScope(clientsTable, userId) {
  const id = Number(userId);
  const myCustomerIds = await findBdeOwnedCustomerIds(clientsTable, userId);
  return {
    leadFilter: { $or: [{ assignedTo: id }, { createdBy: id }] },
    proposalFilter: { assignedTo: id },
    followUpFilter: { executiveId: id },
    paymentFilter: { recordedBy: id },
    customerFilter: { ...bdeCustomerOwnershipFilter(userId), status: "active" },
    invoiceFilter: { customerId: { $in: myCustomerIds.length ? myCustomerIds : [-1] } },
    myCustomerIds,
  };
}

export async function assertBdeOwnsCustomerById(clientsTable, user, customerId, label = "Customer") {
  if (user?.role !== "bde") return;
  const client = await clientsTable.findOne({ id: Number(customerId) }).lean();
  if (!client || !bdeOwnsCustomer(client, user.id)) {
    notFound(label);
  }
}
