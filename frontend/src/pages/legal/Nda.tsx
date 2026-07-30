import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Plus, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useDeleteLegalNda, useLegalNdas } from "@/api/legal";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalNdaFormModal,
} from "@/modules/legal/components";
import type { NdaRecord } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function NdaRepository() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const { data, isLoading, isError, refetch } = useLegalNdas({ q: search || undefined, limit: 500 });
  const deleteRow = useDeleteLegalNda();
  const crud = useLegalListCrud<NdaRecord>();
  const rows = data?.ndas ?? [];

  const filtered = useMemo(
    () => (tab === "all" ? rows : rows.filter((n) => n.status === tab)),
    [rows, tab],
  );

  const columns = useMemo<CmsColumn<NdaRecord>[]>(
    () => [
      { id: "party", header: "Party", cell: (n) => <span className="font-medium">{n.partyName}</span> },
      {
        id: "type",
        header: "Type",
        cell: (n) => <span className="capitalize">{n.partyType.replace("_", " ")}</span>,
      },
      { id: "status", header: "Status", chip: true, cell: (n) => <LegalStatusBadge variant="nda" value={n.status} /> },
      {
        id: "signed",
        header: "Signed",
        cell: (n) => (
          <span className="text-muted-foreground">
            {n.signedAt ? format(new Date(n.signedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      { id: "expires", header: "Expires", cell: (n) => format(new Date(n.expiresAt), "MMM d, yyyy") },
      {
        id: "daysLeft",
        header: "Days left",
        cell: (n) => {
          const daysLeft = differenceInDays(new Date(n.expiresAt), new Date());
          return (
            <span className={`font-medium tabular-nums ${daysLeft < 30 ? "text-destructive" : ""}`}>
              {daysLeft > 0 ? `${daysLeft}d` : "Expired"}
            </span>
          );
        },
      },
      { id: "risk", header: "Risk", chip: true, cell: (n) => <LegalRiskBadge level={n.risk} /> },
      { id: "counsel", header: "Counsel", cell: (n) => <CounselAvatar name={n.assignedTo?.name ?? "—"} /> },
      {
        id: "actions",
        header: "",
        cell: (n) => (
          <CmsRowActions
            label="NDA actions"
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(n)}
            onEdit={() => crud.openEdit(n)}
            onDelete={() => crud.setDeleteTarget(n)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="NDA repository"
        description="Non-disclosure agreements with expiry tracking and renewal alerts."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "NDA repository" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add NDA
            </Button>
          ) : null
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search parties…" />
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: rows.length },
          { value: "expiring_soon", label: "Expiring soon" },
          { value: "expired", label: "Expired" },
          { value: "active", label: "Active" },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(n) => n.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{ icon: FileWarning, title: "No NDAs found" }}
      />
      <LegalNdaFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete NDA?"
        description="This soft-deletes the NDA record."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("NDA deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete NDA"),
          });
        }}
      />
    </PortalPageShell>
  );
}
