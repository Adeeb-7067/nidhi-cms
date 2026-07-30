import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useDeleteLegalClientMatter, useLegalClientMatters } from "@/api/legal";
import { formatCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalClientMatterFormModal,
} from "@/modules/legal/components";
import type { ClientMatter } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function ClientMattersPage() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useLegalClientMatters({
    q: search || undefined,
    limit: 500,
  });
  const deleteRow = useDeleteLegalClientMatter();
  const crud = useLegalListCrud<ClientMatter>();
  const rows = data?.matters ?? [];

  const columns = useMemo<CmsColumn<ClientMatter>[]>(
    () => [
      { id: "client", header: "Client", cell: (m) => <span className="font-medium">{m.clientName}</span> },
      { id: "matter", header: "Matter", cell: (m) => m.matterTitle },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (m) => <LegalStatusBadge variant="clientMatter" value={m.status} />,
      },
      { id: "risk", header: "Risk", chip: true, cell: (m) => <LegalRiskBadge level={m.risk} /> },
      {
        id: "contractValue",
        header: "Contract value",
        align: "right",
        cell: (m) => <span className="font-medium tabular-nums">{formatCurrency(m.contractValue)}</span>,
      },
      { id: "counsel", header: "Counsel", cell: (m) => <CounselAvatar name={m.assignedTo?.name ?? "—"} /> },
      {
        id: "opened",
        header: "Opened",
        cell: (m) => (
          <span className="text-muted-foreground">{format(new Date(m.openedAt), "MMM d, yyyy")}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (m) => (
          <CmsRowActions
            label="Matter actions"
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(m)}
            onEdit={() => crud.openEdit(m)}
            onDelete={() => crud.setDeleteTarget(m)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Client legal matters"
        description="Contract disputes, IP issues, and client-facing legal work."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Client matters" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> New matter
            </Button>
          ) : null
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search clients, matters…" />
      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{ icon: Building2, title: "No client matters found" }}
      />
      <LegalClientMatterFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete matter?"
        description="This soft-deletes the client matter."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Matter deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete matter"),
          });
        }}
      />
    </PortalPageShell>
  );
}
