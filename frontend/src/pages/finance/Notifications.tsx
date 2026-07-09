import { useMemo, useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  useFinanceNotifications,
  useMarkFinanceNotificationRead,
  useMarkAllFinanceNotificationsRead,
  type FinanceNotification,
} from "@/api/finance";
import { FinancePageHeader, FinanceEmptyState, FinanceErrorState } from "@/modules/finance/components";

function NotificationRow({
  n,
  onMarkRead,
  marking,
}: {
  n: FinanceNotification;
  onMarkRead: (id: number) => void;
  marking: boolean;
}) {
  const row = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        !n.isRead && "border-primary/25 bg-primary/[0.03]",
        n.href && "hover:bg-muted/40 cursor-pointer",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.title}</p>
        {n.body ? (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        ) : null}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!n.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 text-xs"
          disabled={marking}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(n.id);
          }}
        >
          Read
        </Button>
      )}
    </div>
  );

  if (n.href) {
    return <Link href={n.href}>{row}</Link>;
  }
  return row;
}

export default function FinanceNotifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, isLoading, isError, refetch } = useFinanceNotifications({
    unreadOnly: filter === "unread",
    limit: 100,
  });
  const markRead = useMarkFinanceNotificationRead();
  const markAllRead = useMarkAllFinanceNotificationsRead();

  const notifications = data?.notifications ?? [];

  const unreadCount = useMemo(
    () => data?.unreadCount ?? notifications.filter((n) => !n.isRead).length,
    [data, notifications],
  );

  const handleMarkRead = async (id: number) => {
    try {
      await markRead.mutateAsync(id);
    } catch (err) {
      toastApiError(err, "Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success("All marked as read");
    } catch (err) {
      toastApiError(err, "Failed to mark all as read");
    }
  };

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Finance alerts"
        description="Invoice reminders, budget thresholds, and payment updates."
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Notifications" },
        ]}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={markAllRead.isPending}
              onClick={() => void handleMarkAllRead()}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1.5">
        {(["all", "unread"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              filter === tab
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50",
            )}
          >
            {tab === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <FinanceErrorState message="Could not fetch finance alerts." onRetry={() => refetch()} />
      ) : notifications.length === 0 ? (
        <FinanceEmptyState
          icon={Bell}
          title={filter === "unread" ? "All caught up" : "No notifications"}
          description={
            filter === "unread"
              ? "You have no unread finance alerts."
              : "Invoice reminders and budget alerts will show up here."
          }
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              onMarkRead={(id) => void handleMarkRead(id)}
              marking={markRead.isPending}
            />
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
