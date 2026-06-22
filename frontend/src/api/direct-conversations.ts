import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type DirectConversationPeer = {
  id: number;
  name: string;
  /** @nullable */
  email?: string | null;
  /** @nullable */
  avatarUrl?: string | null;
  role: string;
  /** @nullable */
  subtitle?: string | null;
  category: "client" | "staff" | "other";
};

export type DirectConversation = {
  id: number;
  peerUser: DirectConversationPeer;
  /** @nullable */
  lastMessageAt?: string | null;
  /** @nullable */
  lastPreview?: string | null;
  /** @nullable */
  lastAuthorName?: string | null;
  /** @nullable */
  lastAuthorId?: number | null;
  updatedAt: string;
};

export type DirectConversationListResult = {
  conversations: DirectConversation[];
};

export type DirectConversationContactsResult = {
  clientContacts: DirectConversationPeer[];
  staffContacts: DirectConversationPeer[];
};

export const directConversationsQueryKey = ["/api/direct-conversations"] as const;
export const directConversationContactsQueryKey = ["/api/direct-conversations/contacts"] as const;

export function fetchDirectConversations(): Promise<DirectConversationListResult> {
  return customFetch<DirectConversationListResult>("/api/direct-conversations");
}

export function fetchDirectConversationContacts(): Promise<DirectConversationContactsResult> {
  return customFetch<DirectConversationContactsResult>("/api/direct-conversations/contacts");
}

export function createDirectConversation(
  participantUserId: number,
): Promise<{ conversation: DirectConversation }> {
  return customFetch<{ conversation: DirectConversation }>("/api/direct-conversations", {
    method: "POST",
    body: JSON.stringify({ participantUserId }),
  });
}

export function useDirectConversations(enabled = true) {
  return useQuery({
    queryKey: directConversationsQueryKey,
    queryFn: fetchDirectConversations,
    enabled,
    staleTime: 30_000,
  });
}

export function useDirectConversationContacts(enabled = true) {
  return useQuery({
    queryKey: directConversationContactsQueryKey,
    queryFn: fetchDirectConversationContacts,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateDirectConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantUserId: number) => createDirectConversation(participantUserId),
    onSuccess: (result) => {
      upsertDirectConversationInCache(queryClient, result.conversation);
    },
  });
}

/** Merge or insert a conversation in the React Query cache (no refetch). */
export function upsertDirectConversationInCache(
  queryClient: QueryClient,
  conversation: DirectConversation,
): void {
  queryClient.setQueryData<DirectConversationListResult>(
    directConversationsQueryKey,
    (old) => {
      const conversations = old?.conversations ?? [];
      const idx = conversations.findIndex((c) => c.id === conversation.id);
      if (idx >= 0) {
        const next = [...conversations];
        next[idx] = { ...next[idx], ...conversation };
        return { conversations: next };
      }
      return { conversations: [conversation, ...conversations] };
    },
  );
}

/** Patch preview fields after a new direct message (socket or optimistic send). */
export function patchDirectConversationFromComment(
  queryClient: QueryClient,
  conversationId: number,
  patch: {
    lastMessageAt: string;
    lastPreview?: string;
    lastAuthorName?: string;
    lastAuthorId?: number;
  },
): void {
  queryClient.setQueryData<DirectConversationListResult>(
    directConversationsQueryKey,
    (old) => {
      if (!old?.conversations?.length) return old;
      let changed = false;
      const conversations = old.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        changed = true;
        return {
          ...c,
          ...patch,
          updatedAt: patch.lastMessageAt,
        };
      });
      if (!changed) return old;
      conversations.sort((a, b) => {
        const aTime = a.lastMessageAt ?? a.updatedAt;
        const bTime = b.lastMessageAt ?? b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      return { conversations };
    },
  );
}
