import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, type CmsColumn } from "@/components/cms";
import { useCaSuspense, useDeleteCaSuspense, type CaSuspenseDto } from "@/api/ca";
import { formatCurrency, formatCompactCurrency, PAYMENT_MODE_LABELS } from "@/modules/ca/constants";
import {
  CAPageHeader,
  CAFilterBar,
  CaRowActions,
  CaSuspenseFormModal,
  CaSuspenseAssignModal,
} from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function Suspense() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const canAssign = can("ca", "edit");
  const [search, setSearch] = useState("");
  const [assignEntry, setAssignEntry] = useState<CaSuspenseDto | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<"client" | "vendor">("client");
  const { data, isLoading, isError, refetch } = useCaSuspense({ resolved: "false", limit: 200 });
  const deleteEntry = useDeleteCaSuspense();
  const crud = useCaListCrud<CaSuspenseDto>();

  const entries = data?.entries ?? [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(
      (e) => !q || e.bankRef.toLowerCase().includes(q) || e.remarks.toLowerCase().includes(q),
    );
  }, [search, entries]);

  const total = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount ?? 0), 0), [filtered]);

  const openAssign = useCallback((entry: CaSuspenseDto, target: "client" | "vendor") => {
    setAssignEntry(entry);
    setAssignTarget(target);
    setAssignOpen(true);
  }, []);

  const columns = useMemo<CmsColumn<CaSuspenseDto>[]>(
    () => [
      {
        id: "received",
        header: "Received",
        cell: (e) => (
          <span className="text-muted-foreground">
            {e.receivedAt ? format(new Date(e.receivedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (e) => <span className="font-medium tabular-nums">{formatCurrency(e.amount)}</span>,
      },
      { id: "mode", header: "Mode", cell: (e) => PAYMENT_MODE_LABELS[e.mode] },
      {
        id: "bankRef",
        header: "Bank ref",
        cell: (e) => <span className="font-mono">{e.bankRef}</span>,
      },
      {
        id: "age",
        header: "Age",
        cell: (e) => <span className="tabular-nums">{e.ageDays}d</span>,
      },
      {
        id: "remarks",
        header: "Remarks",
        cell: (e) => <span className="max-w-[200px] block truncate">{e.remarks}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: (e) => (
          <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
            {canAssign ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => openAssign(e, "client")}
                >
                  Client
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => openAssign(e, "vendor")}
                >
                  Vendor
                </Button>
              </>
            ) : null}
            <CaRowActions
              canView
              canEdit={canEdit}
              canDelete={canDelete}
              onView={() => crud.openView(e)}
              onEdit={() => crud.openEdit(e)}
              onDelete={() => crud.setDeleteTarget(e)}
            />
          </div>
        ),
      },
    ],
    [canAssign, canEdit, canDelete, crud, openAssign],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Suspense account"
        description="Unidentified receipts awaiting client/vendor assignment"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Suspense" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add entry
            </Button>
          ) : null
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search bank ref, remarks…" />
      <PortalKpiGrid
        columns={2}
        items={[
          {
            title: "Open entries",
            value: String(filtered.length),
            icon: AlertTriangle,
            accent: "amber",
            delay: 0,
          },
          {
            title: "Suspense amount",
            value: formatCompactCurrency(total),
            icon: AlertTriangle,
            accent: "red",
            alert: total > 0,
            delay: 1,
          },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: AlertTriangle,
          title: "No open suspense entries",
          description: "Add a suspense entry for unidentified receipts.",
          actionLabel: canCreate ? "Add entry" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaSuspenseFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CaSuspenseAssignModal
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignEntry(null);
        }}
        entry={assignEntry}
        initialTarget={assignTarget}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete suspense entry?"
        description="This soft-deletes the suspense entry."
        loading={deleteEntry.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteEntry.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Suspense entry deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete suspense entry"),
          });
        }}
      />
    </PortalPageShell>
  );
}
