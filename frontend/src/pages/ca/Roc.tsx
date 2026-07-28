import { useMemo } from "react";
import { format } from "date-fns";
import { Scale, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useCaRocFilings, useDeleteCaRocFiling, type CaRocFilingDto } from "@/api/ca";
import { FILING_STATUS_LABELS, ROC_FORM_LABELS } from "@/modules/ca/constants";
import type { FilingStatus } from "@/modules/ca/types";
import { CAPageHeader, CaRowActions, CaRocFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const filingTone: Record<FilingStatus, "success" | "warning" | "danger" | "neutral"> = {
  filed: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
};

export default function Roc() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const { data, isLoading, isError, refetch } = useCaRocFilings({ limit: 200 });
  const deleteFiling = useDeleteCaRocFiling();
  const crud = useCaListCrud<CaRocFilingDto>();
  const filings = data?.filings ?? [];

  const filed = filings.filter((f) => f.status === "filed").length;
  const pending = filings.filter((f) => f.status === "pending").length;
  const overdue = filings.filter((f) => f.status === "overdue").length;

  const columns = useMemo<CmsColumn<CaRocFilingDto>[]>(
    () => [
      {
        id: "form",
        header: "Form",
        cell: (f) => <span className="font-medium">{ROC_FORM_LABELS[f.form] ?? f.form}</span>,
      },
      { id: "fy", header: "Financial year", cell: (f) => f.financialYear },
      {
        id: "due",
        header: "Due date",
        cell: (f) => (f.dueDate ? format(new Date(f.dueDate), "MMM d, yyyy") : "—"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (f) => (
          <CmsStatusChip label={FILING_STATUS_LABELS[f.status]} tone={filingTone[f.status]} />
        ),
      },
      {
        id: "filed",
        header: "Filed on",
        cell: (f) => (
          <span className="text-muted-foreground">
            {f.filedAt ? format(new Date(f.filedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (f) => (
          <CaRowActions
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(f)}
            onEdit={() => crud.openEdit(f)}
            onDelete={() => crud.setDeleteTarget(f)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="ROC compliance"
        description="AOC-4, MGT-7, ADT-1, DIR-3 KYC — filed, pending, and overdue"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "ROC" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add filing
            </Button>
          ) : null
        }
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Filed", value: String(filed), icon: Scale, accent: "green", delay: 0 },
          { title: "Pending", value: String(pending), icon: Scale, accent: "amber", alert: pending > 0, delay: 1 },
          { title: "Overdue", value: String(overdue), icon: Scale, accent: "red", alert: overdue > 0, delay: 2 },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filings}
        rowKey={(f) => f.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Scale,
          title: "No ROC filings yet",
          description: "Add an ROC filing to track compliance.",
          actionLabel: canCreate ? "Add filing" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaRocFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete ROC filing?"
        description="This soft-deletes the ROC filing record."
        loading={deleteFiling.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteFiling.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("ROC filing deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete ROC filing"),
          });
        }}
      />
    </PortalPageShell>
  );
}
