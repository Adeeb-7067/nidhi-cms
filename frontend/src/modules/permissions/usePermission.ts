import { useCallback, useMemo } from "react";
import { usePermissionsQuery } from "@/api/permissions";
import { normalizeModule, type CmsAction } from "./constants";
import { useAuth } from "@/contexts/AuthContext";
import { isHrmAdminRole } from "@/lib/user-roles";
import { resolveRoutePermission } from "@/lib/route-permissions";

function buildViewPermissionSet(
  permissions: Array<{ module: string; action: string }>,
): Set<string> {
  const set = new Set<string>();
  for (const p of permissions) {
    if (p.action === "view") set.add(normalizeModule(p.module));
  }
  return set;
}

export function usePermissionLoading(): boolean {
  const { user } = useAuth();
  const { isLoading, isFetching, data } = usePermissionsQuery(!!user);
  return !!user && (isLoading || (isFetching && !data));
}

export function usePermission(module: string, action: CmsAction): boolean {
  const { user } = useAuth();
  const { data, isLoading } = usePermissionsQuery(!!user);

  const permissionSet = useMemo(
    () => buildViewPermissionSet(data?.permissions ?? []),
    [data?.permissions],
  );

  return useMemo(() => {
    if (!user) return false;
    if (isLoading && !data) return false;
    if (user.role === "super_admin" || isHrmAdminRole(user.role)) return true;
    const key = normalizeModule(module);
    if (action === "view") return permissionSet.has(key);
    return (data?.permissions ?? []).some((p) => p.module === key && p.action === action);
  }, [user, data, module, action, isLoading, permissionSet]);
}

export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading } = usePermissionsQuery(!!user);

  const permissionSet = useMemo(
    () => buildViewPermissionSet(data?.permissions ?? []),
    [data?.permissions],
  );

  const isPrivileged = Boolean(
    user && (user.role === "super_admin" || isHrmAdminRole(user.role)),
  );

  /** Show nav links while permissions load; page gates still enforce access. */
  const optimisticNav = isLoading && !data && !isPrivileged;

  const can = useCallback(
    (module: string, action: CmsAction) => {
      if (!user) return false;
      if (isLoading && !data) return false;
      if (isPrivileged) return true;
      const key = normalizeModule(module);
      if (action === "view") return permissionSet.has(key);
      return (data?.permissions ?? []).some((p) => p.module === key && p.action === action);
    },
    [user, data, isLoading, isPrivileged, permissionSet],
  );

  const canViewHref = useCallback(
    (href: string) => {
      const path = href.split("?")[0];
      const perm = resolveRoutePermission(path);
      if (!perm) return true;
      if (optimisticNav) return true;
      if (isPrivileged) return true;
      return permissionSet.has(normalizeModule(perm));
    },
    [optimisticNav, isPrivileged, permissionSet],
  );

  return {
    permissions: data?.permissions ?? [],
    groups: data?.groups ?? [],
    can,
    canViewHref,
    isLoading,
    templateId: data?.templateId ?? null,
  };
}
