import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListProjects,
  useListComments,
  listComments,
  useCreateComment,
  useListNotifications,
  useMarkNotificationRead,
  useDiscussionPreviews,
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
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildDiscussionChannels,
  canAccessInternalDiscussion,
  COMPANY_TEAM_THREAD_ID,
  discussionChannelKey,
  discussionChannelSubtitle,
  discussionChannelTitle,
  isCompanyTeamChannel,
  type DiscussionChannel,
  type DiscussionChannelFilter,
  type ProjectDiscussionThreadType,
} from "@/lib/discussion-channels";
import {
  clearDiscussionsProjectFromUrl,
  readDiscussionsChannelFromUrl,
  readDiscussionsProjectIdFromUrl,
} from "@/lib/discussions-navigation";
import { useLocation } from "wouter";
import {
  mergeCommentListWithCache,
  commentThreadQueryParams,
  commentThreadSignature,
  createOptimisticComment,
  createOptimisticCommentId,
  flattenCommentThread,
  removeCommentFromListCache,
  replaceOptimisticCommentInCache,
} from "@/lib/comment-thread-query";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
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
  type ChannelActivity,
} from "@/lib/discussions-read-state";
import {
  applyProjectCommentToCaches,
  channelActivityPatchFromComment,
  discussionCommentPreview,
} from "@/lib/discussion-realtime";

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

  const selectedChannelKeyRef = useRef<string | null>(null);
  const userIdRef = useRef<number | undefined>(undefined);
  const channelsRef = useRef<DiscussionChannel[]>([]);
  const markedNotificationIdsRef = useRef(new Set<number>());
  const markReadInFlightRef = useRef(false);
  const markReadMutateRef = useRef<
    (vars: { id: number }) => Promise<void> | undefined
  >(undefined);
  const previewHydrateSigRef = useRef("");
  const notificationHydrateSigRef = useRef("");
  const lastReadSavedSigRef = useRef("");
  const onDiscussionsPage = location.startsWith("/discussions");

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({
    limit: 100,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  const { data: previewData } = useDiscussionPreviews(!!user?.id);

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

  const channels = useMemo(
    () => buildDiscussionChannels(projects, user?.role),
    [projects, user?.role],
  );

  const selectedChannel = useMemo(
    () => channels.find((c) => c.key === selectedChannelKey) ?? null,
    [channels, selectedChannelKey],
  );

  const selectedThreadType: ProjectDiscussionThreadType =
    selectedChannel?.threadType ?? "project";
  const selectedThreadId = selectedChannel?.projectId ?? null;
  const hasActiveChannel = selectedChannel != null && selectedThreadId != null;

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
          threadType !== "company_team") ||
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
        const label = channel
          ? isCompanyTeamChannel(threadType)
            ? "Team"
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
    return () => {
      socket.off("comment", handleNewComment);
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
    if (channels.length === 0) {
      setSelectedChannelKey(null);
      setMobileChatOpen(false);
      return;
    }

    const fromUrl = readDiscussionsProjectIdFromUrl();
    const fromChannel = readDiscussionsChannelFromUrl();
    if (fromChannel === "company_team") {
      const teamKey = discussionChannelKey("company_team", COMPANY_TEAM_THREAD_ID);
      if (channels.some((c) => c.key === teamKey)) {
        setSelectedChannelKey(teamKey);
        setMobileChatOpen(true);
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
      return channels[0]?.key ?? null;
    });
  }, [channels, location]);

  useEffect(() => {
    lastReadSavedSigRef.current = "";
    markReadInFlightRef.current = false;
    setCommentText("");
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

  const handlePostComment = async (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
    mentionedUserIds?: number[];
  }) => {
    if (!hasActiveChannel || selectedThreadId == null || !user) return;
    if (!payload.content?.trim() && !payload.attachmentUrl) return;

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
      const title = discussionChannelTitle(c.project.name, c.threadType).toLowerCase();
      const subtitle = discussionChannelSubtitle(c.threadType).toLowerCase();
      return (
        c.project.name.toLowerCase().includes(q) ||
        title.includes(q) ||
        subtitle.includes(q)
      );
    });
  }, [channels, debouncedSearch]);

  const sortedChannels = useMemo(() => {
    let list = filteredChannels;
    if (channelFilter === "unread") {
      list = list.filter((c) => (channelActivity[c.key]?.unreadCount ?? 0) > 0);
    } else if (channelFilter === "client") {
      list = list.filter((c) => c.threadType === "project");
    } else if (channelFilter === "internal") {
      list = list.filter(
        (c) => c.threadType === "project_internal" || c.threadType === "company_team",
      );
    }

    return [...list].sort((a, b) => compareChannelsForChatList(a, b, channelActivity));
  }, [filteredChannels, channelActivity, channelFilter]);

  const unreadChannelCount = useMemo(
    () => channels.filter((c) => (channelActivity[c.key]?.unreadCount ?? 0) > 0).length,
    [channels, channelActivity],
  );

  const canFilterByThreadType = canAccessInternalDiscussion(user?.role);
  useEffect(() => {
    if (!canFilterByThreadType && (channelFilter === "client" || channelFilter === "internal")) {
      setChannelFilter("all");
    }
  }, [canFilterByThreadType, channelFilter]);

  // Keep list selection aligned with Client / Internal filters (no overlap with hidden channels).
  useEffect(() => {
    if (channelFilter === "all" || channelFilter === "unread") return;
    if (sortedChannels.length === 0) return;
    if (selectedChannelKey && sortedChannels.some((c) => c.key === selectedChannelKey)) {
      return;
    }
    setSelectedChannelKey(sortedChannels[0]!.key);
  }, [channelFilter, sortedChannels, selectedChannelKey]);

  const handleSelectChannel = useCallback((channelKey: string) => {
    setSelectedChannelKey(channelKey);
    clearDiscussionsProjectFromUrl();
    setMobileChatOpen(true);
  }, []);

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
        <DiscussionChatList
          channels={channels}
          sortedChannels={sortedChannels}
          channelActivity={channelActivity}
          selectedChannelKey={selectedChannelKey}
          currentUserId={user?.id}
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          unreadChannelCount={unreadChannelCount}
          showInternalFilter={canAccessInternalDiscussion(user?.role)}
          isLoading={isLoadingProjects}
          onSelectChannel={handleSelectChannel}
          hiddenOnMobile={mobileChatOpen}
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
              Select a project chat on the left to send and receive messages with your team.
            </p>
          </div>
        )}
      </div>
      </div>
    </PortalPageShell>
  );
}
