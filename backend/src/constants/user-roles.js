/** Canonical user role lists — keep in sync with Mongoose schema and OpenAPI. */
const userRoles = ["super_admin", "hr", "manager", "developer", "tester", "qa", "client", "freelancer", "bde"];

/** Same delivery permissions as developer — only the display label differs. */
const developerStaffRoles = ["developer", "freelancer"];
 
/** Employee ID + dev-portal login (employee ID, not email). */
const staffEmployeeRoles = ["manager", "developer", "tester", "qa", "freelancer", "bde"];

/** Payroll / leave / attendance HRM records — company employees only (not freelancers). */
const hrmEmployeeRoles = ["hr", "manager", "developer", "tester", "qa", "bde"];

/** Shown on admin Team page and staff user listings. */
const adminStaffRoles = ["super_admin", "hr", "manager", "developer", "tester", "qa", "freelancer", "bde"];

/** Super admin view-as: any active account on Admin → Team (clients use Admin → Clients). */
const impersonatableStaffRoles = [...adminStaffRoles];

/** Dev portal access: assigned projects, logs, tasks, bugs (non-QA workflows). */
const devPortalStaffRoles = ["manager", "developer", "tester", "qa", "freelancer"];

/** Screenshot / work-session monitoring (Electron + attendance). */
const monitorableStaffRoles = ["manager", "developer", "tester", "qa", "freelancer"];
 
/** HRM admin roles (email login). */ 
const hrmAdminRoles = ["super_admin", "hr"];

/** Roles QA can assign bugs to. */
const bugAssigneeRoles = developerStaffRoles;

function isDeveloperRole(role) { 
  return developerStaffRoles.includes(role);
}

function isDevPortalStaffRole(role) {
  return devPortalStaffRoles.includes(role);
} 

function isMonitorableStaffRole(role) {
  return monitorableStaffRoles.includes(role);
}

function isStaffEmployeeRole(role) {
  return staffEmployeeRoles.includes(role);
}

function isImpersonatableStaffRole(role) {
  return impersonatableStaffRoles.includes(role);
}

function isHrmEmployeeRole(role) {
  return hrmEmployeeRoles.includes(role); 
}

function isBugAssigneeRole(role) {
  return bugAssigneeRoles.includes(role);
}

function isHrmAdminRole(role) {
  return hrmAdminRoles.includes(role);
}

export {
  adminStaffRoles,
  bugAssigneeRoles,
  developerStaffRoles,
  devPortalStaffRoles,
  hrmAdminRoles,
  hrmEmployeeRoles,
  isBugAssigneeRole,
  isDeveloperRole,
  isDevPortalStaffRole,
  isHrmAdminRole,
  isHrmEmployeeRole,
  isImpersonatableStaffRole,
  isMonitorableStaffRole,
  isStaffEmployeeRole,
  impersonatableStaffRoles,
  monitorableStaffRoles,
  staffEmployeeRoles,
  userRoles,
};
