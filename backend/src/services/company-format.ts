import { projectsTable, ticketsTable, auditLogsTable } from "@/models/schema";

export async function formatCompanyRecord(client: {
  id: number;
  companyName: string;
  companyCode?: string | null;
  contactPerson: string;
  primaryContact?: string | null;
  contacts?: unknown[];
  email: string;
  phone?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  businessId?: string | null;
  logoUrl?: string | null;
  logo?: string | null;
  industry?: string | null;
  website?: string | null;
  documents?: unknown[];
  tier?: string;
  status: string;
  portalLogin: boolean;
  clientSince: Date;
  userId?: number | null;
  createdBy?: number | null;
}) {
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
        ...(projectIds.length ? [{ projectId: { $in: projectIds } }] : []),
      ],
    }),
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
    clientId: client.id,
  };

  return base;
}

async function projectIdsForCompany(companyId: number): Promise<number[]> {
  const rows = await projectsTable
    .find({ $or: [{ companyId }, { clientId: companyId }] })
    .select("id")
    .lean();
  return rows.map((p) => p.id);
}

export async function getCompanyActivity(companyId: number, limit = 20) {
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
