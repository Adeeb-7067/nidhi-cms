import { customFetch } from "./custom-fetch";
import type { Bug, ListBugsParams } from "./generated/api.schemas";
import type { BugInputPriority } from "./generated/api.schemas";

export type BugBatchItem = {
  title: string;
  qaStatus?: "open" | "fixed";
  devStatus?: "open" | "fixed";
  finalStatus?: "open" | "resolved";
};

export type BugBatchInput = {
  projectId: number;
  priority: BugInputPriority;
  parentTitle?: string;
  description?: string;
  assigneeIds?: number[];
  attachments?: Bug["attachments"];
  initialComment?: string;
  items: BugBatchItem[];
};

export async function createBugBatch(
  input: BugBatchInput,
  options?: RequestInit,
): Promise<Bug> {
  return customFetch<Bug>("/api/bugs/batch", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(input),
  });
}

export type BugsExportResult = {
  bugs: Bug[];
  total: number;
  truncated: boolean;
};

export async function deleteBug(id: number, options?: RequestInit): Promise<void> {
  await customFetch<void>(`/api/bugs/${id}`, { ...options, method: "DELETE" });
}

export async function deleteBugIssue(
  bugId: number,
  issueKey: string,
  options?: RequestInit,
): Promise<Bug> {
  return customFetch<Bug>(`/api/bugs/${bugId}/issues/${encodeURIComponent(issueKey)}`, {
    ...options,
    method: "DELETE",
  });
}

export async function fetchBugsExport(
  params: ListBugsParams,
  options?: RequestInit,
): Promise<BugsExportResult> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.append(k, String(v));
  }
  const qs = sp.toString();
  return customFetch<BugsExportResult>(`/api/bugs/export${qs ? `?${qs}` : ""}`, {
    ...options,
    method: "GET",
  });
}
