import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

export type ProjectDocumentFieldType =
  | "text"
  | "password"
  | "url"
  | "file"
  | "textarea"
  | "image";

export interface ProjectDocumentField {
  id: string;
  label: string;
  type: ProjectDocumentFieldType;
  value: string | null;
}

export interface ProjectDocumentCompleteness {
  filled: number;
  total: number;
  percent: number;
}

export type ProjectDocumentRenewalKind = "domain" | "hosting" | "ssl" | "other";

export interface ProjectDocumentRenewal {
  id: string;
  kind: ProjectDocumentRenewalKind;
  label: string;
  provider: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  daysUntilExpiry?: number | null;
}

export interface ProjectDocument {
  id: number;
  projectId: number;
  projectName?: string | null;
  projectStatus?: string | null;
  fields: ProjectDocumentField[];
  renewals: ProjectDocumentRenewal[];
  nearestRenewal?: ProjectDocumentRenewal | null;
  createdBy: number;
  updatedBy: number;
  updatedByName?: string | null;
  completeness?: ProjectDocumentCompleteness;
  createdAt: string;
  updatedAt: string;
}

export interface ListProjectDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: number;
}

export type ProjectDocumentInput = {
  fields: ProjectDocumentField[];
  renewals: Array<{
    id: string;
    kind: ProjectDocumentRenewalKind;
    label: string;
    provider: string | null;
    startDate: string;
    endDate: string;
    notes: string | null;
  }>;
};

export function useListProjectDocuments(params: ListProjectDocumentsParams = {}, enabled = true) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.projectId) q.set("projectId", String(params.projectId));
  const qs = q.toString();
  return useQuery<{ documents: ProjectDocument[]; total: number; page: number; limit: number }>({
    queryKey: ["project-documents", params],
    queryFn: () => customFetch(apiUrl(`/api/project-documents${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 15_000,
  });
}

export function useGetProjectDocument(id: number, enabled = true) {
  return useQuery<{ document: ProjectDocument }>({
    queryKey: ["project-document", id],
    queryFn: () => customFetch(apiUrl(`/api/project-documents/${id}`)),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useGetProjectDocumentByProjectId(projectId: number, enabled = true) {
  return useQuery<{ document: ProjectDocument }>({
    queryKey: ["project-document-by-project", projectId],
    queryFn: () => customFetch(apiUrl(`/api/project-documents/by-project/${projectId}`)),
    enabled: enabled && Number.isFinite(projectId),
    retry: (count, error) => {
      if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 404) {
        return false;
      }
      return count < 2;
    },
  });
}

export function useProjectsWithoutDocument(enabled = true) {
  return useQuery<{ projects: { id: number; name: string }[] }>({
    queryKey: ["project-documents-without"],
    queryFn: () => customFetch(apiUrl("/api/project-documents/projects-without")),
    enabled,
  });
}

export function useCreateProjectDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectDocumentInput & { projectId: number }) =>
      customFetch(apiUrl("/api/project-documents"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["project-documents"] });
      qc.invalidateQueries({ queryKey: ["project-documents-without"] });
      qc.invalidateQueries({ queryKey: ["project-document-by-project", vars.projectId] });
    },
  });
}

export function useUpdateProjectDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ProjectDocumentInput & { id: number }) =>
      customFetch(apiUrl(`/api/project-documents/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["project-documents"] });
      qc.invalidateQueries({ queryKey: ["project-document", vars.id] });
      qc.invalidateQueries({ queryKey: ["project-document-by-project"] });
    },
  });
}

export function useDeleteProjectDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/project-documents/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-documents"] });
      qc.invalidateQueries({ queryKey: ["project-documents-without"] });
    },
  });
}
