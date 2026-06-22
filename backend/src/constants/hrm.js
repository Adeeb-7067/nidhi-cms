/** @deprecated Use cmsModules from constants/permissions.js */
export { cmsModules as hrmModules, cmsActions as hrmActions } from "./permissions.js";
export {
  defaultTemplateByRole as defaultHrmTemplateByRole,
  isHrmAdminRole,
  canAccessHrm,
} from "./permissions.js";
export * from "./hrm-workflow.js";
