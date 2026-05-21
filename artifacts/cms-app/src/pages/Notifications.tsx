import React, { useState, useMemo } from "react";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCheck, Mail, MailOpen } from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stopPersistentAlert } from "@/lib/notification-alert";
import { getApiErrorMessage } from "@/lib/api-error";
import { QUERY_STALE } from "@/lib/query-config";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, refetch } = useListNotifications(
    {
      unreadOnly: filter === "unread" ? true : undefined,
      limit: 50,
    },
    {
      query: {
        queryKey: getListNotificationsQueryKey({ unreadOnly: filter === "unread" ? true : undefined, limit: 50 }),
        staleTime: QUERY_STALE.list,
      },
    },
  );

  const markAllRead = useMarkAllNotificationsRead();
  const markOneRead = useMarkNotificationRead();

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

  const handleMarkOne = (id: number) => {
    markOneRead.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          if (unreadCount <= 1) stopPersistentAlert();
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Failed to mark notification as read")),
      },
    );
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const notifStats = useMemo(() => ({
    total: data?.total ?? notifications.length,
    unread: unreadCount,
    read: Math.max(0, (data?.total ?? notifications.length) - unreadCount),
    shown: notifications.length,
  }), [data?.total, notifications.length, unreadCount]);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard title="Total" value={notifStats.total} hint="All notifications" icon={Bell} accent="violet" delay={0} />
          <StatCard title="Unread" value={notifStats.unread} hint="Needs attention" icon={Mail} accent="red" alert={notifStats.unread > 0} delay={1} />
          <StatCard title="Read" value={notifStats.read} hint="Already seen" icon={MailOpen} accent="green" delay={2} />
          <StatCard title="In view" value={notifStats.shown} hint="Loaded items" icon={CheckCheck} accent="blue" delay={3} />
        </PageKpiRow>
      )}

      <div className="flex justify-end">
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleMarkAll} disabled={markAllRead.isPending}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[9px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs mt-1 opacity-70">
                {filter === "unread" ? "No unread notifications" : "New alerts will appear here"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 p-4 transition-colors",
                      isUnread && "bg-primary/5 border-l-2 border-l-primary",
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
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] shrink-0"
                        onClick={() => handleMarkOne(n.id)}
                        disabled={markOneRead.isPending}
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
