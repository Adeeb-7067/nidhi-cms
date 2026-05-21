import type { Request } from "express";
import { getCompanyAccess } from "@/services/company-access";
import { getProjectAccess } from "@/services/inventory-access";
import { HttpError } from "@/lib/http-error";

export async function assertCompanyAccess(
  req: Request,
  companyId: number,
  options?: { allowSuperAdmin?: boolean },
): Promise<void> {
  const access = await getCompanyAccess(req, companyId);
  const allowSuperAdmin = options?.allowSuperAdmin !== false;
  if (!access.allowed && !(allowSuperAdmin && req.user?.role === "super_admin")) {
    throw new HttpError(
      403,
      "You do not have access to this company. Contact your administrator if you need access.",
      { code: "FORBIDDEN" },
    );
  }
}

export async function assertProjectAccess(
  req: Request,
  projectId: number,
  options?: { needManage?: boolean },
): Promise<{ isClient: boolean; canManage: boolean }> {
  const access = await getProjectAccess(req, projectId);
  if (!access.allowed) {
    throw new HttpError(
      403,
      "You do not have access to this project.",
      { code: "FORBIDDEN" },
    );
  }
  if (options?.needManage && !access.canManage && req.user?.role !== "super_admin") {
    throw new HttpError(
      403,
      "You need manage permission to change this project.",
      { code: "FORBIDDEN" },
    );
  }
  return { isClient: access.isClient, canManage: access.canManage };
}
