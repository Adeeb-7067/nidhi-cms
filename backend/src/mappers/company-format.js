import { projectsTable, ticketsTable, auditLogsTable } from "@/models/schema";
async function formatCompanyRecord(client) {
  const companyId = client.id;
  const projectIds = await projectIdsForCompany(companyId);
  const companyProjectFilter = { $or: [{ companyId }, { clientId: companyId }] };
  const [activeProjectCount, totalProjects, openTickets] = await Promise.all([
    projectsTable.countDocuments({ ...companyProjectFilter, status: "in_progress" }),
    projectsTable.countDocuments(companyProjectFilter),
    ticketsTable.countDocuments({
      status: { $in: ["open", "pending"] },
      $or: [
        { companyId },
        ...projectIds.length ? [{ projectId: { $in: projectIds } }] : []
      ]
    })
  ]);
  const base = {
    id: client.id,
    companyId: client.id,
    companyName: client.companyName,
    companyCode: client.companyCode ?? null,
    contactPerson: client.contactPerson,
    primaryContact: client.primaryContact ?? client.contactPerson,
    contacts: client.contacts ?? [],
    email: client.email,
    phone: client.phone ?? null,
    address: client.address ?? null,
    gstNumber: client.gstNumber ?? client.businessId ?? null,
    logoUrl: client.logoUrl ?? client.logo ?? null,
    logo: client.logo ?? client.logoUrl ?? null,
    industry: client.industry ?? null,
    website: client.website ?? null,
    documents: client.documents ?? [],
    tier: client.tier ?? "Standard",
    status: client.status,
    portalLogin: client.portalLogin,
    clientSince: client.clientSince.toISOString(),
    userId: client.userId ?? null,
    createdBy: client.createdBy ?? null,
    activeProjectCount,
    totalProjects,
    openTickets,
    // Legacy aliases
    clientId: client.id
  };
  return base;
}
async function projectIdsForCompany(companyId) {
  const rows = await projectsTable.find({ $or: [{ companyId }, { clientId: companyId }] }).select("id").lean();
  return rows.map((p) => p.id);
}
async function getCompanyActivity(companyId, limit = 20) {
  const projectIds = await projectIdsForCompany(companyId);
  const logs = await auditLogsTable.find({
    $or: [
      { entityType: "clients", entityId: companyId },
      { entityType: "companies", entityId: companyId },
      ...projectIds.length ? [{ entityType: "projects", entityId: { $in: projectIds } }] : []
    ]
  }).sort({ createdAt: -1 }).limit(limit).lean();
  return logs;
}
export {
  formatCompanyRecord,
  getCompanyActivity
};
