import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type ProjectDiscussionPreview = {
  projectId: number;
  threadType: "project" | "project_internal" | "company_team";
  /** @nullable */
  lastMessageAt: string | null;
  /** @nullable */
  lastPreview: string | null;
  /** @nullable */
  lastAuthorName: string | null;
  /** @nullable */
  lastAuthorId: number | null;
};

export type ProjectDiscussionPreviewsResult = {
  previews: ProjectDiscussionPreview[];
};

export const discussionPreviewsQueryKey = ["/api/comments/project-previews"] as const;

export function fetchDiscussionPreviews(): Promise<ProjectDiscussionPreviewsResult> {
  return customFetch<ProjectDiscussionPreviewsResult>("/api/comments/project-previews");
}

export function useDiscussionPreviews(enabled = true) {
  return useQuery({
    queryKey: discussionPreviewsQueryKey,
    queryFn: fetchDiscussionPreviews,
    enabled,
    staleTime: 60_000,
  });
}
