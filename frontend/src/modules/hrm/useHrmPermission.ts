import { usePermission as useCmsPermission, usePermissions as useCmsPermissions } from "@/modules/permissions/usePermission";
import type { CmsAction } from "@/modules/permissions/constants";

/** @deprecated Prefer usePermission from @/modules/permissions/usePermission */
export function useHrmPermission(module: string, action: CmsAction): boolean {
  return useCmsPermission(module, action);
}

/** @deprecated Prefer usePermissions from @/modules/permissions/usePermission */
export function useHrmPermissions() {
  return useCmsPermissions();    
}

/** @deprecated */
export function useCanViewHrmModule(module: string): boolean {
  const { can } = useCmsPermissions();
  return can(module, "view");
}
