import { useCallback, useMemo } from "react";
import { usePermissionsQuery } from "@/api/permissions";
import { normalizeModule, SALES_MODULES, type CmsAction } from "./constants";
import { useAuth } from "@/contexts/AuthContext";
import { resolveRoutePermission, isNavHrefPublic } from "@/lib/route-permissions";

function expandLegacySalesViewSet(set: Set<string>) {
  if (!set.has("sales")) return;
  for (const mod of SALES_MODULES) {
    set.add(mod);
  }
}

function buildViewPermissionSet(
  permissions: Array<{ module: string; action: string }>,
): Set<string> {
  const set = new Set<string>();
  for (const p of permissions) {
    if (p.action === "view") set.add(normalizeModule(p.module));
  }
  expandLegacySalesViewSet(set);
  return set;
}

function permissionMatches(
  permissions: Array<{ module: string; action: string }>,
  permissionSet: Set<string>,
  module: string,
  action: CmsAction,
): boolean {
  const key = normalizeModule(module);
  if (action === "view") {
    if (permissionSet.has(key)) return true;
    if (key.startsWith("sales_") && permissionSet.has("sales")) return true;
    return false;
  }
  if (permissions.some((p) => normalizeModule(p.module) === key && p.action === action)) return true;
  if (key.startsWith("sales_")) {
    return permissions.some((p) => normalizeModule(p.module) === "sales" && p.action === action);
  }
  return false;
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
    if (user.role === "super_admin") return true;
    return permissionMatches(data?.permissions ?? [], permissionSet, module, action);
  }, [user, data, module, action, isLoading, permissionSet]);
}

export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading } = usePermissionsQuery(!!user);

  const permissionSet = useMemo(
    () => buildViewPermissionSet(data?.permissions ?? []),
    [data?.permissions],
  );

  const isPrivileged = Boolean(user?.role === "super_admin");

  const can = useCallback(
    (module: string, action: CmsAction) => {
      if (!user) return false;
      if (isLoading && !data) return false;
      if (isPrivileged) return true;
      return permissionMatches(data?.permissions ?? [], permissionSet, module, action);
    },
    [user, data, isLoading, isPrivileged, permissionSet],
  );

  const canViewHref = useCallback(
    (href: string) => {
      const path = href.split("?")[0];
      const perm = resolveRoutePermission(path);
      if (!perm) return isNavHrefPublic(path);
      if (isPrivileged) return true;
      if (isLoading && !data) return false;
      return permissionMatches(data?.permissions ?? [], permissionSet, perm, "view");
    },
    [isPrivileged, isLoading, data, permissionSet],
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
