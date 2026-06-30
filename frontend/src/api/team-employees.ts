import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import {
  buildTeamEmployeePayload,
  buildTeamEmployeePatchPayload,
  type TeamEmployeeFormValues,
} from "@/modules/admin/employee-form-shared";
import { apiUrl } from "@/lib/api-base";
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
  return customFetch<TeamEmployeeRecord>(apiUrl(`/api/users/${id}`), { signal });
}

export async function createTeamEmployee(
  values: TeamEmployeeFormValues,
  departmentNameById: Map<number, string>,
  password?: string,
) {
  const payload: Record<string, unknown> = buildTeamEmployeePayload(values, departmentNameById);
  const trimmed = password?.trim() ?? "";
  if (trimmed) payload.password = trimmed;
  return customFetch<TeamEmployeeRecord>(apiUrl("/api/users"), {
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
  baseline?: TeamEmployeeFormValues,
) {
  const payload: Record<string, unknown> = baseline
    ? buildTeamEmployeePatchPayload(values, departmentNameById, baseline)
    : buildTeamEmployeePayload(values, departmentNameById);
  const trimmedPassword = password?.trim() ?? "";
  if (trimmedPassword) {
    payload.password = trimmedPassword;
  }
  return customFetch<TeamEmployeeRecord>(apiUrl(`/api/users/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type CreateEmployeeFromCandidateResult = {
  user: TeamEmployeeRecord;
  temporaryPassword?: string;
  onboardingRecord?: { id: number } | null;
  alreadyExisted?: boolean;
  candidateId: number;
};

/** POST /api/hrm/recruitment/candidates/:id/create-employee — temp password when omitted. */
export function useCreateEmployeeFromCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      role,
      password,
      startOnboarding,
    }: {
      candidateId: number;
      role?: string;
      password?: string;
      startOnboarding?: boolean;
    }) =>
      customFetch<CreateEmployeeFromCandidateResult>(
        apiUrl(`/api/hrm/recruitment/candidates/${candidateId}/create-employee`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(role ? { role } : {}),
            ...(password?.trim() ? { password: password.trim() } : {}),
            ...(startOnboarding != null ? { startOnboarding } : {}),
          }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "employees"] });
      qc.invalidateQueries({ queryKey: ["hrm", "recruitment"] });
      qc.invalidateQueries({ queryKey: ["hrm", "onboarding"] });
      qc.invalidateQueries({ queryKey: ["permissions"] });
    },
    onError: (error) => {
      toastApiError(error, "Failed to create employee account");
    },
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
      baseline,
    }: {
      id?: number;
      values: TeamEmployeeFormValues;
      departmentNameById: Map<number, string>;
      password?: string;
      baseline?: TeamEmployeeFormValues;
    }) => {
      if (id != null) {
        return updateTeamEmployee(id, values, departmentNameById, password, baseline);
      }
      return createTeamEmployee(values, departmentNameById, password);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "employees"] });
      qc.invalidateQueries({ queryKey: ["permissions"] });
      qc.invalidateQueries({ queryKey: ["sales-team"] });
      if (vars.id != null) {
        qc.invalidateQueries({ queryKey: teamEmployeeQueryKey(vars.id) });
        qc.invalidateQueries({ queryKey: hrmEmployeeQueryKey(vars.id) });
        qc.invalidateQueries({ queryKey: ["hrm", "documents", vars.id] });
      }
    },
    onError: (error, vars) => {
      toastApiError(error, vars.id != null ? "Failed to save employee" : "Failed to create employee");
    },
  });
}
