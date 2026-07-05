import { projectsTable, ticketsTable, auditLogsTable } from "../models/schema/index.js";

function effectiveCompanyId(project) {
  return project.companyId ?? project.clientId;
}

function mapCompanyRecord(client, counts) {
  return {
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
    directConversationId: client.directConversationId ?? null,
    customerType: client.customerType ?? "corporate",
    createdBy: client.createdBy ?? null,
    activeProjectCount: counts.activeProjectCount,
    totalProjects: counts.totalProjects,
    openTickets: counts.openTickets,
    clientId: client.id,
  };
}

/** Batch-format clients — one projects query + one tickets query instead of 4×N. */
async function formatCompanyRecordsBatch(clients) {
  if (!clients.length) return [];

  const companyIds = clients.map((c) => c.id);
  const companyIdSet = new Set(companyIds);

  const projects = await projectsTable
    .find({
      $or: [{ companyId: { $in: companyIds } }, { clientId: { $in: companyIds } }],
    })
    .select({ id: 1, companyId: 1, clientId: 1, status: 1 })
    .lean();

  const totalByCompany = new Map(companyIds.map((id) => [id, 0]));
  const activeByCompany = new Map(companyIds.map((id) => [id, 0]));
  const projectToCompany = new Map();
  const allProjectIds = [];

  for (const p of projects) {
    const cid = effectiveCompanyId(p);
    if (!companyIdSet.has(cid)) continue;
    allProjectIds.push(p.id);
    projectToCompany.set(p.id, cid);
    totalByCompany.set(cid, (totalByCompany.get(cid) ?? 0) + 1);
    if (p.status === "in_progress") {
      activeByCompany.set(cid, (activeByCompany.get(cid) ?? 0) + 1);
    }
  }

  const openTicketsByCompany = new Map(companyIds.map((id) => [id, 0]));
  if (companyIds.length) {
    const ticketOr = [{ companyId: { $in: companyIds } }];
    if (allProjectIds.length) ticketOr.push({ projectId: { $in: allProjectIds } });

    const openTickets = await ticketsTable
      .find({ status: { $in: ["open", "pending"] }, $or: ticketOr })
      .select({ companyId: 1, projectId: 1 })
      .lean();

    for (const t of openTickets) {
      const cid = t.companyId ?? (t.projectId ? projectToCompany.get(t.projectId) : null);
      if (cid != null) {
        openTicketsByCompany.set(cid, (openTicketsByCompany.get(cid) ?? 0) + 1);
      }
    }
  }

  return clients.map((client) =>
    mapCompanyRecord(client, {
      activeProjectCount: activeByCompany.get(client.id) ?? 0,
      totalProjects: totalByCompany.get(client.id) ?? 0,
      openTickets: openTicketsByCompany.get(client.id) ?? 0,
    }),
  );
}

async function formatCompanyRecord(client) {
  const [row] = await formatCompanyRecordsBatch([client]);
  return row;
}

async function projectIdsForCompany(companyId) {
  const rows = await projectsTable
    .find({ $or: [{ companyId }, { clientId: companyId }] })
    .select("id")
    .lean();
  return rows.map((p) => p.id);
}

async function getCompanyActivity(companyId, limit = 20) {
  const projectIds = await projectIdsForCompany(companyId);
  const logs = await auditLogsTable
    .find({
      $or: [
        { entityType: "clients", entityId: companyId },
        { entityType: "companies", entityId: companyId },
        ...(projectIds.length
          ? [{ entityType: "projects", entityId: { $in: projectIds } }]
          : []),
      ],
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return logs;
}

export {
  formatCompanyRecord,
  formatCompanyRecordsBatch,
  getCompanyActivity,
};
