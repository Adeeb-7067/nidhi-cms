import React, { useEffect, useState, useMemo } from "react";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
  type Notification,
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationClick } from "@/hooks/use-notification-click";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageNotificationListSkeleton } from "@/components/loading";
import { Bell, CheckCheck, ChevronRight, Mail, MailOpen } from "lucide-react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  PortalEmptyState,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import { CmsChipTabs } from "@/components/cms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stopPersistentAlert } from "@/lib/notification-alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { QUERY_STALE } from "@/lib/query-config";
import { DataPagination } from "@/components/ui/data-pagination";
import { useTablePagination } from "@/lib/table-pagination";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  useEffect(() => {
    resetPage();
  }, [filter, resetPage]);

  const { data, isLoading, refetch } = useListNotifications(
    {
      unreadOnly: filter === "unread" ? true : undefined,
      page,
      limit: apiLimit,
    },
    {
      query: {
        queryKey: getListNotificationsQueryKey({
          unreadOnly: filter === "unread" ? true : undefined,
          page,
          limit: apiLimit,
        }),
        staleTime: QUERY_STALE.list,
      },
    },
  );

  const markAllRead = useMarkAllNotificationsRead();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    refetch();
  };

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast.success("All notifications marked as read");
        stopPersistentAlert();
        invalidate();
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Failed to mark notifications as read")),
    });
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const { handleNotificationClick, getTarget, isNavigating } = useNotificationClick({ unreadCount });

  const notifStats = useMemo(() => ({
    total: data?.total ?? notifications.length,
    unread: unreadCount,
    read: Math.max(0, (data?.total ?? notifications.length) - unreadCount),
    shown: notifications.length,
  }), [data?.total, notifications.length, unreadCount]);

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Notifications"
        subtitle="Alerts and updates across your workspace"
      />

      <PortalKpiGrid
        loading={isLoading}
        items={[
          { title: "Total", value: notifStats.total, hint: "All notifications", icon: Bell, accent: "violet" },
          { title: "Unread", value: notifStats.unread, hint: "Needs attention", icon: Mail, accent: "red", alert: notifStats.unread > 0 },
          { title: "Read", value: notifStats.read, hint: "Already seen", icon: MailOpen, accent: "green" },
          { title: "In view", value: notifStats.shown, hint: "Loaded items", icon: CheckCheck, accent: "blue" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CmsChipTabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "unread")}
          items={[
            { value: "all", label: "All", count: notifStats.total },
            { value: "unread", label: "Unread", count: unreadCount },
          ]}
        />
        {unreadCount > 0 && (
          <Button variant="outline" className={portalActionButtonClass()} onClick={handleMarkAll} disabled={markAllRead.isPending}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageNotificationListSkeleton count={6} />
      ) : notifications.length === 0 ? (
        <PortalEmptyState
          icon={Bell}
          title="No notifications"
          description={filter === "unread" ? "No unread notifications" : "New alerts will appear here"}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border bg-card/80">
              {notifications.map((n) => {
                const isUnread = !n.readAt;
                const target = getTarget(n);
                return (
                  <li
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={!isNavigating ? () => handleNotificationClick(n) : undefined}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!isNavigating) handleNotificationClick(n);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 p-4 transition-colors",
                      isUnread && "bg-primary/5 border-l-2 border-l-primary",
                      !isNavigating && "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                      isNavigating && "opacity-60 pointer-events-none",
                    )}
                  >
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Bell className={cn("h-4 w-4", isUnread ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{n.title}</span>
                        {isUnread && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">
                            New
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
                          {n.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {target && (
                        <p className="text-[10px] font-medium text-primary mt-1.5 inline-flex items-center gap-0.5">
                          {target.label}
                          <ChevronRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
      )}

      <DataPagination
        page={page}
        total={data?.total ?? 0}
        limit={limit}
        loadedRowCount={notifications.length}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </PortalPageShell>
  );
}
