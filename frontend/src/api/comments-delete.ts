import { useMutation } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import type { Comment } from "./generated/api.schemas";

/** Soft-delete a message. Returns the blanked comment. */
export function deleteComment(id: number): Promise<Comment> {
  return customFetch<Comment>(apiUrl(`/api/comments/${id}`), { method: "DELETE" });
}

/** Delete a chat message (author or super admin). Cache updates handled by caller. */
export function useDeleteComment() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) => deleteComment(id),
  });
}
