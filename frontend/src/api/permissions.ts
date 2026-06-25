import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import type { CmsAction, CmsModule, CmsPermission } from "@/modules/permissions/constants";
import type { CmsModuleGroup } from "@/modules/permissions/types";

export type RoleTemplate = {
  id: number;
  name: string;
  code: string;
  cmsRole?: string | null;
  description?: string | null;
  isSystem: boolean;
  permissions: Array<{ id: number; module: string; action: CmsAction }>;
};

export type AssignableCmsRole = {
  value: string;
  label: string;
  templateId?: number;
  isSystem?: boolean;
};

export type PermissionsResponse = {
  permissions: CmsPermission[];
  templateId: number | null;
  role?: string;
  groups?: CmsModuleGroup[];
};

export const permissionsQueryKey = () => ["permissions", "me"] as const;
export const roleTemplatesQueryKey = () => ["roles", "templates"] as const;
export const assignableCmsRolesQueryKey = () => ["roles", "assignable"] as const;

export function usePermissionsQuery(enabled = true) {
  return useQuery({
    queryKey: permissionsQueryKey(),
    queryFn: () => customFetch<PermissionsResponse>(apiUrl("/api/permissions/me")),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permissions", "catalog"],
    queryFn: () =>
      customFetch<{
        modules: CmsModule[];
        actions: CmsAction[];
        groups: CmsModuleGroup[];
      }>(apiUrl("/api/permissions/catalog")),
    staleTime: 60 * 60_000,
  });
}

export function useRoleTemplates() {
  return useQuery({
    queryKey: roleTemplatesQueryKey(),
    queryFn: () =>
      customFetch<{ templates: RoleTemplate[] }>(apiUrl("/api/roles")),
    staleTime: 5 * 60_000,
  });
}

export function useAssignableCmsRoles(enabled = true) {
  return useQuery({
    queryKey: assignableCmsRolesQueryKey(),
    queryFn: () =>
      customFetch<{ roles: AssignableCmsRole[] }>(apiUrl("/api/roles/assignable")),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      code?: string;
      cmsRole?: string | null;
      description?: string | null;
    }) =>
      customFetch<{ template: RoleTemplate }>(apiUrl("/api/roles"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleTemplatesQueryKey() });
      qc.invalidateQueries({ queryKey: assignableCmsRolesQueryKey() });
    },
  });
}

export function useUpdateRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      name?: string;
      description?: string | null;
      cmsRole?: string | null;
    }) =>
      customFetch<{ template: RoleTemplate }>(apiUrl(`/api/roles/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleTemplatesQueryKey() });
      qc.invalidateQueries({ queryKey: assignableCmsRolesQueryKey() });
    },
  });
}

export function useDeleteRoleTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/roles/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleTemplatesQueryKey() });
      qc.invalidateQueries({ queryKey: assignableCmsRolesQueryKey() });
    },
  });
}

export function useUpdateRoleTemplatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: number;
      permissions: Array<{ module: string; action: CmsAction }>;
    }) =>
      customFetch(apiUrl(`/api/roles/${id}/permissions`), {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleTemplatesQueryKey() });
      qc.invalidateQueries({ queryKey: permissionsQueryKey() });
    },
  });
}
