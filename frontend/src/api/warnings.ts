import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

export type WarningStatus = "active" | "revoked";

export interface Warning {
  id: number;
  targetUserId: number;
  targetUserName: string | null;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: WarningStatus;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyWarning {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface WarningInput {
  targetUserId: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

export const warningKeys = {
  list: (params?: object) => ["warnings", params] as const,
  mine: () => ["warnings-mine"] as const,
};

export function useListWarnings(
  params?: { targetUserId?: number; status?: WarningStatus },
  enabled = true,
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return useQuery<{ warnings: Warning[]; total: number; page: number; limit: number }>({
    queryKey: warningKeys.list(params),
    queryFn: () => customFetch(apiUrl(`/api/warnings${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 15_000,
  });
}

export function useCreateWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WarningInput) =>
      customFetch<Warning>(apiUrl("/api/warnings"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warnings"] });
      qc.invalidateQueries({ queryKey: warningKeys.mine() });
    },
  });
}

export function useUpdateWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<WarningInput> & { id: number }) =>
      customFetch<Warning>(apiUrl(`/api/warnings/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warnings"] });
      qc.invalidateQueries({ queryKey: warningKeys.mine() });
    },
  });
}

export function useRevokeWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/warnings/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warnings"] });
      qc.invalidateQueries({ queryKey: warningKeys.mine() });
    },
  });
}

export function useMyActiveWarnings(enabled = true) {
  return useQuery<{ warnings: MyWarning[] }>({
    queryKey: warningKeys.mine(),
    queryFn: () => customFetch(apiUrl("/api/warnings/mine")),
    enabled,
    staleTime: 60_000,
  });
}
