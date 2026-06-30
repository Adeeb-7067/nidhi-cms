import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  UserPlus,
  FileCheck,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCheck,
  Receipt,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { cn } from "@/lib/utils";
import type { SalesNotificationType } from "@/modules/sales/types";
import { SalesPageHeader, SalesEmptyState } from "@/modules/sales/components";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  useSalesNotifications,
  useMarkSalesNotificationRead,
  useMarkAllSalesNotificationsRead,
  type SalesAlertNotification,
} from "@/api/sales";

const typeIcons: Record<SalesNotificationType, typeof Bell> = {
  lead_assigned: UserPlus,
  proposal_approved: FileCheck,
  follow_up_reminder: Clock,
  payment_received: CreditCard,
  overdue_payment: AlertCircle,
  receipt_generated: Receipt,
  installment_due: CalendarClock,
  outstanding_reminder: AlertCircle,
};

const priorityStyles = {
  low: "bg-slate-500/10 text-slate-600 border-slate-500/25",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  high: "bg-red-500/10 text-red-600 border-red-500/25",
};

function normalizeType(type: string): SalesNotificationType {
  const key = type.replace(/^sales_/, "") as SalesNotificationType;
  return typeIcons[key] ? key : "outstanding_reminder";
}

function NotificationRow({
  n,
  onMarkRead,
  marking,
}: {
  n: SalesAlertNotification;
  onMarkRead: (id: number) => void;
  marking: boolean;
}) {
  const displayType = normalizeType(n.type);
  const Icon = typeIcons[displayType] ?? Bell;
  const inner = (
    <Card
      className={cn(
        "transition-colors",
        !n.isRead && "border-primary/20 bg-primary/[0.02]",
        n.href && "hover:border-primary/30 cursor-pointer",
      )}
    >
      <CardContent className="p-4 flex gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            n.isRead ? "bg-muted" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</p>
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize shrink-0",
                priorityStyles[n.priority],
              )}
            >
              {n.priority}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
          <p className="text-[10px] text-muted-foreground/80 mt-1.5">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!n.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs shrink-0 self-center"
            disabled={marking}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkRead(n.id);
            }}
          >
            Mark read
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (n.href) {
    return <Link href={n.href}>{inner}</Link>;
  }
  return inner;
}

export default function SalesNotifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data, isLoading, isError, refetch } = useSalesNotifications({
    unreadOnly: filter === "unread",
    limit: 100,
  });
  const markRead = useMarkSalesNotificationRead();
  const markAllRead = useMarkAllSalesNotificationsRead();

  const notifications = data?.notifications ?? [];

  const stats = useMemo(
    () => ({
      total: data?.total ?? notifications.length,
      unread: data?.unreadCount ?? notifications.filter((n) => !n.isRead).length,
      read: (data?.total ?? notifications.length) - (data?.unreadCount ?? 0),
    }),
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
      <SalesPageHeader
        title="Notifications"
        description="Sales alerts, reminders, and payment updates."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Notifications" },
        ]}
        actions={
          stats.unread > 0 ? (
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

      <PortalKpiGrid
        columns={3}
        count={3}
        items={[
          { title: "Total", value: stats.total, icon: Bell, accent: "violet", delay: 0 },
          { title: "Unread", value: stats.unread, icon: AlertCircle, accent: "red", alert: stats.unread > 0, delay: 1 },
          { title: "Read", value: stats.read, icon: CheckCheck, accent: "green", delay: 2 },
        ]}
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">
            Unread {stats.unread > 0 && `(${stats.unread})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState
          icon={Bell}
          title="Failed to load notifications"
          description="Could not fetch sales alerts."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : notifications.length === 0 ? (
        <SalesEmptyState
          icon={Bell}
          title={filter === "unread" ? "All caught up" : "No notifications"}
          description={
            filter === "unread"
              ? "You have no unread sales notifications."
              : "Alerts for overdue follow-ups, invoices, and payments appear here."
          }
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <NotificationRow
                n={n}
                onMarkRead={(id) => void handleMarkRead(id)}
                marking={markRead.isPending}
              />
            </motion.div>
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
