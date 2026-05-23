import { customFetch } from "./custom-fetch";
import type { ProjectMember } from "./generated/api.schemas";

export type AddProjectMembersBatchResult = {
  added: ProjectMember[];
  skipped: { userId: number; reason?: string }[];
  addedCount: number;
  skippedCount: number;
};

export async function addProjectMembersBatch(
  projectId: number,
  userIds: number[],
  subType?: string,
  options?: RequestInit,
): Promise<AddProjectMembersBatchResult> {
  return customFetch<AddProjectMembersBatchResult>(`/api/projects/${projectId}/members/batch`, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify({ userIds, subType }),
  });
}
