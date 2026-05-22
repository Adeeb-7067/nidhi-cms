import {
  projectMembersTable,
  usersTable,
  clientsTable
} from "@/models/schema";
import { projectCompanyId } from "@/services/access/company-access";
async function computeCompletionPct(projectId) {
  const members = await projectMembersTable.find({ projectId });
  if (!members.length) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const m of members) {
    const weight = m.subType === "Project Manager" ? 1.5 : 1;
    totalWeight += weight;
    weightedSum += (m.completionPct || 0) * weight;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}
async function formatProject(project, options) {
  const companyId = projectCompanyId(project);
  const company = await clientsTable.findOne({ id: companyId });
  let pmName = null;
  if (project.pmId) {
    const pm = await usersTable.findOne({ id: project.pmId });
    pmName = pm?.name ?? null;
  }
  const memberCount = await projectMembersTable.countDocuments({ projectId: project.id });
  const computedPct = await computeCompletionPct(project.id);
  const companyName = company?.companyName ?? "Unknown";
  let teamMembers = [];
  if (options?.includeTeam) {
    const memberRows = await projectMembersTable.find({ projectId: project.id }).limit(12);
    teamMembers = await Promise.all(
      memberRows.map(async (m) => {
        const user = await usersTable.findOne({ id: m.userId });
        return {
          userId: m.userId,
          name: user?.name ?? "Unknown",
          subType: m.subType ?? null,
          avatarUrl: user?.avatarUrl ?? null
        };
      })
    );
  }
  return {
    id: project.id,
    name: project.name,
    companyId,
    companyName,
    clientId: project.clientId,
    clientName: companyName,
    companyContactPerson: company?.contactPerson ?? null,
    companyEmail: company?.email ?? null,
    companyPhone: company?.phone ?? null,
    pmId: project.pmId,
    pmName,
    description: project.description,
    status: project.status,
    type: project.type ?? (project.status === "maintenance" ? "maintenance" : "development"),
    priority: project.priority,
    startDate: project.startDate ? new Date(project.startDate).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
    deadline: project.deadline ? new Date(project.deadline).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
    techStack: project.techStack,
    figmaUrl: project.figmaUrl,
    repoUrl: project.repoUrl,
    stagingUrl: project.stagingUrl,
    productionUrl: project.productionUrl,
    adminUrl: project.adminUrl,
    websiteUrl: project.websiteUrl,
    postmanJson: project.postmanJson,
    completionPct: project.completionOverride ?? computedPct,
    completionOverride: project.completionOverride,
    memberCount,
    teamMembers,
    createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
  };
}
export {
  formatProject
};
