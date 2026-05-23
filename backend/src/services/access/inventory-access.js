import {
  getProjectAccess,
  getCompanyAccess,
  projectCompanyId,
  resolveCompanyIdFromBody
} from "./company-access.js";
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
