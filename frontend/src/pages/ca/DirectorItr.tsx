import { useMemo, useState } from "react";
import { format } from "date-fns";
import { UserCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useCaDirectorItr, useDeleteCaDirectorItr, type CaDirectorItrDto } from "@/api/ca";
import { formatCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import type { FilingStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CaRowActions, CaDirectorItrFormModal } from "@/modules/ca/components";
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

export default function DirectorItr() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useCaDirectorItr({
    search: search || undefined,
    limit: 200,
  });
  const deleteRecord = useDeleteCaDirectorItr();
  const crud = useCaListCrud<CaDirectorItrDto>();
  const rows = data?.records ?? [];

  const columns = useMemo<CmsColumn<CaDirectorItrDto>[]>(
    () => [
      {
        id: "director",
        header: "Director",
        cell: (d) => <span className="font-medium">{d.directorName}</span>,
      },
      {
        id: "pan",
        header: "PAN",
        cell: (d) => <span className="font-mono">{d.pan}</span>,
      },
      { id: "fy", header: "Financial year", cell: (d) => d.financialYear },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (d) => (
          <CmsStatusChip
            label={FILING_STATUS_LABELS[d.filingStatus]}
            tone={filingTone[d.filingStatus]}
          />
        ),
      },
      {
        id: "due",
        header: "Due date",
        cell: (d) => (d.dueDate ? format(new Date(d.dueDate), "MMM d, yyyy") : "—"),
      },
      {
        id: "tax",
        header: "Tax liability",
        align: "right",
        cell: (d) => <span className="tabular-nums">{formatCurrency(d.taxLiability)}</span>,
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
        title="Director ITR"
        description="Director-wise PAN, filing status, due dates, and tax liability"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Director ITR" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add record
            </Button>
          ) : null
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search directors, PAN…" />
      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: UserCircle,
          title: "No director records found",
          description: "Add a director ITR record to get started.",
          actionLabel: canCreate ? "Add record" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaDirectorItrFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete director ITR record?"
        description="This soft-deletes the director ITR record."
        loading={deleteRecord.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRecord.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Director ITR record deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete director ITR record"),
          });
        }}
      />
    </PortalPageShell>
  );
}
