import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListProjects,
  useListComments,
  useCreateComment,
  getListCommentsQueryKey,
  type Comment,
  type Project,
} from "@/api";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useRefreshPresenceForUserIds } from "@/hooks/use-presence-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentAuthorPresence } from "@/components/presence/CommentAuthorPresence";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Users, Hash, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  clearDiscussionsProjectFromUrl,
  readDiscussionsProjectIdFromUrl,
  selectDiscussionsProject,
} from "@/lib/discussions-navigation";
import { useLocation } from "wouter";
import {
  appendCommentToListCache,
  commentThreadQueryParams,
  flattenCommentThread,
} from "@/lib/comment-thread-query";
import { CommentBody } from "@/components/chat/comment-body";
import { ChatComposer } from "@/components/chat/chat-composer";
import {
  PortalPageShell,
  PortalKpiGrid,
} from "@/components/layout/portal-page-kit";

type ChannelActivity = {
  lastMessageAt: string;
  unreadCount: number;
  lastPreview?: string;
  lastAuthorName?: string;
};

function commentPreview(comment: Comment): string {
  const text = comment.content?.trim();
  if (text) return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  if (comment.attachmentUrl) {
    if (
      comment.attachmentMimeType === "application/pdf" ||
      comment.attachmentName?.toLowerCase().endsWith(".pdf")
    ) {
      return "Sent a PDF";
    }
    return "Sent an image";
  }
  return "New message";
}

function upsertChannelActivity(
  prev: Record<number, ChannelActivity>,
  projectId: number,
  patch: Partial<ChannelActivity> & { lastMessageAt?: string },
): Record<number, ChannelActivity> {
  const existing = prev[projectId];
  return {
    ...prev,
    [projectId]: {
      lastMessageAt: patch.lastMessageAt ?? existing?.lastMessageAt ?? new Date().toISOString(),
      unreadCount: patch.unreadCount ?? existing?.unreadCount ?? 0,
      lastPreview: patch.lastPreview ?? existing?.lastPreview,
      lastAuthorName: patch.lastAuthorName ?? existing?.lastAuthorName,
    },
  };
}

export default function DiscussionsPage() {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelActivity, setChannelActivity] = useState<Record<number, ChannelActivity>>({});
  const messagesScrollRef = React.useRef<HTMLDivElement>(null);
  const selectedProjectIdRef = useRef<number | null>(null);
  const userIdRef = useRef<number | undefined>(undefined);
  const projectsRef = useRef<Project[]>([]);

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({
    limit: 100,
    ...(searchQuery ? { search: searchQuery } : {}),
  });

  const projects = useMemo(
    () => projectsData?.projects ?? [],
    [projectsData?.projects],
  );
  projectsRef.current = projects;
  selectedProjectIdRef.current = selectedProjectId;
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewComment = (data: {
      threadType?: string;
      threadId?: number;
      comment?: Comment;
    }) => {
      if (data.threadType !== "project" || data.threadId == null || !data.comment) return;

      const projectId = data.threadId;
      const comment = data.comment;
      const isActiveChannel = projectId === selectedProjectIdRef.current;
      const isOwnMessage = comment.authorId === userIdRef.current;

      appendCommentToListCache(queryClient, "project", projectId, comment);

      setChannelActivity((prev) =>
        upsertChannelActivity(prev, projectId, {
          lastMessageAt: comment.createdAt ?? new Date().toISOString(),
          lastPreview: commentPreview(comment),
          lastAuthorName: comment.authorName,
          unreadCount: isActiveChannel || isOwnMessage ? 0 : (prev[projectId]?.unreadCount ?? 0) + 1,
        }),
      );

      if (!isActiveChannel && !isOwnMessage) {
        const projectName =
          projectsRef.current.find((p) => p.id === projectId)?.name ?? "Project channel";
        toast.info(`${comment.authorName} · #${projectName}`, {
          description: commentPreview(comment),
          duration: 6000,
          action: {
            label: "Open",
            onClick: () => selectDiscussionsProject(projectId, setSelectedProjectId),
          },
        });
      }
    };

    socket.on("comment", handleNewComment);
    return () => {
      socket.off("comment", handleNewComment);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    if (!selectedProjectId) return;
    setChannelActivity((prev) => {
      const current = prev[selectedProjectId];
      if (!current?.unreadCount) return prev;
      return upsertChannelActivity(prev, selectedProjectId, { unreadCount: 0 });
    });
  }, [selectedProjectId]);

  // Sync selection with project list / notification deep-link. URL is read once then cleared
  // so switching channels is not forced back to ?project=.
  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId(null);
      return;
    }

    const fromUrl = readDiscussionsProjectIdFromUrl();
    if (fromUrl && projects.some((p) => p.id === fromUrl)) {
      setSelectedProjectId(fromUrl);
      clearDiscussionsProjectFromUrl();
      return;
    }

    setSelectedProjectId((current) => {
      if (current && projects.some((p) => p.id === current)) return current;
      return projects[0].id;
    });
  }, [projects, location]);

  const commentsQueryParams = selectedProjectId
    ? commentThreadQueryParams("project", selectedProjectId)
    : null;

  const { data: commentsData, isLoading: isLoadingComments } = useListComments(
    commentsQueryParams ?? { threadType: "project", threadId: 0 },
    {
      query: {
        enabled: !!selectedProjectId,
        queryKey: commentsQueryParams
          ? getListCommentsQueryKey(commentsQueryParams)
          : getListCommentsQueryKey({ threadType: "project", threadId: 0 }),
      },
    },
  );

  const createCommentMutation = useCreateComment();

  const handlePostComment = async (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
  }) => {
    if (!selectedProjectId) return;
    if (!payload.content?.trim() && !payload.attachmentUrl) return;

    try {
      const created = await createCommentMutation.mutateAsync({
        data: {
          threadType: "project",
          threadId: selectedProjectId,
          content: payload.content ?? "",
          attachmentUrl: payload.attachmentUrl,
          attachmentName: payload.attachmentName,
          attachmentMimeType: payload.attachmentMimeType,
        },
      });
      appendCommentToListCache(queryClient, "project", selectedProjectId, created);
      toast.success("Message sent");
    } catch (error) {
      toastApiError(error, "Failed to send message");
      throw error;
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const channelMessages = useMemo(
    () => flattenCommentThread(commentsData?.comments ?? []),
    [commentsData?.comments],
  );

  const authorIds = useMemo(
    () => [...new Set(channelMessages.map((m) => m.authorId))],
    [channelMessages],
  );
  useRefreshPresenceForUserIds(authorIds);

  const messageCount = channelMessages.length;

  useEffect(() => {
    if (!selectedProjectId || channelMessages.length === 0) return;
    const latest = channelMessages[channelMessages.length - 1];
    setChannelActivity((prev) =>
      upsertChannelActivity(prev, selectedProjectId, {
        lastMessageAt: latest.createdAt ?? new Date().toISOString(),
        lastPreview: commentPreview(latest),
        lastAuthorName: latest.authorName,
        unreadCount: 0,
      }),
    );
  }, [selectedProjectId, channelMessages]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = channelActivity[a.id]?.lastMessageAt;
      const bTime = channelActivity[b.id]?.lastMessageAt;
      if (aTime && bTime) {
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      if (aTime) return -1;
      if (bTime) return 1;
      return 0;
    });
  }, [projects, channelActivity]);

  const totalUnread = useMemo(
    () =>
      Object.entries(channelActivity).reduce(
        (sum, [id, activity]) =>
          Number(id) === selectedProjectId ? sum : sum + activity.unreadCount,
        0,
      ),
    [channelActivity, selectedProjectId],
  );

  const discussionStats = useMemo(() => {
    const inProgress = projects.filter((p) => p.status === "in_progress").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    return {
      channels: projects.length,
      inProgress,
      completed,
      messages: messageCount,
    };
  }, [projects, messageCount]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedProjectId, channelMessages]);

  const scrollMessagesToBottom = () => {
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  return (
    <PortalPageShell className="flex h-[calc(100dvh-5.75rem)] max-h-[calc(100dvh-5.75rem)] flex-col gap-2 overflow-hidden -my-2 pb-0">
      <div className="shrink-0 flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Discussions</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Project channels and team messages
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <PortalKpiGrid
          loading={isLoadingProjects}
          columns={4}
          items={[
            { title: "Channels", value: discussionStats.channels, hint: "Active projects", icon: Hash, accent: "blue", delay: 0 },
            { title: "In progress", value: discussionStats.inProgress, hint: "Open channels", icon: Users, accent: "amber", delay: 1 },
            { title: "Completed", value: discussionStats.completed, hint: "Closed projects", icon: MessageSquare, accent: "green", delay: 2 },
            { title: "Unread", value: totalUnread, hint: "Across channels", icon: Bell, accent: "red", alert: totalUnread > 0, delay: 3 },
          ]}
        />
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {/* Project channels sidebar */}
        <Card className="flex h-full w-[min(100%,280px)] shrink-0 flex-col overflow-hidden border-border/60 sm:w-72">
          <CardHeader className="shrink-0 space-y-2 border-b p-3 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-primary" />
              Project channels
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="h-8 bg-muted/40 pl-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            {isLoadingProjects ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sortedProjects.length > 0 ? (
              <div className="divide-y divide-border">
                {sortedProjects.map((project) => {
                  const activity = channelActivity[project.id];
                  const unread = activity?.unreadCount ?? 0;
                  const hasActivity = Boolean(activity?.lastPreview);
                  return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => selectDiscussionsProject(project.id, setSelectedProjectId)}
                    className={cn(
                      "w-full p-3 text-left transition-colors hover:bg-muted/50",
                      "flex flex-col gap-1 border-l-4",
                      selectedProjectId === project.id
                        ? "border-l-primary bg-primary/5"
                        : unread > 0
                          ? "border-l-primary/40 bg-primary/[0.03]"
                          : "border-l-transparent",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "flex min-w-0 items-center gap-1 text-xs",
                          unread > 0 && selectedProjectId !== project.id
                            ? "font-bold text-foreground"
                            : "font-semibold",
                        )}
                      >
                        <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{project.name}</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {unread > 0 && selectedProjectId !== project.id && (
                          <Badge className="h-4 min-w-4 px-1 text-[9px] tabular-nums bg-primary text-primary-foreground">
                            {unread > 99 ? "99+" : unread}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[8px] h-4 px-1 uppercase tracking-tighter"
                        >
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "truncate pl-4 text-[10px]",
                        unread > 0 && selectedProjectId !== project.id
                          ? "text-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {hasActivity ? (
                        <>
                          <span className="font-medium">{activity?.lastAuthorName}:</span>{" "}
                          {activity?.lastPreview}
                        </>
                      ) : (
                        project.clientName ?? project.companyName ?? "—"
                      )}
                    </p>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-xs">No projects found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat panel */}
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border/60">
          {selectedProject ? (
            <>
              <CardHeader className="shrink-0 border-b bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Hash className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm font-bold">
                        {selectedProject.name}
                      </CardTitle>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Project channel
                        </span>
                        <span>·</span>
                        <span className="truncate">
                          {selectedProject.clientName ?? selectedProject.companyName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="shrink-0 text-[10px] tabular-nums">
                      {messageCount} {messageCount === 1 ? "message" : "messages"}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] uppercase bg-primary/5 text-primary border-primary/10"
                    >
                      {selectedProject.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <div
                ref={messagesScrollRef}
                className="min-h-0 flex-1 overflow-y-auto bg-muted/10 p-4"
              >
                {isLoadingComments ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-2/3" />
                    <Skeleton className="h-16 w-1/2 ml-auto" />
                    <Skeleton className="h-16 w-3/4" />
                  </div>
                ) : channelMessages.length > 0 ? (
                  <div className="space-y-4">
                    {channelMessages.map((comment: Comment) => {
                      const isMe = comment.authorId === user?.id;
                      return (
                        <div
                          key={comment.id}
                          className={cn(
                            "flex items-start gap-3",
                            isMe ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <CommentAuthorPresence
                            authorId={comment.authorId}
                            authorName={comment.authorName}
                            authorAvatarUrl={comment.authorAvatarUrl}
                            className="h-8 w-8 shrink-0 border"
                          />
                          <div
                            className={cn(
                              "flex max-w-[min(100%,28rem)] flex-col space-y-1",
                              isMe ? "items-end" : "items-start",
                            )}
                          >
                            <div className="flex items-center gap-2 px-1">
                              <span className="text-[10px] font-semibold">
                                {comment.authorName}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {comment.createdAt
                                  ? formatDistanceToNow(new Date(comment.createdAt), {
                                      addSuffix: true,
                                    })
                                  : "just now"}
                              </span>
                            </div>
                            <CommentBody
                              comment={comment}
                              onImageLoad={scrollMessagesToBottom}
                              bubbleClassName={cn(
                                isMe
                                  ? "rounded-tr-sm bg-primary text-primary-foreground border-primary/20 [&_img]:border-primary-foreground/20"
                                  : "rounded-tl-sm border border-border bg-card",
                              )}
                              linkClassName={
                                isMe
                                  ? "text-primary-foreground underline decoration-primary-foreground/70 hover:text-primary-foreground/90"
                                  : undefined
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-muted-foreground">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-8 w-8 opacity-50" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">No messages yet</h3>
                    <p className="mt-1 max-w-xs text-xs">
                      Start the conversation for {selectedProject.name}. All project members
                      can see these messages.
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t bg-card p-3">
                <ChatComposer
                  value={commentText}
                  onChange={setCommentText}
                  onSubmit={async (payload) => {
                    await handlePostComment(payload);
                    setCommentText("");
                  }}
                  isSubmitting={createCommentMutation.isPending}
                  placeholder={`Message #${selectedProject.name}...`}
                  textareaClassName="min-h-[40px] max-h-28 py-2.5 text-xs leading-normal"
                />
                <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
                  Enter to send · Shift+Enter for new line · Attach images or PDFs
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Hash className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-semibold">Select a channel</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Choose a project from the list to view and post messages with your team.
              </p>
            </div>
          )}
        </Card>
      </div>
    </PortalPageShell>
  );
}


