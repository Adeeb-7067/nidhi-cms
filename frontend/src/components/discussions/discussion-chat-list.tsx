import React from "react";
import type { ChannelActivity } from "@/lib/discussions-read-state";
import {
  discussionChannelSubtitle,
  discussionChannelTitle,
  isCompanyTeamChannel,
  isDigitalDiscussionProject,
  isDirectChannel,
  parsePendingDirectPeerId,
  type DiscussionChannel,
  type DiscussionChannelFilter,
} from "@/lib/discussion-channels";
import { formatChatListPreview, formatChatListTime } from "@/lib/discussion-chat-format";
import { ProjectDiscussionAvatar } from "@/components/discussions/project-discussion-avatar";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MessageCircle, Lock, Users, UserPlus, Megaphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const isDirect = isDirectChannel(threadType);
  const isDigital = isDigitalDiscussionProject(project);
  const displayTitle = discussionChannelTitle(project.name, threadType, channel.peerUser);
  const displaySubtitle = discussionChannelSubtitle(threadType, channel.peerUser, project);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
          isSelected
            ? "bg-primary/10"
            : "hover:bg-muted/50",
        )}
      >
        {isCompanyTeam ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Users className="h-5 w-5" />
          </div>
        ) : isDirect && channel.peerUser ? (
          <Avatar className="h-11 w-11 shrink-0">
            {channel.peerUser.avatarUrl ? (
              <AvatarImage src={channel.peerUser.avatarUrl} alt={channel.peerUser.name} />
            ) : null}
            <AvatarFallback className={isSelected ? "bg-primary/20 text-primary" : "bg-muted"}>
              {channel.peerUser.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="relative shrink-0">
            <ProjectDiscussionAvatar
              project={project}
              className="h-11 w-11"
              fallbackClassName={
                isDigital
                  ? isSelected
                    ? "bg-violet-500/20 text-violet-700 dark:text-violet-300"
                    : "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                  : isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }
            />
            {isDigital && !isInternal ? (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-violet-600 text-white">
                <Megaphone className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "truncate text-sm",
                  unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground",
                )}
              >
                {displayTitle}
              </span>
              {isDigital && (threadType === "project" || threadType === "project_internal") ? (
                <span className="shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Digital
                </span>
              ) : null}
            </span>
            {timeLabel ? (
              <span
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  unread > 0 ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {timeLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-xs",
                unread > 0 ? "font-medium text-foreground/80" : "text-muted-foreground",
              )}
            >
              {hasActivity ? (
                preview
              ) : (
                <span className="inline-flex items-center gap-1">
                  {isInternal || isCompanyTeam ? (
                    <Lock className="h-3 w-3 shrink-0 opacity-60" />
                  ) : null}
                  {displaySubtitle}
                </span>
              )}
            </p>
            {unread > 0 ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
});

export type DiscussionChatListTab = {
  id: string;
  label: string;
  unread?: number;
};

type DiscussionChatListProps = {
  channels: DiscussionChannel[];
  sortedChannels: DiscussionChannel[];
  channelActivity: Record<string, ChannelActivity>;
  selectedChannelKey: string | null;
  isChannelSelected?: (channel: DiscussionChannel) => boolean;
  currentUserId?: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  /** Optional top tabs (admin sections). When provided, replaces filter pills. */
  tabs?: DiscussionChatListTab[];
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  /** Legacy filter pills — only rendered when no tabs are provided. */
  channelFilter: DiscussionChannelFilter;
  onChannelFilterChange: (filter: DiscussionChannelFilter) => void;
  unreadChannelCount: number;
  showInternalFilter?: boolean;
  availableFilters?: ReadonlyArray<DiscussionChannelFilter>;
  headerLabel?: string;
  headerSubtitle?: string;
  searchPlaceholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  isLoading: boolean;
  onSelectChannel: (channelKey: string) => void;
  /** Admin: open contact picker to start a new 1:1 chat. */
  onNewConversation?: () => void;
  className?: string;
  hiddenOnMobile?: boolean;
};

const DEFAULT_FILTERS: ReadonlyArray<DiscussionChannelFilter> = [
  "all",
  "unread",
  "client",
  "internal",
];

export function DiscussionChatList({
  channels,
  sortedChannels,
  channelActivity,
  selectedChannelKey,
  isChannelSelected,
  currentUserId,
  searchQuery,
  onSearchChange,
  tabs,
  activeTabId,
  onTabChange,
  channelFilter,
  onChannelFilterChange,
  unreadChannelCount,
  showInternalFilter = false,
  availableFilters,
  headerLabel,
  headerSubtitle,
  searchPlaceholder,
  emptyStateTitle,
  emptyStateDescription,
  isLoading,
  onSelectChannel,
  onNewConversation,
  className,
  hiddenOnMobile,
}: DiscussionChatListProps) {
  const hasTabs = tabs && tabs.length > 0;
  const filters: ReadonlyArray<DiscussionChannelFilter> =
    availableFilters ?? DEFAULT_FILTERS;
  const showClientFilter = !hasTabs && filters.includes("client") && showInternalFilter;
  const showInternalPill = !hasTabs && filters.includes("internal") && showInternalFilter;
  const showAllFilter = !hasTabs && filters.includes("all");
  const showUnreadFilter = !hasTabs && filters.includes("unread");
  const queryClient = useQueryClient();

  const prefetchThread = (channel: DiscussionChannel) => {
    if (parsePendingDirectPeerId(channel.key) != null) return;
    if (channel.threadType === "direct" && channel.projectId < 0) return;
    const params = commentThreadQueryParams(channel.threadType, channel.projectId);
    void queryClient.prefetchQuery(getListCommentsQueryOptions(params));
  };

  const hasRows = sortedChannels.length > 0;

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
      <header
        className={cn(
          "shrink-0 border-b border-border/70 px-4 py-3.5 sm:py-4",
          headerSubtitle ? "bg-muted/30" : "bg-background pt-4 pb-3",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className={cn("truncate font-semibold tracking-tight", headerSubtitle ? "text-sm" : "text-base")}>
              {headerLabel ?? "Messages"}
            </h2>
            {headerSubtitle ? (
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                {headerSubtitle}
              </p>
            ) : null}
          </div>
          {unreadChannelCount > 0 && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                headerSubtitle
                  ? "bg-emerald-500 text-white"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {headerSubtitle ? `${unreadChannelCount} unread` : unreadChannelCount}
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder ?? "Search"}
            className="h-9 rounded-lg border border-border/60 bg-muted/40 pl-9 text-sm shadow-none focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/30"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {hasTabs ? (
          <div
            role="tablist"
            aria-label="Discussion sections"
            className="mt-3 flex items-center gap-1 overflow-x-auto overflow-y-hidden rounded-lg bg-muted/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs!.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium leading-none transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.unread != null && tab.unread > 0 ? (
                    <span
                      className={cn(
                        "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {tab.unread > 99 ? "99+" : tab.unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (showAllFilter || showUnreadFilter || showClientFilter || showInternalPill) ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {showAllFilter && (
              <button
                type="button"
                onClick={() => onChannelFilterChange("all")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                  channelFilter === "all"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                All
              </button>
            )}
            {showUnreadFilter && (
              <button
                type="button"
                onClick={() => onChannelFilterChange("unread")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                  channelFilter === "unread"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Unread{unreadChannelCount > 0 ? ` · ${unreadChannelCount}` : ""}
              </button>
            )}
            {showClientFilter && (
              <button
                type="button"
                onClick={() => onChannelFilterChange("client")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                  channelFilter === "client"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Client
              </button>
            )}
            {showInternalPill && (
              <button
                type="button"
                onClick={() => onChannelFilterChange("internal")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                  channelFilter === "internal"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Internal
              </button>
            )}
          </div>
        ) : null}
      </header>

      {onNewConversation ? (
        <div className="shrink-0 border-b border-border/60 px-3 py-2">
          <button
            type="button"
            onClick={onNewConversation}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            <UserPlus className="h-3.5 w-3.5" />
            New conversation
          </button>
        </div>
      ) : null}

      <div className="dialog-scroll h-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border/40">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 px-3 py-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : hasRows ? (
          <ul className="divide-y divide-border/40">
            {sortedChannels.map((channel) => (
              <ChatListRow
                key={channel.key}
                channel={channel}
                activity={channelActivity[channel.key]}
                unread={channelActivity[channel.key]?.unreadCount ?? 0}
                isSelected={isChannelSelected?.(channel) ?? selectedChannelKey === channel.key}
                currentUserId={currentUserId}
                onSelect={() => onSelectChannel(channel.key)}
                onPrefetch={() => prefetchThread(channel)}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-muted-foreground">
            <MessageCircle className="mb-2 h-10 w-10 opacity-25" />
            <p className="text-sm font-medium">
              {emptyStateTitle ??
                (channelFilter === "unread"
                  ? "No unread chats"
                  : channelFilter === "client"
                    ? "No client chats"
                    : channelFilter === "internal"
                      ? "No internal chats"
                      : channels.length === 0
                        ? "No conversations yet"
                        : "Nothing matches your search")}
            </p>
            {emptyStateDescription ? (
              <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground/80">
                {emptyStateDescription}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
