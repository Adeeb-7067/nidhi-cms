import { useMemo, useState } from "react";
import { Megaphone, Pencil, Ban, Plus } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { PageTableSkeleton } from "@/components/loading";
import {
  PortalPageShell,
  PortalPageHero,
  PortalTabsList,
  PortalTabsTrigger,
  PortalContentCard,
} from "@/components/layout/portal-page-kit";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";
import { AlertFormDialog } from "@/components/alerts/alert-form-dialog";
import { useListAlerts, useCancelAlert, type Alert, type AlertStatus } from "@/api/alerts";

function formatAudience(alert: Alert): string {
  if (alert.audienceType === "all") return "All users";
  if (alert.audienceType === "user") {
    const names = alert.targetUserNames?.length
      ? alert.targetUserNames
      : alert.targetUserName
        ? [alert.targetUserName]
        : alert.targetUserId != null
          ? [`#${alert.targetUserId}`]
          : [];
    return names.length > 0 ? `Users: ${names.join(", ")}` : "Users: —";
  }
  const roles = alert.targetRoles?.length
    ? alert.targetRoles
    : alert.targetRole
      ? [alert.targetRole]
      : [];
  return roles.length > 0 ? `Roles: ${roles.join(", ")}` : "Roles: —";
}

function statusBadgeClass(status: AlertStatus): string {
  if (status === "scheduled") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  if (status === "sent") return "bg-green-500/10 text-green-500 border-green-500/20";
  return "bg-muted text-muted-foreground border-border";
}

export default function AdminAlerts() {
  const [status, setStatus] = useState<AlertStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  const { data, isLoading } = useListAlerts({ status: status === "all" ? undefined : status, limit: 200 });
  const cancelAlert = useCancelAlert();

  const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const { pagination: clientPagination } = useClientPagination(alerts, DEFAULT_TABLE_PAGE_SIZE);

  const openCreate = () => {
    setEditingAlert(null);
    setDialogOpen(true);
  };

  const openEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setDialogOpen(true);
  };

  const handleCancel = (alert: Alert) => {
    cancelAlert.mutate(alert.id, {
      onSuccess: () => toast.success("Alert cancelled"),
      onError: (err) => toastApiError(err, "Failed to cancel alert"),
    });
  };

  const columns: Column<Alert>[] = [
    {
      id: "title",
      header: "Title",
      cell: (alert) => (
        <div className="flex flex-col min-w-[160px] max-w-md">
          <span className="font-medium text-xs whitespace-normal">{alert.title}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 truncate">{alert.description}</span>
        </div>
      ),
    },
    {
      id: "audience",
      header: "Audience",
      cell: (alert) => <span className="text-xs text-muted-foreground">{formatAudience(alert)}</span>,
    },
    {
      id: "scheduledAt",
      header: "Scheduled at",
      cell: (alert) => (
        <span className="text-xs text-muted-foreground">
          {new Date(alert.scheduledAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (alert) => (
        <Badge variant="outline" className={`${statusBadgeClass(alert.status)} text-[10px] px-1.5 py-0 h-4`}>
          {alert.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      hideInDetail: true,
      cell: (alert) =>
        alert.status === "scheduled" ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(alert)}>
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border-red-500/20"
              onClick={() => handleCancel(alert)}
              disabled={cancelAlert.isPending}
            >
              <Ban className="h-3 w-3 mr-1" /> Cancel
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Alert Management"
        subtitle="Schedule announcements that pop up as a modal for the selected audience"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New alert
          </Button>
        }
      />

      <PortalContentCard contentClassName="p-0">
        <div className="p-3 border-b border-border">
          <Tabs value={status} onValueChange={(v) => setStatus(v as AlertStatus | "all")}>
            <PortalTabsList>
              <PortalTabsTrigger value="all">All</PortalTabsTrigger>
              <PortalTabsTrigger value="scheduled">Scheduled</PortalTabsTrigger>
              <PortalTabsTrigger value="sent">Sent</PortalTabsTrigger>
              <PortalTabsTrigger value="cancelled">Cancelled</PortalTabsTrigger>
            </PortalTabsList>
          </Tabs>
        </div>
        <div className="p-4">
          {isLoading ? (
            <PageTableSkeleton rows={6} columns={5} showToolbar />
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Megaphone className="h-8 w-8 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium text-foreground">No alerts yet</p>
              <p className="text-xs text-muted-foreground">
                Schedule an alert to broadcast an announcement to your team.
              </p>
            </div>
          ) : (
            <AdvancedTable
              data={alerts}
              columns={columns}
              searchKey="title"
              searchPlaceholder="Filter alerts..."
              filename="AlertsExport"
              viewStorageKey="admin-alerts"
              showViewToggle
              clientPagination={clientPagination}
            />
          )}
        </div>
      </PortalContentCard>

      <AlertFormDialog open={dialogOpen} onOpenChange={setDialogOpen} alert={editingAlert} />
    </PortalPageShell>
  );
}
