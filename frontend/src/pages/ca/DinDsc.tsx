import { useMemo } from "react";
import { format } from "date-fns";
import { KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, type CmsColumn } from "@/components/cms";
import { useCaDinDsc, useDeleteCaDinDsc, type CaDinDscDto } from "@/api/ca";
import { CAPageHeader, ComplianceStatusBadge, CaRowActions, CaDinDscFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const dinDscAlertThresholds = [90, 60, 30] as const;

export default function DinDsc() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const { data, isLoading, isError, refetch } = useCaDinDsc({ limit: 200 });
  const deleteRecord = useDeleteCaDinDsc();
  const crud = useCaListCrud<CaDinDscDto>();
  const rows = data?.records ?? [];

  const columns = useMemo<CmsColumn<CaDinDscDto>[]>(
    () => [
      {
        id: "director",
        header: "Director",
        cell: (d) => <span className="font-medium">{d.directorName}</span>,
      },
      {
        id: "din",
        header: "DIN",
        cell: (d) => <span className="font-mono">{d.din}</span>,
      },
      {
        id: "expiry",
        header: "DSC expiry",
        cell: (d) => (d.dscExpiry ? format(new Date(d.dscExpiry), "MMM d, yyyy") : "—"),
      },
      {
        id: "days",
        header: "Days to expiry",
        cell: (d) => (
          <span
            className={`tabular-nums font-medium ${
              d.daysToExpiry <= 30
                ? "text-red-600"
                : d.daysToExpiry <= 60
                  ? "text-amber-700"
                  : ""
            }`}
          >
            {d.daysToExpiry}d
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (d) => <ComplianceStatusBadge status={d.dscStatus} />,
      },
      {
        id: "actions",
        header: "",
        cell: (d) => (
          <CaRowActions
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(d)}
            onEdit={() => crud.openEdit(d)}
            onDelete={() => crud.setDeleteTarget(d)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="DIN / DSC management"
        description="Director compliance — DSC renewal alerts at 90, 60, and 30 days"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "DIN / DSC" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add record
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {dinDscAlertThresholds.map((t) => (
          <span key={t} className="rounded-full border px-2 py-1 bg-muted/50">
            Alert at {t} days
          </span>
        ))}
      </div>
      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: KeyRound,
          title: "No DIN/DSC records yet",
          description: "Add a director DIN/DSC record to track renewals.",
          actionLabel: canCreate ? "Add record" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaDinDscFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete DIN/DSC record?"
        description="This soft-deletes the DIN/DSC record."
        loading={deleteRecord.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRecord.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("DIN/DSC record deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete DIN/DSC record"),
          });
        }}
      />
    </PortalPageShell>
  );
}
