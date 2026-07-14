import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListProjects,
  useListComments,
  listComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
  useListNotifications,
  useMarkNotificationRead,
  useDiscussionPreviews,
  useDirectConversations,
  useDirectConversationContacts,
  useCreateDirectConversation,
  directConversationsQueryKey,
  patchDirectConversationFromComment,
  getListCommentsQueryKey,
  getListNotificationsQueryKey,
  type Comment,
  type CommentListResult,
  type NotificationListResult,
} from "@/api";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DiscussionChatList } from "@/components/discussions/discussion-chat-list";
import { DiscussionChatPanel } from "@/components/discussions/discussion-chat-panel";
import {
  DiscussionSectionRail,
  type DiscussionAdminSection,
} from "@/components/discussions/discussion-section-rail";
import { NewConversationPicker } from "@/components/discussions/new-conversation-picker";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  buildDiscussionChannels,
  buildDirectChannelFromContact,
  buildDirectDiscussionChannels,
  adminSectionForDirectPeer,
  parsePendingDirectPeerId,
  parseDiscussionChannelKey,
  pendingDirectChannelKey,
  resolveDirectConversationIdFromKey,
  isAdminDirectSelectionKey,
  isDirectChannelRowSelected,
  canAccessInternalDiscussion,
  COMPANY_TEAM_THREAD_ID,
  COMPANY_TEAM_UNOFFICIAL_THREAD_ID,
  discussionChannelKey,
  discussionChannelSubtitle,
  discussionChannelTitle,
  isCompanyTeamChannel,
  isDirectChannel,
  type DiscussionChannel,
  type DiscussionChannelFilter,
  type ProjectDiscussionThreadType,
} from "@/lib/discussion-channels";
import {
  clearDiscussionsProjectFromUrl,
  readDiscussionsChannelFromUrl,
  readDiscussionsProjectIdFromUrl,
  readDiscussionsDirectConversationIdFromUrl,
} from "@/lib/discussions-navigation";
import { useLocation } from "wouter";
import {
  mergeCommentListWithCache,
  commentThreadQueryParams,
  commentThreadSignature,
  createOptimisticComment,
  createOptimisticCommentId,
  isOptimisticCommentId,
  flattenCommentThread,
  getLatestThreadComment,
  removeCommentFromListCache,
  replaceOptimisticCommentInCache,
} from "@/lib/comment-thread-query";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildChannelActivityFromNotifications,
  buildChannelActivityFromPreviews,
  compareChannelsForChatList,
  filterUnreadCommentNotifications,
  loadLastReadByChannel,
  mergePreviewSnapshot,
  reconcileChannelActivity,
  saveChannelLastRead,
  buildChannelActivityFromDirectConversations,
  type ChannelActivity,
} from "@/lib/discussions-read-state";
import type { DirectConversationPeer, DirectConversation } from "@/api/direct-conversations";
import {
  applyProjectCommentToCaches,
  applyCommentDeletedToCaches,
  applyCommentUpdatedToCaches,
  channelActivityPatchFromComment,
  discussionCommentPreview,
} from "@/lib/discussion-realtime";
function channelMatchesSearch(channel: DiscussionChannel, q: string): boolean {
  if (!q) return true;
  const title = discussionChannelTitle(channel.project.name, channel.threadType, channel.peerUser).toLowerCase();
  const subtitle = discussionChannelSubtitle(channel.threadType, channel.peerUser).toLowerCase();
  return (
    channel.project.name.toLowerCase().includes(q) ||
    (channel.peerUser?.name.toLowerCase().includes(q) ?? false) ||
    (channel.peerUser?.subtitle?.toLowerCase().includes(q) ?? false) ||
    title.includes(q) ||
    subtitle.includes(q)
  );
}

function upsertChannelActivity(
  prev: Record<string, ChannelActivity>,
  channelKey: string,
  patch: Partial<ChannelActivity> & { lastMessageAt?: string },
): Record<string, ChannelActivity> {
  const existing = prev[channelKey];
  return {
    ...prev,
    [channelKey]: {
      lastMessageAt: patch.lastMessageAt ?? existing?.lastMessageAt ?? new Date().toISOString(),
      unreadCount: patch.unreadCount ?? existing?.unreadCount ?? 0,
      lastPreview: patch.lastPreview ?? existing?.lastPreview,
      lastAuthorName: patch.lastAuthorName ?? existing?.lastAuthorName,
      lastAuthorId: patch.lastAuthorId ?? existing?.lastAuthorId,
    },
  };
}

/**
 * Recompute a channel's chat-list preview from the *actual* latest message in
 * the thread cache. Call after an edit/delete so the sidebar never shows the
 * wrong snippet (e.g. "deleted" when an older message was removed). Preserves
 * the existing unread count. The thread cache must already be updated.
 */
function syncChannelPreviewFromThread(
  queryClient: QueryClient,
  setChannelActivity: React.Dispatch<React.SetStateAction<Record<string, ChannelActivity>>>,
  threadType: ProjectDiscussionThreadType,
  threadId: number,
): void {
  const latest = getLatestThreadComment(queryClient, threadType, threadId);
  if (!latest) return;
  const channelKey = discussionChannelKey(threadType, threadId);
  setChannelActivity((prev) =>
    upsertChannelActivity(prev, channelKey, {
      lastMessageAt: latest.createdAt ?? prev[channelKey]?.lastMessageAt,
      lastPreview: latest.isDeleted
        ? "This message was deleted"
        : discussionCommentPreview(latest),
      lastAuthorName: latest.authorName,
      lastAuthorId: latest.authorId,
    }),
  );
}

export default function DiscussionsPage() {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [selectedChannelKey, setSelectedChannelKey] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [channelActivity, setChannelActivity] = useState<Record<string, ChannelActivity>>({});
  const [channelFilter, setChannelFilter] = useState<DiscussionChannelFilter>("all");
  const [adminSection, setAdminSection] = useState<DiscussionAdminSection>("team");
  const [showNewConversationPicker, setShowNewConversationPicker] = useState(false);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<Comment | null>(null);
  const [editingMessage, setEditingMessage] = useState<Comment | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const isAdminView = user?.role === "super_admin";
  const isClientView = user?.role === "client";

  const selectedChannelKeyRef = useRef<string | null>(null);
  const userIdRef = useRef<number | undefined>(undefined);
  const channelsRef = useRef<DiscussionChannel[]>([]);
  const directConversationsRef = useRef<DirectConversation[]>([]);
  const openingDirectPeerRef = useRef<number | null>(null);
  const markedNotificationIdsRef = useRef(new Set<number>());
  const markReadInFlightRef = useRef(false);
  const markReadMutateRef = useRef<
    (vars: { id: number }) => Promise<void> | undefined
  >(undefined);
  const previewHydrateSigRef = useRef("");
  const directHydrateSigRef = useRef("");
  const notificationHydrateSigRef = useRef("");
  const lastReadSavedSigRef = useRef("");
  const onDiscussionsPage = location.startsWith("/discussions");

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({
    limit: 100,
  });

  const { data: previewData } = useDiscussionPreviews(!!user?.id);

  const { data: directData, isLoading: isLoadingDirectConversations } = useDirectConversations(
    !!user?.id,
  );
  const { data: directContactsData, isLoading: isLoadingDirectContacts } =
    useDirectConversationContacts(isAdminView);
  const createDirectConversation = useCreateDirectConversation();

  const { data: unreadNotificationsData } = useListNotifications(
    { unreadOnly: true, limit: 100 },
    {
      query: {
        enabled: !!user?.id,
        queryKey: getListNotificationsQueryKey({ unreadOnly: true, limit: 100 }),
        staleTime: 30_000,
      },
    },
  );

  const markNotificationRead = useMarkNotificationRead();
  markReadMutateRef.current = markNotificationRead.mutateAsync;

  const projects = useMemo(
    () => projectsData?.projects ?? [],
    [projectsData?.projects],
  );

  const directConversations = useMemo(
    () => directData?.conversations ?? [],
    [directData?.conversations],
  );

  const channels = useMemo(
    () =>
      buildDiscussionChannels(
        projects,
        user?.role,
        isAdminView ? [] : directConversations,
      ),
    [projects, user?.role, directConversations, isAdminView],
  );

  const selectedChannel = useMemo(() => {
    if (!selectedChannelKey) return null;

    const fromChannels = channels.find((c) => c.key === selectedChannelKey);
    if (fromChannels) return fromChannels;

    const pendingPeerId = parsePendingDirectPeerId(selectedChannelKey);
    if (pendingPeerId != null) {
      const existing = directConversations.find((c) => c.peerUser.id === pendingPeerId);
      if (existing) {
        return buildDirectChannelFromContact(existing.peerUser, existing);
      }
      const contact =
        directContactsData?.staffContacts.find((c) => c.id === pendingPeerId) ??
        directContactsData?.clientContacts.find((c) => c.id === pendingPeerId);
      if (contact) return buildDirectChannelFromContact(contact);
      return null;
    }

    const parsed = parseDiscussionChannelKey(selectedChannelKey);
    if (parsed?.threadType === "direct") {
      const existing = directConversations.find((c) => c.id === parsed.projectId);
      if (existing) {
        return buildDirectChannelFromContact(existing.peerUser, existing);
      }
    }

    return null;
  }, [
    channels,
    selectedChannelKey,
    directConversations,
    directContactsData?.staffContacts,
    directContactsData?.clientContacts,
  ]);

  const selectedThreadType: ProjectDiscussionThreadType =
    selectedChannel?.threadType ?? "project";
  const selectedThreadId =
    selectedChannel?.threadType === "direct" &&
    selectedChannelKey &&
    parsePendingDirectPeerId(selectedChannelKey) != null
      ? null
      : selectedChannel?.projectId ?? null;
  const hasActiveChannel =
    selectedChannel != null &&
    selectedThreadId != null &&
    (selectedChannel.threadType !== "direct" || selectedThreadId > 0);

  const selectedProjectUnreadNotifSig = useMemo(() => {
    if (!hasActiveChannel || selectedThreadId == null) return "";
    const pending = filterUnreadCommentNotifications(
      unreadNotificationsData?.notifications ?? [],
      selectedThreadId,
      selectedThreadType,
    );
    return pending
      .map((n) => n.id)
      .sort((a, b) => a - b)
      .join(",");
  }, [hasActiveChannel, selectedThreadId, selectedThreadType, unreadNotificationsData?.notifications]);

  const removeMarkedNotificationsFromCache = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      const patch = (old: NotificationListResult | undefined) => {
        if (!old?.notifications) return old;
        const notifications = old.notifications.filter((n) => !idSet.has(n.id));
        const removed = old.notifications.length - notifications.length;
        if (removed === 0) return old;
        return {
          ...old,
          notifications,
          unreadCount: Math.max(0, (old.unreadCount ?? 0) - removed),
        };
      };
      for (const limit of [1, 10, 100] as const) {
        queryClient.setQueryData(
          getListNotificationsQueryKey({ unreadOnly: true, limit }),
          patch,
        );
      }
    },
    [queryClient],
  );

  channelsRef.current = channels;
  selectedChannelKeyRef.current = selectedChannelKey;
  userIdRef.current = user?.id;
  directConversationsRef.current = directConversations;

  useEffect(() => {
    if (!user?.id || !directConversations.length) return;
    const sig = directConversations
      .map((c) => `${c.id}:${c.lastMessageAt ?? ""}:${c.updatedAt}`)
      .join("|");
    if (sig === directHydrateSigRef.current) return;
    directHydrateSigRef.current = sig;
    const lastRead = loadLastReadByChannel(user.id);
    const fromDirect = buildChannelActivityFromDirectConversations(directConversations, lastRead);
    setChannelActivity((prev) => mergePreviewSnapshot(prev, fromDirect));
  }, [user?.id, directConversations]);

  useEffect(() => {
    if (!previewData?.previews?.length) return;
    const sig = previewData.previews
      .map((p) => `${p.threadType}:${p.projectId}:${p.lastMessageAt ?? ""}`)
      .join("|");
    if (sig === previewHydrateSigRef.current) return;
    previewHydrateSigRef.current = sig;
    const fromPreviews = buildChannelActivityFromPreviews(previewData.previews);
    setChannelActivity((prev) => mergePreviewSnapshot(prev, fromPreviews));
  }, [previewData?.previews]);

  useEffect(() => {
    if (!user?.id || !unreadNotificationsData?.notifications) return;
    const sig = unreadNotificationsData.notifications
      .map((n) => `${n.id}:${n.readAt ?? ""}`)
      .join("|");
    if (sig === notificationHydrateSigRef.current) return;
    notificationHydrateSigRef.current = sig;
    const lastRead = loadLastReadByChannel(user.id);
    const fromNotifications = buildChannelActivityFromNotifications(
      unreadNotificationsData.notifications,
      lastRead,
    );
    setChannelActivity((prev) => reconcileChannelActivity(prev, fromNotifications, lastRead));
  }, [user?.id, unreadNotificationsData?.notifications]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewComment = (data: {
      threadType?: string;
      threadId?: number;
      comment?: Comment;
    }) => {
      const threadType = data.threadType;
      if (
        (threadType !== "project" &&
          threadType !== "project_internal" &&
          threadType !== "company_team" &&
          threadType !== "company_team_unofficial" &&
          threadType !== "direct") ||
        data.threadId == null ||
        !data.comment
      ) {
        return;
      }

      const threadId = data.threadId;
      const comment = data.comment;
      const channelKey = discussionChannelKey(
        threadType as ProjectDiscussionThreadType,
        threadId,
      );

      applyProjectCommentToCaches(
        queryClient,
        threadId,
        comment,
        threadType as ProjectDiscussionThreadType,
      );

      if (threadType === "direct") {
        patchDirectConversationFromComment(queryClient, threadId, {
          lastMessageAt: comment.createdAt ?? new Date().toISOString(),
          lastPreview: discussionCommentPreview(comment),
          lastAuthorName: comment.authorName,
          lastAuthorId: comment.authorId,
        });
      }

      const isActiveChannel = channelKey === selectedChannelKeyRef.current;
      const isOwnMessage = comment.authorId === userIdRef.current;
      const userId = userIdRef.current;
      const lastReadAt =
        userId != null ? loadLastReadByChannel(userId)[channelKey] : undefined;
      const alreadyRead =
        lastReadAt != null &&
        comment.createdAt != null &&
        new Date(comment.createdAt) <= new Date(lastReadAt);

      if (isActiveChannel && userId != null) {
        saveChannelLastRead(userId, channelKey, comment.createdAt ?? new Date().toISOString());
      }

      setChannelActivity((prev) => {
        const previousUnread = prev[channelKey]?.unreadCount ?? 0;
        return upsertChannelActivity(
          prev,
          channelKey,
          channelActivityPatchFromComment(comment, {
            isActiveChannel,
            isOwnMessage,
            alreadyRead,
            previousUnread,
          }),
        );
      });

      if (!isActiveChannel && !isOwnMessage && !onDiscussionsPage) {
        const channel =
          channelsRef.current.find((c) => c.key === channelKey) ??
          channelsRef.current.find((c) => c.projectId === threadId);
        const directConv =
          threadType === "direct"
            ? directConversationsRef.current.find((c) => c.id === threadId)
            : undefined;
        const label =
          threadType === "direct" && directConv
            ? directConv.peerUser.name
            : channel
              ? isDirectChannel(threadType)
                ? channel.peerUser?.name ?? "Direct message"
                : isCompanyTeamChannel(threadType)
                  ? threadType === "company_team_unofficial"
                    ? "Unofficial"
                    : "Official"
                  : `${channel.project.name}${threadType === "project_internal" ? " (Internal)" : ""}`
              : "Discussion channel";
        toast.info(`${comment.authorName} · ${label}`, {
          description: discussionCommentPreview(comment),
          duration: 6000,
          action: {
            label: "Open",
            onClick: () => {
              setSelectedChannelKey(channelKey);
              setMobileChatOpen(true);
            },
          },
        });
      }
    };

    socket.on("comment", handleNewComment);

    const handleCommentDeleted = (data: {
      threadType?: string;
      threadId?: number;
      commentId?: number;
      comment?: Comment;
    }) => {
      const threadType = data.threadType;
      if (
        (threadType !== "project" &&
          threadType !== "project_internal" &&
          threadType !== "company_team" &&
          threadType !== "company_team_unofficial" &&
          threadType !== "direct") ||
        data.threadId == null ||
        data.commentId == null
      ) {
        return;
      }

      applyCommentDeletedToCaches(
        queryClient,
        threadType,
        data.threadId,
        data.commentId,
      );

      // Refresh the sidebar preview from the real latest message (which may be a
      // different, non-deleted message than the one just removed).
      syncChannelPreviewFromThread(
        queryClient,
        setChannelActivity,
        threadType as ProjectDiscussionThreadType,
        data.threadId,
      );
    };

    socket.on("comment:deleted", handleCommentDeleted);

    const handleCommentUpdated = (data: {
      threadType?: string;
      threadId?: number;
      commentId?: number;
      comment?: Comment;
    }) => {
      const threadType = data.threadType;
      if (
        (threadType !== "project" &&
          threadType !== "project_internal" &&
          threadType !== "company_team" &&
          threadType !== "company_team_unofficial" &&
          threadType !== "direct") ||
        data.threadId == null ||
        !data.comment
      ) {
        return;
      }

      applyCommentUpdatedToCaches(queryClient, threadType, data.threadId, data.comment);

      // Only the latest message drives the sidebar preview; recompute from cache.
      syncChannelPreviewFromThread(
        queryClient,
        setChannelActivity,
        threadType as ProjectDiscussionThreadType,
        data.threadId,
      );
    };

    socket.on("comment:updated", handleCommentUpdated);
    return () => {
      socket.off("comment", handleNewComment);
      socket.off("comment:deleted", handleCommentDeleted);
      socket.off("comment:updated", handleCommentUpdated);
    };
  }, [socket, queryClient, onDiscussionsPage]);

  useEffect(() => {
    if (!hasActiveChannel || !user?.id || selectedThreadId == null) return;

    if (selectedChannelKey) {
      setChannelActivity((prev) =>
        upsertChannelActivity(prev, selectedChannelKey, { unreadCount: 0 }),
      );
    }

    if (!selectedProjectUnreadNotifSig || markReadInFlightRef.current) return;

    const cached = queryClient.getQueryData<NotificationListResult>(
      getListNotificationsQueryKey({ unreadOnly: true, limit: 100 }),
    );
    const pending = filterUnreadCommentNotifications(
      cached?.notifications ?? unreadNotificationsData?.notifications ?? [],
      selectedThreadId,
      selectedThreadType,
    ).filter((n) => !markedNotificationIdsRef.current.has(n.id));

    if (pending.length === 0) return;

    const ids = pending.map((n) => n.id);
    ids.forEach((id) => markedNotificationIdsRef.current.add(id));
    removeMarkedNotificationsFromCache(ids);
    markReadInFlightRef.current = true;

    const channelKeyForMark = selectedChannelKey;
    void (async () => {
      try {
        const markRead = markReadMutateRef.current;
        if (!markRead) return;
        for (const id of ids) {
          if (selectedChannelKeyRef.current !== channelKeyForMark) return;
          await markRead({ id });
        }
      } catch (error) {
        ids.forEach((id) => markedNotificationIdsRef.current.delete(id));
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        toastApiError(error, "Could not mark notifications as read");
      } finally {
        if (selectedChannelKeyRef.current === channelKeyForMark) {
          markReadInFlightRef.current = false;
        }
      }
    })();
  }, [
    hasActiveChannel,
    selectedChannelKey,
    selectedThreadId,
    selectedThreadType,
    user?.id,
    selectedProjectUnreadNotifSig,
    removeMarkedNotificationsFromCache,
    queryClient,
  ]);

  useEffect(() => {
    if (channels.length === 0 && !isAdminView && !isLoadingDirectConversations) {
      setSelectedChannelKey(null);
      setMobileChatOpen(false);
      return;
    }

    const fromUrl = readDiscussionsProjectIdFromUrl();
    const fromDirect = readDiscussionsDirectConversationIdFromUrl();
    const fromChannel = readDiscussionsChannelFromUrl();
    if (fromDirect) {
      const directKey = discussionChannelKey("direct", fromDirect);
      const conversation = directConversations.find((c) => c.id === fromDirect);
      if (conversation) {
        setSelectedChannelKey(directKey);
        setMobileChatOpen(true);
        if (isAdminView) {
          setAdminSection(adminSectionForDirectPeer(conversation.peerUser.category));
        }
        clearDiscussionsProjectFromUrl();
        return;
      }
      if (isLoadingDirectConversations) {
        setSelectedChannelKey(directKey);
        setMobileChatOpen(true);
        return;
      }
      clearDiscussionsProjectFromUrl();
      toast.error("Conversation not found or you don't have access.");
      return;
    }
    if (fromChannel === "company_team") {
      const teamKey = discussionChannelKey("company_team", COMPANY_TEAM_THREAD_ID);
      if (channels.some((c) => c.key === teamKey)) {
        setSelectedChannelKey(teamKey);
        setMobileChatOpen(true);
        if (isAdminView) setAdminSection("team");
        clearDiscussionsProjectFromUrl();
        return;
      }
    }
    if (fromChannel === "company_team_unofficial") {
      const unofficialKey = discussionChannelKey(
        "company_team_unofficial",
        COMPANY_TEAM_UNOFFICIAL_THREAD_ID,
      );
      if (channels.some((c) => c.key === unofficialKey)) {
        setSelectedChannelKey(unofficialKey);
        setMobileChatOpen(true);
        if (isAdminView) setAdminSection("team");
        clearDiscussionsProjectFromUrl();
        return;
      }
    }
    if (fromUrl) {
      const preferredKey = discussionChannelKey(
        fromChannel === "project_internal" ? "project_internal" : "project",
        fromUrl,
      );
      if (channels.some((c) => c.key === preferredKey)) {
        setSelectedChannelKey(preferredKey);
        setMobileChatOpen(true);
        clearDiscussionsProjectFromUrl();
        return;
      }
      const fallback = channels.find((c) => c.projectId === fromUrl);
      if (fallback) {
        setSelectedChannelKey(fallback.key);
        setMobileChatOpen(true);
        clearDiscussionsProjectFromUrl();
        return;
      }
    }

    setSelectedChannelKey((current) => {
      if (current && channels.some((c) => c.key === current)) return current;
      if (current && isAdminDirectSelectionKey(current, directConversations)) {
        return current;
      }
      // Admin section switches clear selection intentionally — don't auto-open Team.
      if (isAdminView && current === null) return null;
      return channels[0]?.key ?? null;
    });
  }, [channels, location, isAdminView, directConversations, isLoadingDirectConversations]);

  // Normalize pending 1:1 selection to conversation id once the server row exists.
  useEffect(() => {
    if (!isAdminView || !selectedChannelKey) return;
    const pendingPeer = parsePendingDirectPeerId(selectedChannelKey);
    if (pendingPeer == null) return;
    const conv = directConversations.find((c) => c.peerUser.id === pendingPeer);
    if (!conv) return;
    const resolved = discussionChannelKey("direct", conv.id);
    if (resolved !== selectedChannelKey) {
      setSelectedChannelKey(resolved);
    }
  }, [isAdminView, selectedChannelKey, directConversations]);

  useEffect(() => {
    lastReadSavedSigRef.current = "";
    markReadInFlightRef.current = false;
    setCommentText("");
    setReplyTarget(null);
  }, [selectedChannelKey]);

  const commentsQueryParams =
    hasActiveChannel && selectedThreadId != null
      ? commentThreadQueryParams(selectedThreadType, selectedThreadId)
      : null;

  const { data: commentsData, isLoading: isLoadingComments } = useListComments(
    commentsQueryParams ?? { threadType: selectedThreadType, threadId: 0 },
    {
      query: {
        enabled: hasActiveChannel,
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        structuralSharing: false,
        placeholderData: undefined,
        queryKey: commentsQueryParams
          ? getListCommentsQueryKey(commentsQueryParams)
          : getListCommentsQueryKey({ threadType: selectedThreadType, threadId: 0 }),
        queryFn: async ({ signal }) => {
          const params = commentsQueryParams!;
          const server = await listComments(params, { signal });
          const cached = queryClient.getQueryData<CommentListResult>(
            getListCommentsQueryKey(params),
          );
          return mergeCommentListWithCache(server, cached);
        },
      },
    },
  );

  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();
  const updateCommentMutation = useUpdateComment();

  const canDeleteMessage = useCallback(
    (comment: Comment) => {
      if (!user) return false;
      return comment.authorId === user.id || user.role === "super_admin";
    },
    [user],
  );

  // Only the author may edit their own words (even admins can't rewrite others').
  const canEditMessage = useCallback(
    (comment: Comment) => Boolean(user) && comment.authorId === user!.id,
    [user],
  );

  const handleStartEdit = useCallback((comment: Comment) => {
    setEditingMessage(comment);
    setEditDraft(comment.content ?? "");
  }, []);

  const handleReplyMessage = useCallback((comment: Comment) => {
    setReplyTarget(comment);
  }, []);

  const replyingTo = useMemo(
    () =>
      replyTarget
        ? {
            authorName:
              replyTarget.authorId === user?.id ? "yourself" : replyTarget.authorName,
            preview: replyTarget.isDeleted
              ? "This message was deleted"
              : discussionCommentPreview(replyTarget),
          }
        : null,
    [replyTarget, user?.id],
  );

  const handlePostComment = async (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
    mentionedUserIds?: number[];
  }) => {
    if (!hasActiveChannel || selectedThreadId == null || !user) return;
    if (!payload.content?.trim() && !payload.attachmentUrl) return;

    // Snapshot the reply target now; it may be cleared before the request settles.
    const parentId =
      replyTarget && !isOptimisticCommentId(replyTarget.id) ? replyTarget.id : undefined;
    setReplyTarget(null);

    const tempId = createOptimisticCommentId();
    const optimistic = createOptimisticComment({
      tempId,
      threadType: selectedThreadType,
      threadId: selectedThreadId,
      authorId: user.id,
      authorName: user.name ?? "You",
      authorAvatarUrl: user.avatarUrl,
      authorRole: user.role,
      content: payload.content ?? "",
      attachmentUrl: payload.attachmentUrl,
      attachmentName: payload.attachmentName,
      attachmentMimeType: payload.attachmentMimeType,
      parentId,
    });

    applyProjectCommentToCaches(
      queryClient,
      selectedThreadId,
      optimistic,
      selectedThreadType,
    );
    const channelKey = discussionChannelKey(selectedThreadType, selectedThreadId);
    setChannelActivity((prev) =>
      upsertChannelActivity(
        prev,
        channelKey,
        channelActivityPatchFromComment(optimistic, {
          isActiveChannel: true,
          isOwnMessage: true,
          alreadyRead: true,
          previousUnread: 0,
        }),
      ),
    );

    try {
      const created = await createCommentMutation.mutateAsync({
        data: {
          threadType: selectedThreadType,
          threadId: selectedThreadId,
          content: payload.content ?? "",
          attachmentUrl: payload.attachmentUrl,
          attachmentName: payload.attachmentName,
          attachmentMimeType: payload.attachmentMimeType,
          ...(parentId != null ? { parentId } : {}),
          ...(payload.mentionedUserIds?.length
            ? { mentionedUserIds: payload.mentionedUserIds }
            : {}),
        },
      });
      replaceOptimisticCommentInCache(
        queryClient,
        selectedThreadType,
        selectedThreadId,
        tempId,
        created,
      );
      setChannelActivity((prev) =>
        upsertChannelActivity(
          prev,
          channelKey,
          channelActivityPatchFromComment(created, {
            isActiveChannel: true,
            isOwnMessage: true,
            alreadyRead: true,
            previousUnread: 0,
          }),
        ),
      );
      if (selectedThreadType === "direct") {
        patchDirectConversationFromComment(queryClient, selectedThreadId, {
          lastMessageAt: created.createdAt ?? new Date().toISOString(),
          lastPreview: discussionCommentPreview(created),
          lastAuthorName: created.authorName,
          lastAuthorId: created.authorId,
        });
      }
    } catch (error) {
      removeCommentFromListCache(
        queryClient,
        selectedThreadType,
        selectedThreadId,
        tempId,
      );
      toastApiError(error, "Failed to send message");
      throw error;
    }
  };

  const selectedProject = selectedChannel?.project ?? null;

  const threadSig = commentThreadSignature(commentsData?.comments);

  const channelMessages = useMemo(
    () => flattenCommentThread(commentsData?.comments ?? []),
    [threadSig, commentsData?.comments],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteMessage || !hasActiveChannel || selectedThreadId == null) return;
    const comment = pendingDeleteMessage;
    setPendingDeleteMessage(null);

    try {
      await deleteCommentMutation.mutateAsync({ id: comment.id });
      applyCommentDeletedToCaches(
        queryClient,
        selectedThreadType,
        selectedThreadId,
        comment.id,
      );
      syncChannelPreviewFromThread(
        queryClient,
        setChannelActivity,
        selectedThreadType,
        selectedThreadId,
      );
      toast.success("Message deleted");
    } catch (error) {
      toastApiError(error, "Could not delete message");
    }
  }, [
    pendingDeleteMessage,
    hasActiveChannel,
    selectedThreadId,
    selectedThreadType,
    deleteCommentMutation,
    queryClient,
  ]);

  const handleConfirmEdit = useCallback(async () => {
    if (!editingMessage || selectedThreadId == null) return;
    const text = editDraft.trim();
    if (!text) {
      toast.error("Message can't be empty.");
      return;
    }
    if (text === (editingMessage.content ?? "").trim()) {
      setEditingMessage(null);
      return;
    }

    const target = editingMessage;
    try {
      const updated = await updateCommentMutation.mutateAsync({
        id: target.id,
        data: { content: text },
      });
      applyCommentUpdatedToCaches(queryClient, selectedThreadType, selectedThreadId, updated);
      syncChannelPreviewFromThread(
        queryClient,
        setChannelActivity,
        selectedThreadType,
        selectedThreadId,
      );

      const latest = getLatestThreadComment(
        queryClient,
        selectedThreadType,
        selectedThreadId,
      );
      if (selectedThreadType === "direct" && latest?.id === updated.id) {
        patchDirectConversationFromComment(queryClient, selectedThreadId, {
          lastMessageAt: updated.updatedAt ?? updated.createdAt ?? new Date().toISOString(),
          lastPreview: discussionCommentPreview(updated),
          lastAuthorName: updated.authorName,
          lastAuthorId: updated.authorId,
        });
      }
      setEditingMessage(null);
      toast.success("Message updated");
    } catch (error) {
      toastApiError(error, "Could not update message");
    }
  }, [
    editingMessage,
    editDraft,
    selectedThreadId,
    selectedThreadType,
    updateCommentMutation,
    queryClient,
  ]);

  useEffect(() => {
    if (!hasActiveChannel || !user?.id || isLoadingComments || !threadSig) return;

    const topLevel = commentsData?.comments ?? [];
    const latest = topLevel[topLevel.length - 1];
    if (!latest?.createdAt) return;

    const sig = `${selectedChannelKey}:${latest.id}:${latest.createdAt}`;
    if (lastReadSavedSigRef.current === sig) return;
    lastReadSavedSigRef.current = sig;
    if (selectedChannelKey) {
      saveChannelLastRead(user.id, selectedChannelKey, latest.createdAt);
    }
  }, [
    selectedChannelKey,
    user?.id,
    isLoadingComments,
    threadSig,
    commentsData?.comments,
    hasActiveChannel,
  ]);

  const filteredChannels = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((c) => {
      const title = discussionChannelTitle(c.project.name, c.threadType, c.peerUser).toLowerCase();
      const subtitle = discussionChannelSubtitle(c.threadType, c.peerUser).toLowerCase();
      return (
        c.project.name.toLowerCase().includes(q) ||
        c.peerUser?.name.toLowerCase().includes(q) ||
        c.peerUser?.subtitle?.toLowerCase().includes(q) ||
        title.includes(q) ||
        subtitle.includes(q)
      );
    });
  }, [channels, debouncedSearch]);

  const clientDirectContacts = useMemo(
    () => directContactsData?.clientContacts ?? [],
    [directContactsData?.clientContacts],
  );

  const staffDirectContacts = useMemo(
    () => directContactsData?.staffContacts ?? [],
    [directContactsData?.staffContacts],
  );

  const teamDirectChannels = useMemo(
    () =>
      buildDirectDiscussionChannels(
        directConversations.filter((c) => c.peerUser.category !== "client"),
      ),
    [directConversations],
  );

  const clientDirectChannels = useMemo(
    () =>
      buildDirectDiscussionChannels(
        directConversations.filter((c) => c.peerUser.category === "client"),
      ),
    [directConversations],
  );

  const directPeerActivity = useMemo(() => {
    const out: Record<number, ChannelActivity | undefined> = {};
    for (const conversation of directConversations) {
      const key = discussionChannelKey("direct", conversation.id);
      out[conversation.peerUser.id] = channelActivity[key];
    }
    return out;
  }, [directConversations, channelActivity]);

  const mergedChannelActivity = useMemo(() => {
    const out: Record<string, ChannelActivity> = { ...channelActivity };
    for (const conversation of directConversations) {
      const activity = channelActivity[discussionChannelKey("direct", conversation.id)];
      if (!activity) continue;
      out[pendingDirectChannelKey(conversation.peerUser.id)] = activity;
    }
    for (const [peerId, activity] of Object.entries(directPeerActivity)) {
      if (activity) out[pendingDirectChannelKey(Number(peerId))] = activity;
    }
    return out;
  }, [channelActivity, directConversations, directPeerActivity]);
  // Per-section unread + size, used for the rail badges.
  const sectionSummary = useMemo(() => {
    const summary = {
      teamUnread: 0,
      teamDirectUnread: 0,
      clientsUnread: 0,
      clientsDirectUnread: 0,
      internalUnread: 0,
      clientsCount: 0,
      internalCount: 0,
    };
    for (const c of channels) {
      const unread = channelActivity[c.key]?.unreadCount ?? 0;
      if (isCompanyTeamChannel(c.threadType)) {
        summary.teamUnread += unread;
      } else if (c.threadType === "project") {
        summary.clientsCount += 1;
        summary.clientsUnread += unread;
      } else if (c.threadType === "project_internal") {
        summary.internalCount += 1;
        summary.internalUnread += unread;
      }
    }
    for (const conversation of directConversations) {
      const unread =
        channelActivity[discussionChannelKey("direct", conversation.id)]?.unreadCount ?? 0;
      if (conversation.peerUser.category === "client") {
        summary.clientsDirectUnread += unread;
      } else {
        summary.teamDirectUnread += unread;
      }
    }
    return summary;
  }, [channels, channelActivity, directConversations]);

  const listChannelActivity = isAdminView ? mergedChannelActivity : channelActivity;

  const sortedChannels = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list: DiscussionChannel[];

    if (isAdminView) {
      if (adminSection === "team") {
        list = filteredChannels.filter((c) => isCompanyTeamChannel(c.threadType));
      } else if (adminSection === "team_direct") {
        list = teamDirectChannels;
      } else if (adminSection === "clients") {
        list = filteredChannels.filter((c) => c.threadType === "project");
      } else if (adminSection === "clients_direct") {
        list = clientDirectChannels;
      } else {
        list = filteredChannels.filter((c) => c.threadType === "project_internal");
      }
    } else {
      list = filteredChannels;
    }

    if (channelFilter === "unread") {
      list = list.filter((c) => (listChannelActivity[c.key]?.unreadCount ?? 0) > 0);
    } else if (!isAdminView && channelFilter === "client") {
      list = list.filter((c) => c.threadType === "project");
    } else if (!isAdminView && channelFilter === "internal") {
      list = list.filter(
        (c) => c.threadType === "project_internal" || isCompanyTeamChannel(c.threadType),
      );
    }

    if (q) {
      list = list.filter((c) => channelMatchesSearch(c, q));
    }

    return [...list].sort((a, b) => compareChannelsForChatList(a, b, listChannelActivity));
  }, [
    filteredChannels,
    listChannelActivity,
    channelFilter,
    isAdminView,
    adminSection,
    teamDirectChannels,
    clientDirectChannels,
    debouncedSearch,
  ]);

  const pickerContacts = useMemo(() => {
    if (adminSection === "clients_direct") return clientDirectContacts;
    if (adminSection === "team_direct") return staffDirectContacts;
    return [];
  }, [adminSection, clientDirectContacts, staffDirectContacts]);

  const existingDirectPeerIds = useMemo(() => {
    const ids = new Set<number>();
    for (const c of directConversations) {
      if (adminSection === "team_direct" && c.peerUser.category === "client") continue;
      if (adminSection === "clients_direct" && c.peerUser.category !== "client") continue;
      if (adminSection !== "team_direct" && adminSection !== "clients_direct") continue;
      ids.add(c.peerUser.id);
    }
    return ids;
  }, [directConversations, adminSection]);

  const unreadChannelCount = useMemo(() => {
    return sortedChannels.filter(
      (c) => (listChannelActivity[c.key]?.unreadCount ?? 0) > 0,
    ).length;
  }, [sortedChannels, listChannelActivity]);

  const canFilterByThreadType = canAccessInternalDiscussion(user?.role);
  useEffect(() => {
    if (!canFilterByThreadType && (channelFilter === "client" || channelFilter === "internal")) {
      setChannelFilter("all");
    }
  }, [canFilterByThreadType, channelFilter]);

  // Reset the in-list pill back to "All" whenever the tabbed section changes.
  useEffect(() => {
    if (!isAdminView) return;
    if (channelFilter === "client" || channelFilter === "internal") {
      setChannelFilter("all");
    }
  }, [isAdminView, adminSection, channelFilter]);

  useEffect(() => {
    if (!isAdminView) return;
    setSearchInput("");
  }, [isAdminView, adminSection]);

  // When the selected channel lives in another section, switch tabs so it stays visible.
  useEffect(() => {
    if (!isAdminView || !selectedChannelKey) return;
    const channel =
      channels.find((c) => c.key === selectedChannelKey) ??
      teamDirectChannels.find((c) => isDirectChannelRowSelected(selectedChannelKey, c, directConversations)) ??
      clientDirectChannels.find((c) => isDirectChannelRowSelected(selectedChannelKey, c, directConversations));
    if (!channel) return;
    const target: DiscussionAdminSection =
      channel.threadType === "direct" && channel.peerUser
        ? adminSectionForDirectPeer(channel.peerUser.category)
        : channel.threadType === "company_team" || channel.threadType === "company_team_unofficial"
          ? "team"
          : channel.threadType === "project_internal"
            ? "internal"
            : channel.threadType === "project"
              ? "clients"
              : adminSection;
    setAdminSection((current) => (current === target ? current : target));
  }, [
    isAdminView,
    selectedChannelKey,
    channels,
    teamDirectChannels,
    clientDirectChannels,
    directConversations,
  ]);

  // Keep list selection aligned with Client / Internal filters (client flat list only).
  useEffect(() => {
    if (isAdminView) return;
    if (channelFilter === "all" || channelFilter === "unread") return;
    if (sortedChannels.length === 0) return;
    if (selectedChannelKey && sortedChannels.some((c) => c.key === selectedChannelKey)) {
      return;
    }
    setSelectedChannelKey(sortedChannels[0]!.key);
  }, [channelFilter, sortedChannels, selectedChannelKey, isAdminView]);

  const handleStartDirectChat = useCallback(
    async (contact: DirectConversationPeer) => {
      if (openingDirectPeerRef.current === contact.id) return;
      openingDirectPeerRef.current = contact.id;
      try {
        const result = await createDirectConversation.mutateAsync(contact.id);
        const channelKey = discussionChannelKey("direct", result.conversation.id);
        setAdminSection(adminSectionForDirectPeer(contact.category));
        setSelectedChannelKey(channelKey);
        setMobileChatOpen(true);
        setShowNewConversationPicker(false);
        clearDiscussionsProjectFromUrl();
      } catch (error) {
        const status =
          error && typeof error === "object" && "status" in error
            ? (error as { status?: number }).status
            : undefined;
        if (status === 409) {
          await queryClient.refetchQueries({ queryKey: directConversationsQueryKey });
          const fresh = queryClient.getQueryData<{ conversations: DirectConversation[] }>(
            directConversationsQueryKey,
          );
          const existing = fresh?.conversations.find((c) => c.peerUser.id === contact.id);
          if (existing) {
            setAdminSection(adminSectionForDirectPeer(contact.category));
            setSelectedChannelKey(discussionChannelKey("direct", existing.id));
            setMobileChatOpen(true);
            setShowNewConversationPicker(false);
            clearDiscussionsProjectFromUrl();
            return;
          }
        }
        toastApiError(error, "Could not start conversation");
      } finally {
        openingDirectPeerRef.current = null;
      }
    },
    [createDirectConversation, queryClient],
  );

  const handleSelectDirectMember = useCallback(
    async (contact: DirectConversationPeer) => {
      let existing = directConversations.find((c) => c.peerUser.id === contact.id);
      if (!existing) {
        await queryClient.refetchQueries({ queryKey: directConversationsQueryKey });
        const fresh = queryClient.getQueryData<{ conversations: typeof directConversations }>(
          directConversationsQueryKey,
        );
        existing = fresh?.conversations.find((c) => c.peerUser.id === contact.id);
      }
      if (existing) {
        setAdminSection(adminSectionForDirectPeer(contact.category));
        setSelectedChannelKey(discussionChannelKey("direct", existing.id));
        setMobileChatOpen(true);
        clearDiscussionsProjectFromUrl();
        return;
      }
      await handleStartDirectChat(contact);
    },
    [directConversations, handleStartDirectChat, queryClient],
  );

  const handleSelectChannel = useCallback(
    (channelKey: string) => {
      const resolvedConvId = resolveDirectConversationIdFromKey(channelKey, directConversations);
      if (resolvedConvId != null) {
        setSelectedChannelKey(discussionChannelKey("direct", resolvedConvId));
        clearDiscussionsProjectFromUrl();
        setMobileChatOpen(true);
        return;
      }

      const pendingPeerId = parsePendingDirectPeerId(channelKey);
      if (pendingPeerId != null) {
        const contact =
          staffDirectContacts.find((c) => c.id === pendingPeerId) ??
          clientDirectContacts.find((c) => c.id === pendingPeerId);
        if (contact) {
          void handleSelectDirectMember(contact);
          return;
        }
      }
      setSelectedChannelKey(channelKey);
      clearDiscussionsProjectFromUrl();
      setMobileChatOpen(true);
    },
    [
      directConversations,
      staffDirectContacts,
      clientDirectContacts,
      handleSelectDirectMember,
    ],
  );

  const isChannelSelected = useCallback(
    (channel: DiscussionChannel) =>
      isDirectChannelRowSelected(selectedChannelKey, channel, directConversations),
    [selectedChannelKey, directConversations],
  );

  const handleBackToList = useCallback(() => {
    setMobileChatOpen(false);
  }, []);

  return (
    <PortalPageShell
      className={cn(
        "!space-y-0 !pb-0 flex min-h-0 flex-col overflow-hidden pt-0",
        "h-[calc(100dvh-9rem)] max-h-[calc(100dvh-9rem)]",
        "md:h-[calc(100dvh-7.25rem)] md:max-h-[calc(100dvh-7.25rem)]",
        "lg:h-[calc(100dvh-7.75rem)] lg:max-h-[calc(100dvh-7.75rem)]",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden",
          "-mx-4 w-[calc(100%+2rem)] sm:mx-auto sm:w-full",
        )}
      >
      <div className="flex h-full min-h-0 flex-1 overflow-hidden rounded-none border-y border-border/70 bg-background shadow-md sm:rounded-2xl sm:border ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
        {isAdminView ? (
          <DiscussionSectionRail
            activeSection={adminSection}
            onSectionChange={(section) => {
              setAdminSection(section);
              setSelectedChannelKey(null);
              setMobileChatOpen(false);
            }}
            teamUnread={sectionSummary.teamUnread}
            teamDirectUnread={sectionSummary.teamDirectUnread}
            clientsUnread={sectionSummary.clientsUnread}
            clientsDirectUnread={sectionSummary.clientsDirectUnread}
            internalUnread={sectionSummary.internalUnread}
            clientsCount={sectionSummary.clientsCount}
            internalCount={sectionSummary.internalCount}
            className={mobileChatOpen ? "hidden md:flex" : "flex"}
          />
        ) : null}
        <DiscussionChatList
          channels={channels}
          sortedChannels={sortedChannels}
          channelActivity={listChannelActivity}
          selectedChannelKey={selectedChannelKey}
          isChannelSelected={isAdminView ? isChannelSelected : undefined}
          currentUserId={user?.id}
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          unreadChannelCount={unreadChannelCount}
          showInternalFilter={!isAdminView && canAccessInternalDiscussion(user?.role)}
          availableFilters={isAdminView ? ["all", "unread"] : undefined}
          headerLabel={
            isAdminView
              ? adminSection === "team"
                ? "Office chat"
                : adminSection === "team_direct"
                  ? "Staff messages"
                  : adminSection === "clients"
                    ? "Client channels"
                    : adminSection === "clients_direct"
                      ? "Client messages"
                      : "Internal channels"
              : undefined
          }
          headerSubtitle={
            isAdminView
              ? adminSection === "team"
                ? "Everyone in the office"
                : adminSection === "team_direct"
                  ? "One-to-one with staff members"
                  : adminSection === "clients"
                    ? `${sectionSummary.clientsCount} project${sectionSummary.clientsCount === 1 ? "" : "s"} · visible to clients`
                    : adminSection === "clients_direct"
                      ? "One-to-one with clients"
                      : `${sectionSummary.internalCount} project${sectionSummary.internalCount === 1 ? "" : "s"} · staff only`
              : undefined
          }
          searchPlaceholder={isAdminView ? "Search or start new chat" : undefined}
          emptyStateTitle={
            isAdminView && sortedChannels.length === 0
              ? adminSection === "team"
                ? channelFilter === "unread"
                  ? "Office chat is up to date"
                  : "No office chats yet"
                : adminSection === "team_direct"
                  ? channelFilter === "unread"
                    ? "All caught up"
                    : "No staff conversations yet"
                  : adminSection === "clients"
                    ? channelFilter === "unread"
                      ? "All client channels read"
                      : "No client channels"
                    : adminSection === "clients_direct"
                      ? channelFilter === "unread"
                        ? "All caught up"
                        : "No client conversations yet"
                      : channelFilter === "unread"
                        ? "All internal channels read"
                        : "No internal channels"
              : isClientView && sortedChannels.length === 0
                ? channelFilter === "unread"
                  ? "All caught up"
                  : "No conversations yet"
                : undefined
          }
          emptyStateDescription={
            isAdminView && channelFilter !== "unread"
              ? adminSection === "team"
                ? "Start the conversation — pick Official or Unofficial. Messages go to everyone in the office."
                : adminSection === "team_direct"
                  ? "Start a new conversation with a team member."
                  : adminSection === "clients_direct"
                    ? "Start a new conversation with a client."
                    : undefined
              : isClientView && channelFilter !== "unread"
                ? "Messages from your project team and admins appear here."
                : undefined
          }
          isLoading={
            isLoadingProjects ||
            isLoadingDirectConversations ||
            (isAdminView &&
              isLoadingDirectContacts &&
              (adminSection === "team_direct" || adminSection === "clients_direct"))
          }
          onSelectChannel={handleSelectChannel}
          onNewConversation={
            isAdminView &&
            (adminSection === "team_direct" || adminSection === "clients_direct")
              ? () => setShowNewConversationPicker(true)
              : undefined
          }
          hiddenOnMobile={mobileChatOpen}
        />

        <NewConversationPicker
          open={showNewConversationPicker}
          onClose={() => setShowNewConversationPicker(false)}
          contacts={pickerContacts}
          existingPeerIds={existingDirectPeerIds}
          isLoading={isLoadingDirectContacts}
          onSelectContact={(contact) => {
            void handleSelectDirectMember(contact);
          }}
          title={
            adminSection === "clients_direct" ? "Message a client" : "Message a team member"
          }
        />

        {selectedProject ? (
          <DiscussionChatPanel
            key={selectedChannelKey ?? selectedProject.id}
            className={mobileChatOpen ? "flex" : "hidden md:flex"}
            project={selectedProject}
            threadType={selectedThreadType}
            messages={channelMessages}
            isLoading={isLoadingComments}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            onSubmit={async (payload) => {
              try {
                await handlePostComment(payload);
                setCommentText("");
              } catch {
                /* Composer shows error; keep draft text and staged attachment */
              }
            }}
            isSubmitting={createCommentMutation.isPending}
            currentUserId={user?.id}
            peerUser={selectedChannel?.peerUser}
            canDeleteMessage={canDeleteMessage}
            onDeleteMessage={setPendingDeleteMessage}
            canEditMessage={canEditMessage}
            onEditMessage={handleStartEdit}
            onReplyMessage={handleReplyMessage}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyTarget(null)}
            showBackButton
            onBack={handleBackToList}
          />
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center bg-muted/10 px-6 py-12 text-center md:flex">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-muted/80">
              <MessageSquare className="h-11 w-11 text-muted-foreground/40" />
            </div>
            <h2 className="text-lg font-medium text-foreground/80">Discussions</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {isAdminView && adminSection === "team"
                ? "Select Official or Unofficial to message everyone in the office."
                : isAdminView && adminSection === "team_direct"
                  ? "Select a staff member or start a new conversation."
                  : isAdminView && adminSection === "clients"
                    ? "Select a project channel to open the client chat."
                    : isAdminView && adminSection === "clients_direct"
                      ? "Select a client or start a new conversation."
                      : isClientView
                        ? "Select a project chat or a message from your team."
                        : "Select a chat on the left to send and receive messages."}
            </p>
          </div>
        )}
      </div>
      </div>

      <AlertDialog
        open={pendingDeleteMessage != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteMessage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed for everyone in this chat. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCommentMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editingMessage != null}
        onOpenChange={(open) => {
          if (!open) setEditingMessage(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
            <DialogDescription>
              Update your message. Everyone in this chat will see the change.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleConfirmEdit();
              }
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingMessage(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateCommentMutation.isPending || !editDraft.trim()}
              onClick={() => void handleConfirmEdit()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
