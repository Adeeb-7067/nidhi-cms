/** Map unified Clients record to sales customer API shape. */
export function resolveCustomerCreatorUserId(client) {
  const createdBy = Number(client?.createdBy);
  if (Number.isFinite(createdBy) && createdBy > 0) return createdBy;
  const assignedAdminId = Number(client?.assignedAdminId);
  if (Number.isFinite(assignedAdminId) && assignedAdminId > 0) return assignedAdminId;
  return null;
}

export function formatClientAsCustomer(client, financials = {}) {
  if (!client) return null;
  return {
    id: client.id,
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone ?? null,
    status: client.status,
    type: client.customerType ?? "corporate",
    location: client.address ?? null,
    gstin: client.gstNumber ?? null,
    website: client.website ?? null,
    leadId: client.leadId ?? null,
    clientId: client.id,
    portalUserId: client.userId ?? null,
    portalLogin: Boolean(client.portalLogin),
    directConversationId: client.directConversationId ?? null,
    assignedAdminId: client.assignedAdminId ?? null,
    createdBy: client.createdBy ?? null,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    totalSales: financials.totalSales ?? 0,
    totalCollected: financials.totalCollected ?? 0,
    outstanding: financials.outstanding ?? 0,
    hasPayments: Boolean(financials.hasPayments),
  };
}

/** Map sales customer API updates onto Clients document fields. */
export function customerUpdatesToClientSet(updates) {
  const set = {};
  if (updates.companyName !== undefined) set.companyName = updates.companyName;
  if (updates.contactPerson !== undefined) set.contactPerson = updates.contactPerson;
  if (updates.email !== undefined) set.email = updates.email;
  if (updates.phone !== undefined) set.phone = updates.phone;
  if (updates.status !== undefined) set.status = updates.status;
  if (updates.type !== undefined) set.customerType = updates.type;
  if (updates.location !== undefined) set.address = updates.location;
  if (updates.gstin !== undefined) set.gstNumber = updates.gstin;
  if (updates.website !== undefined) set.website = updates.website;
  if (updates.assignedAdminId !== undefined) set.assignedAdminId = updates.assignedAdminId;
  if (updates.leadId !== undefined) set.leadId = updates.leadId;
  return set;
}

/** Proposal / email helpers — client row with customer field names. */
export function clientAsProposalCustomer(client) {
  if (!client) return null;
  return {
    id: client.id,
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone ?? null,
    location: client.address ?? null,
    gstin: client.gstNumber ?? null,
  };
}
