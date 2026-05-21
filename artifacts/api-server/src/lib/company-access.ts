import type { Request } from "express";
import {
  projectsTable,
  projectMembersTable,
  clientsTable,
} from "@workspace/db/schema";

export function projectCompanyId(project: { companyId?: number | null; clientId: number }): number {
  return project.companyId ?? project.clientId;
}

export async function getClientCompanyForUser(userId: number) {
  return clientsTable.findOne({ userId });
}

export async function getCompanyAccess(
  req: Request,
  companyId: number,
): Promise<{ allowed: boolean; canManage: boolean; isClient: boolean }> {
  if (!req.user) return { allowed: false, canManage: false, isClient: false };

  const role = req.user.role;
  if (role === "super_admin") {
    return { allowed: true, canManage: true, isClient: false };
  }

  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === companyId;
    return { allowed, canManage: false, isClient: true };
  }

  if (role === "developer" || role === "tester") {
    const projects = await projectsTable
      .find({ $or: [{ companyId }, { clientId: companyId }] })
      .select("id")
      .lean();
    const projectIds = projects.map((p) => p.id);
    if (!projectIds.length) {
      return { allowed: false, canManage: false, isClient: false };
    }
    const member = await projectMembersTable.findOne({
      userId: req.user.id,
      projectId: { $in: projectIds },
    });
    return {
      allowed: !!member,
      canManage: role === "developer",
      isClient: false,
    };
  }

  return { allowed: false, canManage: false, isClient: false };
}

export async function getProjectAccess(
  req: Request,
  projectId: number,
): Promise<{ allowed: boolean; canManage: boolean; isClient: boolean; companyId: number | null }> {
  if (!req.user) {
    return { allowed: false, canManage: false, isClient: false, companyId: null };
  }

  const project = await projectsTable.findOne({ id: projectId });
  if (!project) {
    return { allowed: false, canManage: false, isClient: false, companyId: null };
  }

  const companyId = projectCompanyId(project);
  const role = req.user.role;

  if (role === "super_admin") {
    return { allowed: true, canManage: true, isClient: false, companyId };
  }

  if (role === "client") {
    const company = await getClientCompanyForUser(req.user.id);
    const allowed = !!company && company.id === companyId;
    return { allowed, canManage: false, isClient: true, companyId };
  }

  if (role === "developer" || role === "tester") {
    const member = await projectMembersTable.findOne({ projectId, userId: req.user.id });
    return {
      allowed: !!member,
      canManage: role === "developer",
      isClient: false,
      companyId,
    };
  }

  return { allowed: false, canManage: false, isClient: false, companyId };
}

/** Accept companyId or legacy clientId in request bodies */
export function resolveCompanyIdFromBody(body: {
  companyId?: number;
  clientId?: number;
}): number | null {
  if (body.companyId != null) return Number(body.companyId);
  if (body.clientId != null) return Number(body.clientId);
  return null;
}
