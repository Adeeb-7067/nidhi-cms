import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListProjects,
  useListComments,
  useCreateComment,
  getListCommentsQueryKey,
} from "@workspace/api-client-react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Search, Users, Hash, Briefcase, Activity } from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { readDiscussionsProjectIdFromUrl } from "@/lib/discussions-navigation";

export default function DiscussionsPage() {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewComment = (data: { threadType?: string; threadId?: number }) => {
      if (data.threadType === "project" && data.threadId === selectedProjectId) {
        queryClient.invalidateQueries({
          queryKey: getListCommentsQueryKey({
            threadType: "project",
            threadId: selectedProjectId as number,
          }),
        });
      }
    };

    socket.on("comment", handleNewComment);
    return () => {
      socket.off("comment", handleNewComment);
    };
  }, [socket, selectedProjectId, queryClient]);

  const { data: projectsData, isLoading: isLoadingProjects } = useListProjects({
    limit: 100,
    ...(searchQuery ? { search: searchQuery } : {}),
  });

  const projects = projectsData?.projects ?? [];

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId(null);
      return;
    }
    const fromUrl = readDiscussionsProjectIdFromUrl();
    if (fromUrl && projects.some((p) => p.id === fromUrl)) {
      setSelectedProjectId(fromUrl);
      return;
    }
    if (!selectedProjectId || !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const { data: commentsData, isLoading: isLoadingComments } = useListComments(
    { threadType: "project", threadId: selectedProjectId as number },
    {
      query: {
        enabled: !!selectedProjectId,
        queryKey: getListCommentsQueryKey({
          threadType: "project",
          threadId: selectedProjectId as number,
        }),
      },
    },
  );

  const createCommentMutation = useCreateComment();

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedProjectId) return;

    try {
      await createCommentMutation.mutateAsync({
        data: {
          threadType: "project",
          threadId: selectedProjectId,
          content: commentText.trim(),
        },
      });
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: getListCommentsQueryKey({
          threadType: "project",
          threadId: selectedProjectId,
        }),
      });
      toast.success("Message sent");
    } catch (error) {
      toastApiError(error, "Failed to send message");
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const discussionStats = useMemo(() => {
    const inProgress = projects.filter((p) => p.status === "in_progress").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    return {
      channels: projects.length,
      inProgress,
      completed,
      messages: commentsData?.comments?.length ?? 0,
    };
  }, [projects, commentsData?.comments?.length]);

  return (
    <div className="flex h-[calc(100dvh-7.25rem)] max-h-[calc(100dvh-7.25rem)] flex-col gap-3 overflow-hidden -my-2">
      <div className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight">Discussions</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Project channels and team messages
        </p>
      </div>

      <div className="shrink-0">
        {isLoadingProjects ? (
          <PageKpiSkeleton />
        ) : (
          <PageKpiRow>
            <StatCard
              title="Channels"
              value={discussionStats.channels}
              hint="Project threads"
              icon={Hash}
              accent="violet"
              delay={0}
            />
            <StatCard
              title="In progress"
              value={discussionStats.inProgress}
              hint="Active projects"
              icon={Activity}
              accent="blue"
              delay={1}
            />
            <StatCard
              title="Completed"
              value={discussionStats.completed}
              hint="Finished projects"
              icon={Briefcase}
              accent="green"
              delay={2}
            />
            <StatCard
              title="Messages"
              value={discussionStats.messages}
              hint="Current channel"
              icon={MessageSquare}
              accent="amber"
              delay={3}
            />
          </PageKpiRow>
        )}
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
            ) : projects.length > 0 ? (
              <div className="divide-y divide-border">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className={cn(
                      "w-full p-3 text-left transition-colors hover:bg-muted/50",
                      "flex flex-col gap-1 border-l-4",
                      selectedProjectId === project.id
                        ? "border-l-primary bg-primary/5"
                        : "border-l-transparent",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1 text-xs font-semibold">
                        <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{project.name}</span>
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[8px] h-4 px-1 uppercase tracking-tighter"
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="truncate pl-4 text-[10px] text-muted-foreground">
                      {project.clientName ?? project.companyName ?? "â€”"}
                    </p>
                  </button>
                ))}
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
                        <span>â€¢</span>
                        <span className="truncate">
                          {selectedProject.clientName ?? selectedProject.companyName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px] uppercase bg-primary/5 text-primary border-primary/10"
                  >
                    {selectedProject.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>

              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10 p-4">
                {isLoadingComments ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-2/3" />
                    <Skeleton className="h-16 w-1/2 ml-auto" />
                    <Skeleton className="h-16 w-3/4" />
                  </div>
                ) : commentsData && commentsData.comments.length > 0 ? (
                  <div className="space-y-4">
                    {commentsData.comments.map((comment: {
                      id: number;
                      authorId?: number;
                      authorName: string;
                      authorAvatarUrl?: string | null;
                      content: string;
                      createdAt?: string;
                    }) => {
                      const isMe = comment.authorId === user?.id;
                      return (
                        <div
                          key={comment.id}
                          className={cn(
                            "flex items-start gap-3",
                            isMe ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <Avatar className="h-8 w-8 shrink-0 border">
                            <AvatarImage src={comment.authorAvatarUrl ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                              {comment.authorName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
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
                            <div
                              className={cn(
                                "rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm",
                                isMe
                                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                                  : "rounded-tl-sm border border-border bg-card",
                              )}
                            >
                              {comment.content}
                            </div>
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
                <form onSubmit={handlePostComment} className="flex items-end gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={`Message #${selectedProject.name}...`}
                    className="min-h-[40px] max-h-28 flex-1 resize-none rounded-xl border-border/60 py-2.5 text-xs leading-normal"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handlePostComment(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-lg"
                    disabled={!commentText.trim() || createCommentMutation.isPending}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
                  Enter to send · Shift+Enter for new line
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
    </div>
  );
}


