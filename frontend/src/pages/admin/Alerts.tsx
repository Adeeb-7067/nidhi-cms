import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Clock, Megaphone, Pencil, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsRowActions } from "@/components/cms";
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

  const { data, isLoading } = useListAlerts({ limit: 200 });
  const cancelAlert = useCancelAlert();

  const allAlerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const filtered = useMemo(
    () => (status === "all" ? allAlerts : allAlerts.filter((a) => a.status === status)),
    [allAlerts, status],
  );
  const { pagination: clientPagination, setPage } = useClientPagination(
    filtered,
    DEFAULT_TABLE_PAGE_SIZE,
  );

  const scheduledCount = allAlerts.filter((a) => a.status === "scheduled").length;
  const sentCount = allAlerts.filter((a) => a.status === "sent").length;
  const cancelledCount = allAlerts.filter((a) => a.status === "cancelled").length;

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
        <div className="flex min-w-[160px] max-w-md flex-col">
          <span className="text-xs font-medium whitespace-normal">{alert.title}</span>
          <span className="mt-0.5 truncate text-[10px] text-muted-foreground">{alert.description}</span>
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
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(alert.scheduledAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (alert) => (
        <Badge variant="outline" className={`${statusBadgeClass(alert.status)} h-4 px-1.5 py-0 text-[10px]`}>
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
          <CmsRowActions
            label="Alert actions"
            items={[
              {
                label: "Edit",
                icon: Pencil,
                onSelect: () => openEdit(alert),
              },
              {
                label: "Cancel",
                icon: Ban,
                onSelect: () => handleCancel(alert),
                disabled: cancelAlert.isPending,
                variant: "destructive",
                separatorBefore: true,
              },
            ]}
          />
        ) : null,
    },
  ];

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Alert Management"
        subtitle="Schedule announcements that pop up as a modal for the selected audience"
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> New alert
          </Button>
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        items={[
          { title: "Total alerts", value: allAlerts.length, icon: Megaphone, accent: "violet", delay: 0 },
          { title: "Scheduled", value: scheduledCount, icon: Clock, accent: "blue", delay: 1 },
          { title: "Sent", value: sentCount, icon: CheckCircle2, accent: "green", delay: 2 },
          { title: "Cancelled", value: cancelledCount, icon: XCircle, accent: "red", delay: 3 },
        ]}
      />

      <CmsChipTabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as AlertStatus | "all");
          setPage(1);
        }}
        items={[
          { value: "all", label: "All", count: allAlerts.length },
          { value: "scheduled", label: "Scheduled", count: scheduledCount },
          { value: "sent", label: "Sent", count: sentCount },
          { value: "cancelled", label: "Cancelled", count: cancelledCount },
        ]}
      />

      {isLoading ? (
        <div className="rounded-md border border-border/60 py-16 text-center text-xs text-muted-foreground">
          Loading alerts…
        </div>
      ) : (
        <AdvancedTable
          data={filtered}
          columns={columns}
          searchKey="title"
          searchPlaceholder="Filter alerts…"
          filename="AlertsExport"
          viewStorageKey="admin-alerts"
          showViewToggle
          clientPagination={clientPagination}
        />
      )}

      <AlertFormDialog open={dialogOpen} onOpenChange={setDialogOpen} alert={editingAlert} />
    </PortalPageShell>
  );
}
