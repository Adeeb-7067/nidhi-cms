import { useMemo } from "react";
import { usePermissionsQuery } from "@/api/permissions";
import { NAV_HREF_PERMISSION, normalizeModule, type CmsAction } from "./constants";
import { useAuth } from "@/contexts/AuthContext";
import { isHrmAdminRole } from "@/lib/user-roles";

export function usePermission(module: string, action: CmsAction): boolean {
  const { user } = useAuth();
  const { data } = usePermissionsQuery(!!user);

  return useMemo(() => {
    if (!user) return false;
    if (user.role === "super_admin" || isHrmAdminRole(user.role)) return true;
    const key = normalizeModule(module);
    return (data?.permissions ?? []).some((p) => p.module === key && p.action === action);
  }, [user, data, module, action]);
}

export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading } = usePermissionsQuery(!!user);

  const can = (module: string, action: CmsAction) => {
    if (!user) return false;
    if (user.role === "super_admin" || isHrmAdminRole(user.role)) return true;
    const key = normalizeModule(module);
    return (data?.permissions ?? []).some((p) => p.module === key && p.action === action);
  };

  const canViewHref = (href: string) => {
    const path = href.split("?")[0];
    const perm = NAV_HREF_PERMISSION[path];
    if (!perm) return true;
    return can(perm, "view");
  };

  return {
    permissions: data?.permissions ?? [],
    groups: data?.groups ?? [],
    can,
    canViewHref,
    isLoading,
    templateId: data?.templateId ?? null,
  };
}
