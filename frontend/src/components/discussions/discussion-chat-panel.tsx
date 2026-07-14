import type { Comment, Project } from "@/api";
import {
  discussionChannelSubtitle,
  discussionChannelTitle,
  isCompanyTeamChannel,
  isDirectChannel,
  type ProjectDiscussionThreadType,
  type DiscussionPeerUser,
} from "@/lib/discussion-channels";
import { useCompanyTeamMentionCandidates } from "@/api/company-team-mentions";
import { useGetProjectMembers, getGetProjectMembersQueryKey } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatComposerPayload } from "@/components/chat/chat-composer";
import {
  buildMentionCandidatesFromMessages,
  projectMembersToMentionCandidates,
} from "@/lib/chat-mentions";
import { CommentAuthorPresence } from "@/components/presence/CommentAuthorPresence";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DiscussionMessageList } from "@/components/discussions/discussion-message-list";
import { ProjectDiscussionAvatar } from "@/components/discussions/project-discussion-avatar";
import { cn } from "@/lib/utils";
import { isChatAttachmentFile } from "@/lib/chat-file-upload";
import { dataTransferHasFiles } from "@/lib/file-drag";
import { ArrowLeft, ChevronDown, MessageSquare, Upload, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type DiscussionChatPanelProps = {
  project: Project;
  threadType?: ProjectDiscussionThreadType;
  messages: Comment[];
  isLoading: boolean;
  isSubmitting?: boolean;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  onSubmit: (payload: ChatComposerPayload) => Promise<void>;
  currentUserId?: number;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  peerUser?: DiscussionPeerUser;
  canDeleteMessage?: (comment: Comment) => boolean;
  onDeleteMessage?: (comment: Comment) => void;
  canEditMessage?: (comment: Comment) => boolean;
  onEditMessage?: (comment: Comment) => void;
  onReplyMessage?: (comment: Comment) => void;
  replyingTo?: { authorName: string; preview: string } | null;
  onCancelReply?: () => void;
};

export function DiscussionChatPanel({
  project,
  threadType = "project",
  messages,
  isLoading,
  isSubmitting = false,
  commentText,
  onCommentTextChange,
  onSubmit,
  currentUserId,
  showBackButton,
  onBack,
  className,
  peerUser,
  canDeleteMessage,
  onDeleteMessage,
  canEditMessage,
  onEditMessage,
  onReplyMessage,
  replyingTo = null,
  onCancelReply,
}: DiscussionChatPanelProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [panelDragOver, setPanelDragOver] = useState(false);
  const [incomingFile, setIncomingFile] = useState<File | null>(null);
  const panelDragDepthRef = useRef(0);

  const isCompanyTeam = isCompanyTeamChannel(threadType);
  const isDirect = isDirectChannel(threadType);

  const { data: projectMembers } = useGetProjectMembers(project.id, {
    query: {
      enabled: !isCompanyTeam && !isDirect && project.id > 0,
      queryKey: getGetProjectMembersQueryKey(project.id),
    },
  });

  const { data: companyTeamMentions } = useCompanyTeamMentionCandidates(isCompanyTeam);

  const mentionCandidates = useMemo(() => {
    const fromMembers = isCompanyTeam
      ? (companyTeamMentions?.candidates ?? [])
      : projectMembersToMentionCandidates(projectMembers, user?.id ?? currentUserId);
    const fromMessages = buildMentionCandidatesFromMessages(messages);
    const map = new Map<number, (typeof fromMembers)[0]>();
    for (const c of [...fromMembers, ...fromMessages]) {
      if (user?.id != null && c.id === user.id) continue;
      if (currentUserId != null && c.id === currentUserId) continue;
      map.set(c.id, c);
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [
    isCompanyTeam,
    companyTeamMentions?.candidates,
    projectMembers,
    messages,
    user?.id,
    currentUserId,
  ]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const lastMessageId = messages.length ? messages[messages.length - 1]!.id : null;

  // Pin to the newest message whenever the thread opens (loading finishes) or a
  // new message arrives. Keying on `isLoading` + last message id (not just
  // `messages.length`) ensures we still scroll when cached messages render right
  // after the loading skeleton without a length change. The rAF pass re-pins
  // after late layout (e.g. wrapped text / fonts) settles.
  useEffect(() => {
    if (isLoading) return undefined;
    scrollToBottom("auto");
    const raf = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(raf);
  }, [project.id, threadType, isLoading, messages.length, lastMessageId, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distance > 120);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [project.id]);

  const participantIds = [...new Set(messages.map((m) => m.authorId))].slice(0, 4);

  const stageDroppedFile = useCallback((file: File) => {
    if (!isChatAttachmentFile(file, { allowApk: true })) {
      toast.error("Drop an image, PDF, or APK file.");
      return;
    }
    setIncomingFile(file);
  }, []);

  const clearIncomingFile = useCallback(() => setIncomingFile(null), []);

  useEffect(() => {
    setPanelDragOver(false);
    panelDragDepthRef.current = 0;
    setIncomingFile(null);
  }, [project.id]);

  useEffect(() => {
    const resetDragUi = () => {
      panelDragDepthRef.current = 0;
      setPanelDragOver(false);
    };
    window.addEventListener("dragend", resetDragUi);
    return () => window.removeEventListener("dragend", resetDragUi);
  }, []);

  const handlePanelDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    panelDragDepthRef.current += 1;
    if (dataTransferHasFiles(e.dataTransfer)) setPanelDragOver(true);
  };

  const handlePanelDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    panelDragDepthRef.current = Math.max(0, panelDragDepthRef.current - 1);
    if (panelDragDepthRef.current === 0) setPanelDragOver(false);
  };

  const handlePanelDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handlePanelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    panelDragDepthRef.current = 0;
    setPanelDragOver(false);
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    if (files.length > 1) toast.message("Using the first file only.");
    stageDroppedFile(files[0]);
  };

  return (
    <main
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#e5ddd5] dark:bg-muted/20",
        className,
      )}
      onDragEnter={handlePanelDragEnter}
      onDragLeave={handlePanelDragLeave}
      onDragOver={handlePanelDragOver}
      onDrop={handlePanelDrop}
    >
      {panelDragOver ? (
        <div
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-emerald-600/15 backdrop-blur-[2px]"
          aria-hidden
        >
          <Upload className="h-10 w-10 text-emerald-700 dark:text-emerald-300" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Drop to attach — image, PDF, or APK
          </p>
        </div>
      ) : null}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border/60 bg-muted/40 px-3 py-3 backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-3.5">
        {showBackButton && onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            onClick={onBack}
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}
        {isCompanyTeam ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Users className="h-5 w-5" />
          </div>
        ) : isDirect && peerUser ? (
          <Avatar className="h-11 w-11 shrink-0">
            {peerUser.avatarUrl ? (
              <AvatarImage src={peerUser.avatarUrl} alt={peerUser.name} />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-primary">
              {peerUser.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <ProjectDiscussionAvatar
            project={project}
            className="h-11 w-11"
            fallbackClassName="bg-primary/15 text-primary"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">
            {discussionChannelTitle(project.name, threadType, peerUser)}
          </h1>
          <p className="truncate text-[11px] text-muted-foreground">
            {discussionChannelSubtitle(threadType, peerUser)}
            {messages.length > 0 && (
              <span className="text-muted-foreground/80">
                {" "}
                · {messages.length} {messages.length === 1 ? "message" : "messages"}
              </span>
            )}
          </p>
        </div>
        {!isDirect && participantIds.length > 0 && (
          <div className="hidden shrink-0 items-center -space-x-2 sm:flex">
            {participantIds.map((id) => {
              const msg = messages.find((m) => m.authorId === id);
              if (!msg) return null;
              return (
                <CommentAuthorPresence
                  key={id}
                  authorId={msg.authorId}
                  authorName={msg.authorName}
                  authorAvatarUrl={msg.authorAvatarUrl}
                  className="h-7 w-7 border-2 border-background"
                />
              );
            })}
          </div>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.045) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        >
          {isLoading ? (
            <div className="mx-auto w-full max-w-3xl space-y-4">
              <Skeleton className="ml-auto h-14 w-[70%] max-w-xs rounded-lg rounded-tr-sm" />
              <Skeleton className="h-14 w-[65%] max-w-xs rounded-lg rounded-tl-sm" />
              <Skeleton className="ml-auto h-10 w-[50%] max-w-xs rounded-lg rounded-tr-sm" />
            </div>
          ) : messages.length > 0 ? (
            <div className="mx-auto w-full max-w-3xl">
              <DiscussionMessageList
                messages={messages}
                currentUserId={currentUserId}
                mentionCandidates={mentionCandidates}
                onImageLoad={() => scrollToBottom("auto")}
                canDeleteMessage={canDeleteMessage}
                onDeleteMessage={onDeleteMessage}
                canEditMessage={canEditMessage}
                onEditMessage={onEditMessage}
                onReplyMessage={onReplyMessage}
              />
            </div>
          ) : (
            <div className="mx-auto flex h-full min-h-[16rem] w-full max-w-md flex-col items-center justify-center rounded-xl bg-white/75 px-8 py-10 text-center shadow-sm dark:bg-card/80">
              <MessageSquare className="mb-2 h-10 w-10 text-muted-foreground/40" />
              <h3 className="text-sm font-semibold">No messages yet</h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {isDirect
                  ? "Send a private message. Only you and this person can see this chat."
                  : "Send a message to start the conversation. Everyone on this project can see it."}
              </p>
            </div>
          )}
        </div>

        {showScrollDown && messages.length > 0 && (
          <Button
            type="button"
            size="icon"
            className="absolute bottom-4 right-5 z-10 h-10 w-10 rounded-full bg-background shadow-lg sm:bottom-5 sm:right-6"
            onClick={() => scrollToBottom()}
            aria-label="Scroll to latest messages"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}
      </div>

      <footer className="shrink-0 bg-[#f0f2f5] px-3 py-2 dark:bg-[#202c33] sm:px-5">
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer
            value={commentText}
            onChange={onCommentTextChange}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            placeholder="Type a message"
            mentionCandidates={mentionCandidates}
            enableEmojiPicker
            enableVoice
            enableApk
            incomingFile={incomingFile}
            onIncomingFileHandled={clearIncomingFile}
            replyingTo={replyingTo}
            onCancelReply={onCancelReply}
          />
        </div>
      </footer>
    </main>
  );
}
