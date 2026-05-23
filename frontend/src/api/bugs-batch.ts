import { customFetch } from "./custom-fetch";
import type { Bug } from "./generated/api.schemas";
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
