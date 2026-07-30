import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useDeleteLegalVendorDispute, useLegalVendorDisputes } from "@/api/legal";
import { formatCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalVendorDisputeFormModal,
} from "@/modules/legal/components";
import type { VendorDispute } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function VendorDisputes() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useLegalVendorDisputes({
    q: search || undefined,
    limit: 500,
  });
  const deleteRow = useDeleteLegalVendorDispute();
  const crud = useLegalListCrud<VendorDispute>();
  const rows = data?.disputes ?? [];

  const columns = useMemo<CmsColumn<VendorDispute>[]>(
    () => [
      { id: "vendor", header: "Vendor", cell: (d) => <span className="font-medium">{d.vendorName}</span> },
      {
        id: "contract",
        header: "Contract",
        cell: (d) => <span className="font-mono text-muted-foreground">{d.contractRef}</span>,
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (d) => <LegalStatusBadge variant="vendorDispute" value={d.status} />,
      },
      { id: "risk", header: "Risk", chip: true, cell: (d) => <LegalRiskBadge level={d.risk} /> },
      {
        id: "amount",
        header: "Amount in dispute",
        align: "right",
        cell: (d) => (
          <span className="font-medium tabular-nums">{formatCurrency(d.amountInDispute)}</span>
        ),
      },
      { id: "counsel", header: "Counsel", cell: (d) => <CounselAvatar name={d.assignedTo?.name ?? "—"} /> },
      {
        id: "opened",
        header: "Opened",
        cell: (d) => (
          <span className="text-muted-foreground">{format(new Date(d.openedAt), "MMM d, yyyy")}</span>
        ),
      },
      {
        id: "summary",
        header: "Summary",
        cell: (d) => <span className="max-w-[200px] block truncate">{d.summary}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: (d) => (
          <CmsRowActions
            label="Dispute actions"
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
      <LegalPageHeader
        title="Vendor disputes"
        description="Contract disagreements, SLA breaches, and vendor litigation."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Vendor disputes" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Log dispute
            </Button>
          ) : null
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search vendors, contracts…" />
      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Handshake,
          title: "No disputes",
          description: "Log a vendor dispute to track negotiation and litigation.",
        }}
      />
      <LegalVendorDisputeFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete dispute?"
        description="This soft-deletes the vendor dispute."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Dispute deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete dispute"),
          });
        }}
      />
    </PortalPageShell>
  );
}
