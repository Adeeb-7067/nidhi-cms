import { forbidden } from "./route-errors.js";
import { isSalesAdminRole } from "./sales-bde-customer-scope.js";

export { isSalesAdminRole };

export function assertSalesAdmin(user, message = "Only sales admins can perform this action.") {
  if (!user || isSalesAdminRole(user.role)) return;
  forbidden(message);
}
