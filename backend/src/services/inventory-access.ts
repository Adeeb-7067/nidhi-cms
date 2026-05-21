import type { Request } from "express";
export {
  getProjectAccess,
  getCompanyAccess,
  projectCompanyId,
  resolveCompanyIdFromBody,
} from "@/services/company-access";

export function clientVisibilityFilter(isClient: boolean): Record<string, unknown> {
  if (!isClient) return {};
  return { visibility: "client_visible" };
}
