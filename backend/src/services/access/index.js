export {
  assertCompanyAccess,
  assertProjectAccess,
} from "./access-helpers.js";
export {
  clientVisibilityFilter,
  getCompanyAccess,
  getProjectAccess,
  projectCompanyId,
  resolveCompanyIdFromBody,
} from "./inventory-access.js";
export {
  PROJECT_PICKER_PROJECTION,
  COMPANY_PICKER_PROJECTION,
  STAFF_PICKER_PROJECTION,
  USER_DIRECTORY_PROJECTION,
  applyIdScope,
  assertCanViewUserProfile,
  buildStaffPickerQuery,
  formatStaffPickerUser,
  getAccessibleCompanyIds,
  getAccessibleProjectIds,
  isPeopleAdminRole,
  resolveAccessContext,
  shareProjectMembership,
} from "./access-context.js";
