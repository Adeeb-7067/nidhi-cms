import {
  projectMembersTable,
  usersTable,
  clientsTable,
} from "../models/schema/index.js";
import { IdLookupCache } from "../lib/lookup-cache.js";
import { projectCompanyId } from "../services/access/company-access.js";

function computeWeightedCompletion(members) {
  if (!members?.length) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const m of members) {
    const weight = m.subType === "Project Manager" ? 1.5 : 1;
    totalWeight += weight;
    weightedSum += (m.completionPct || 0) * weight;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

async function loadProjectListMeta(projectIds) {
  const memberCountByProject = new Map();
  const completionByProject = new Map();
  const membersByProject = new Map();

  for (const pid of projectIds) {
    memberCountByProject.set(pid, 0);
    completionByProject.set(pid, 0);
    membersByProject.set(pid, []);
  }

  if (!projectIds.length) {
    return { memberCountByProject, completionByProject, membersByProject };
  }

  const members = await projectMembersTable
    .find({ projectId: { $in: projectIds } })
    .lean()
    .exec();

  for (const m of members) {
    memberCountByProject.set(m.projectId, (memberCountByProject.get(m.projectId) ?? 0) + 1);
    membersByProject.get(m.projectId)?.push(m);
  }

  for (const [pid, mems] of membersByProject) {
    completionByProject.set(pid, computeWeightedCompletion(mems));
  }

  return { memberCountByProject, completionByProject, membersByProject };
}

function mapProjectRow(project, ctx) {
  const companyId = projectCompanyId(project);
  const company = ctx.companies.get(companyId);
  const companyName = company?.companyName ?? "Unknown";
  const computedPct = ctx.completionByProject.get(project.id) ?? 0;

  return {
    id: project.id,
    name: project.name,
    logoUrl: project.logoUrl ?? null,
    companyId,
    companyName,
    clientId: project.clientId,
    clientName: companyName,
    companyContactPerson: company?.contactPerson ?? null,
    companyEmail: company?.email ?? null,
    companyPhone: company?.phone ?? null,
    pmId: project.pmId,
    pmName: project.pmId ? (ctx.pms.get(project.pmId)?.name ?? null) : null,
    description: project.description,
    status: project.status,
    type: project.type ?? (project.status === "maintenance" ? "maintenance" : "development"),
    priority: project.priority,
    startDate: project.startDate
      ? new Date(project.startDate).toISOString()
      : new Date().toISOString(),
    deadline: project.deadline
      ? new Date(project.deadline).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    techStack: project.techStack,
    digitalServices: project.digitalServices ?? {},
    socialLinks: project.socialLinks ?? {},
    figmaUrl: project.figmaUrl,
    repoUrl: project.repoUrl,
    stagingUrl: project.stagingUrl,
    productionUrl: project.productionUrl,
    adminUrl: project.adminUrl,
    websiteUrl: project.websiteUrl,
    postmanJson: project.postmanJson,
    completionPct: project.completionOverride ?? computedPct,
    completionOverride: project.completionOverride,
    memberCount: ctx.memberCountByProject.get(project.id) ?? 0,
    teamMembers: ctx.teamByProject.get(project.id) ?? [],
    createdAt: project.createdAt
      ? new Date(project.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

/** Batch-format project lists — avoids N+1 DB round-trips per row. */
async function formatProjectList(projects, options = {}) {
  if (!projects.length) return [];

  const projectIds = projects.map((p) => p.id);
  const companyIds = [...new Set(projects.map((p) => projectCompanyId(p)).filter(Boolean))];
  const pmIds = [...new Set(projects.map((p) => p.pmId).filter(Boolean))];

  const companies = new IdLookupCache(async (ids) =>
    clientsTable.find({ id: { $in: ids } }).lean().exec(),
  );
  const pms = new IdLookupCache(async (ids) =>
    usersTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec(),
  );
  const users = new IdLookupCache(async (ids) =>
    usersTable
      .find({ id: { $in: ids } }, { id: 1, name: 1, avatarUrl: 1 })
      .lean()
      .exec(),
  );

  const { memberCountByProject, completionByProject, membersByProject } =
    await loadProjectListMeta(projectIds);

  const teamByProject = new Map();
  if (options.includeTeam) {
    const userIds = new Set();
    for (const pid of projectIds) {
      const mems = (membersByProject.get(pid) ?? []).slice(0, 12);
      for (const m of mems) userIds.add(m.userId);
    }
    await users.preload([...userIds]);
    for (const pid of projectIds) {
      const teamMembers = (membersByProject.get(pid) ?? []).slice(0, 12).map((m) => ({
        userId: m.userId,
        name: users.get(m.userId)?.name ?? "Unknown",
        subType: m.subType ?? null,
        avatarUrl: users.get(m.userId)?.avatarUrl ?? null,
      }));
      teamByProject.set(pid, teamMembers);
    }
  }

  await Promise.all([companies.preload(companyIds), pms.preload(pmIds)]);

  const ctx = {
    companies,
    pms,
    memberCountByProject,
    completionByProject,
    teamByProject,
  };

  return projects.map((p) => mapProjectRow(p, ctx));
}

async function computeCompletionPct(projectId) {
  const members = await projectMembersTable.find({ projectId }).lean().exec();
  return computeWeightedCompletion(members);
}

async function formatProject(project, options) {
  const [row] = await formatProjectList([project], options);
  return row;
}

export { formatProject, formatProjectList };
