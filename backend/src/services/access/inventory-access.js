import {
  getProjectAccess,
  getCompanyAccess,
  projectCompanyId,
  resolveCompanyIdFromBody
} from "@/services/access/company-access";
function clientVisibilityFilter(isClient) {
  if (!isClient) return {};
  return { visibility: "client_visible" };
}
export {
  clientVisibilityFilter,
  getCompanyAccess,
  getProjectAccess,
  projectCompanyId,
  resolveCompanyIdFromBody
};
