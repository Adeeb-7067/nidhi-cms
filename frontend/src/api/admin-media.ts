import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-base";
import { customFetch } from "./custom-fetch";
import type { MarketingMediaDto } from "@/api/marketing";

export type AdminMediaDto = Omit<MarketingMediaDto, "accountId" | "companyId">;

export function useAdminMediaTree(enabled = true) {
  return useQuery<{ items: AdminMediaDto[] }>({
    queryKey: ["admin-media-tree"],
    queryFn: () => customFetch(apiUrl("/api/admin/media/tree")),
    enabled,
  });
}

export function useCreateAdminFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; parentId?: string | null }) =>
      customFetch<AdminMediaDto>(apiUrl("/api/admin/media/folders"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media-tree"] }),
  });
}

export function useRegisterAdminFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      url: string;
      parentId?: string | null;
      storageKey?: string | null;
      key?: string | null;
      mimetype?: string | null;
      extension?: string | null;
      sizeBytes?: number | null;
      kind?: string;
    }) =>
      customFetch<AdminMediaDto>(apiUrl("/api/admin/media/files"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media-tree"] }),
  });
}

export function useRenameAdminMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string | number; name: string }) =>
      customFetch<AdminMediaDto>(apiUrl(`/api/admin/media/${id}`), {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media-tree"] }),
  });
}

export function useDeleteAdminMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      customFetch(apiUrl(`/api/admin/media/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media-tree"] }),
  });
}

export function useMoveAdminMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string | number; parentId: string | null }) =>
      customFetch<AdminMediaDto>(apiUrl(`/api/admin/media/${id}/move`), {
        method: "POST",
        body: JSON.stringify({ parentId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media-tree"] }),
  });
}
