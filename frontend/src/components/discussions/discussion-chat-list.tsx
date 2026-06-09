import React from "react";
import type { ChannelActivity } from "@/lib/discussions-read-state";
import {
  discussionChannelSubtitle,
  discussionChannelTitle,
  isCompanyTeamChannel,
  type DiscussionChannel,
  type DiscussionChannelFilter,
} from "@/lib/discussion-channels";
import { formatChatListPreview, formatChatListTime } from "@/lib/discussion-chat-format";
import { ProjectDiscussionAvatar } from "@/components/discussions/project-discussion-avatar";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MessageCircle, Lock, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListCommentsQueryOptions } from "@/api";
import { commentThreadQueryParams } from "@/lib/comment-thread-query";

const ChatListRow = React.memo(function ChatListRow({
  channel,
  activity,
  unread,
  isSelected,
  currentUserId,
  onSelect,
  onPrefetch,
}: {
  channel: DiscussionChannel;
  activity?: ChannelActivity;
  unread: number;
  isSelected: boolean;
  currentUserId?: number;
  onSelect: () => void;
  onPrefetch: () => void;
}) {
  const { project, threadType } = channel;
  const hasActivity = Boolean(activity?.lastPreview);
  const preview = formatChatListPreview({
    preview: hasActivity ? activity?.lastPreview : undefined,
    authorName: activity?.lastAuthorName,
    authorId: activity?.lastAuthorId,
    currentUserId,
  });
  const timeLabel = formatChatListTime(activity?.lastMessageAt);
  const isInternal = threadType === "project_internal";
  const isCompanyTeam = isCompanyTeamChannel(threadType);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
        className={cn(
          "flex w-full gap-3.5 px-3.5 py-3 text-left transition-colors sm:px-4",
          isSelected ? "bg-muted/70" : "hover:bg-muted/40",
        )}
      >
        {isCompanyTeam ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12",
              isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Users className="h-5 w-5" />
          </div>
        ) : (
          <ProjectDiscussionAvatar
            project={project}
            className="h-11 w-11 sm:h-12 sm:w-12"
            fallbackClassName={
              isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }
          />
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "truncate text-[13px]",
                unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground",
              )}
            >
              {discussionChannelTitle(project.name, threadType)}
            </span>
            {timeLabel ? (
              <span
                className={cn(
                  "shrink-0 text-[10px] tabular-nums",
                  unread > 0 ? "font-medium text-emerald-600" : "text-muted-foreground",
                )}
              >
                {timeLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-[11px]",
                unread > 0 ? "font-medium text-foreground/85" : "text-muted-foreground",
              )}
            >
              {hasActivity ? (
                preview
              ) : (
                <span className="inline-flex items-center gap-1">
                  {isInternal || isCompanyTeam ? (
                    <Lock className="h-3 w-3 shrink-0 opacity-70" />
                  ) : null}
                  {discussionChannelSubtitle(threadType)}
                </span>
              )}
            </p>
            {unread > 0 ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold tabular-nums text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
});

type DiscussionChatListProps = {
  channels: DiscussionChannel[];
  sortedChannels: DiscussionChannel[];
  channelActivity: Record<string, ChannelActivity>;
  selectedChannelKey: string | null;
  currentUserId?: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  channelFilter: DiscussionChannelFilter;
  onChannelFilterChange: (filter: DiscussionChannelFilter) => void;
  unreadChannelCount: number;
  showInternalFilter?: boolean;
  isLoading: boolean;
  onSelectChannel: (channelKey: string) => void;
  className?: string;
  hiddenOnMobile?: boolean;
};

export function DiscussionChatList({
  channels,
  sortedChannels,
  channelActivity,
  selectedChannelKey,
  currentUserId,
  searchQuery,
  onSearchChange,
  channelFilter,
  onChannelFilterChange,
  unreadChannelCount,
  showInternalFilter = false,
  isLoading,
  onSelectChannel,
  className,
  hiddenOnMobile,
}: DiscussionChatListProps) {
  const queryClient = useQueryClient();

  const prefetchThread = (channel: DiscussionChannel) => {
    const params = commentThreadQueryParams(channel.threadType, channel.projectId);
    void queryClient.prefetchQuery(getListCommentsQueryOptions(params));
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-border/70 bg-background",
        "md:min-w-[280px] md:max-w-[min(100%,24rem)] md:flex-[0_0_32%]",
        "lg:max-w-[26rem] lg:flex-[0_0_30%]",
        hiddenOnMobile && "hidden md:flex",
        className,
      )}
    >
      <header className="shrink-0 border-b border-border/70 bg-muted/30 px-4 py-3.5 sm:py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Chats</h2>
          {unreadChannelCount > 0 && (
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
              {unreadChannelCount} unread
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search or start new chat"
            className="h-10 rounded-xl border-0 bg-muted/60 pl-9 text-sm shadow-none focus-visible:ring-1"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChannelFilterChange("all")}
            className={cn(
              "rounded-full px-3 py-2 text-[11px] font-medium transition-colors md:py-1.5",
              channelFilter === "all"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onChannelFilterChange("unread")}
            className={cn(
              "rounded-full px-3 py-2 text-[11px] font-medium transition-colors md:py-1.5",
              channelFilter === "unread"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            Unread{unreadChannelCount > 0 ? ` · ${unreadChannelCount}` : ""}
          </button>
          {showInternalFilter ? (
            <>
              <button
                type="button"
                onClick={() => onChannelFilterChange("client")}
                className={cn(
                  "rounded-full px-3 py-2 text-[11px] font-medium transition-colors md:py-1.5",
                  channelFilter === "client"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => onChannelFilterChange("internal")}
                className={cn(
                  "rounded-full px-3 py-2 text-[11px] font-medium transition-colors md:py-1.5",
                  channelFilter === "internal"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Internal
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className="dialog-scroll h-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3.5 px-4 py-3.5">
                <Skeleton className="h-11 w-11 shrink-0 rounded-full sm:h-12 sm:w-12" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedChannels.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {sortedChannels.map((channel) => (
              <ChatListRow
                key={channel.key}
                channel={channel}
                activity={channelActivity[channel.key]}
                unread={channelActivity[channel.key]?.unreadCount ?? 0}
                isSelected={selectedChannelKey === channel.key}
                currentUserId={currentUserId}
                onSelect={() => onSelectChannel(channel.key)}
                onPrefetch={() => prefetchThread(channel)}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-muted-foreground">
            <MessageCircle className="mb-2 h-10 w-10 opacity-25" />
            <p className="text-xs font-medium">
              {channelFilter === "unread"
                ? "No unread chats"
                : channelFilter === "client"
                  ? "No client chats"
                  : channelFilter === "internal"
                    ? "No internal chats"
                    : channels.length === 0
                      ? "No projects found"
                      : "No chats match your search"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
