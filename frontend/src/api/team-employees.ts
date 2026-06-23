import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import {
  buildTeamEmployeePayload,
  type TeamEmployeeFormValues,
} from "@/modules/admin/employee-form-shared";
import { getListUsersQueryKey } from "./generated/api";
import { hrmEmployeeQueryKey } from "./hrm";
import { toastApiError } from "@/lib/api-error";

/** Full CMS user record including extended HRM profile fields (super_admin GET). */
export type TeamEmployeeRecord = Record<string, unknown> & {
  id: number;
  name: string;
  email: string;
  role: string;
};

export const teamEmployeeQueryKey = (id?: number) => ["team", "employee", id] as const;

export async function fetchTeamEmployee(id: number, signal?: AbortSignal) {
  return customFetch<TeamEmployeeRecord>(`/users/${id}`, { signal });
}

export async function createTeamEmployee(
  values: TeamEmployeeFormValues,
  departmentNameById: Map<number, string>,
  password: string,
) {
  const payload = {
    ...buildTeamEmployeePayload(values, departmentNameById),
    password: password.trim(),
  };
  return customFetch<TeamEmployeeRecord>("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateTeamEmployee(
  id: number,
  values: TeamEmployeeFormValues,
  departmentNameById: Map<number, string>,
  password?: string,
) {
  const payload = buildTeamEmployeePayload(values, departmentNameById);
  const trimmedPassword = password?.trim() ?? "";
  if (trimmedPassword) {
    (payload as Record<string, unknown>).password = trimmedPassword;
  }
  return customFetch<TeamEmployeeRecord>(`/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function useTeamEmployeeProfile(id?: number, enabled = false) {
  return useQuery({
    queryKey: teamEmployeeQueryKey(id),
    queryFn: ({ signal }) => fetchTeamEmployee(id!, signal),
    enabled: enabled && id != null && id > 0,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useSaveTeamEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      departmentNameById,
      password,
    }: {
      id?: number;
      values: TeamEmployeeFormValues;
      departmentNameById: Map<number, string>;
      password?: string;
    }) => {
      if (id != null) {
        return updateTeamEmployee(id, values, departmentNameById, password);
      }
      const pwd = password?.trim() ?? "";
      if (!pwd) throw new Error("Password is required for new employees");
      return createTeamEmployee(values, departmentNameById, pwd);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "employees"] });
      if (vars.id != null) {
        qc.invalidateQueries({ queryKey: teamEmployeeQueryKey(vars.id) });
        qc.invalidateQueries({ queryKey: hrmEmployeeQueryKey(vars.id) });
      }
    },
    onError: (error, vars) => {
      toastApiError(error, vars.id != null ? "Failed to save employee" : "Failed to create employee");
    },
  });
}
