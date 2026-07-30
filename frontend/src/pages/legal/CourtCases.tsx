import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useDeleteLegalCourtCase, useLegalCourtCases } from "@/api/legal";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalCourtCaseFormModal,
} from "@/modules/legal/components";
import type { CourtCase } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function CourtCases() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useLegalCourtCases({
    q: search || undefined,
    limit: 500,
  });
  const deleteRow = useDeleteLegalCourtCase();
  const crud = useLegalListCrud<CourtCase>();
  const rows = data?.courtCases ?? [];

  const columns = useMemo<CmsColumn<CourtCase>[]>(
    () => [
      {
        id: "caseNumber",
        header: "Case number",
        cell: (c) => <span className="font-mono font-medium">{c.caseNumber}</span>,
      },
      {
        id: "court",
        header: "Court",
        cell: (c) => <span className="max-w-[140px] block truncate">{c.court}</span>,
      },
      { id: "title", header: "Title", cell: (c) => c.title },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (c) => <LegalStatusBadge variant="courtCase" value={c.status} />,
      },
      { id: "risk", header: "Risk", chip: true, cell: (c) => <LegalRiskBadge level={c.risk} /> },
      {
        id: "nextHearing",
        header: "Next hearing",
        cell: (c) => (
          <span className="text-muted-foreground">
            {c.nextHearing ? format(new Date(c.nextHearing), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      { id: "counsel", header: "Counsel", cell: (c) => <CounselAvatar name={c.assignedTo?.name ?? "—"} /> },
      {
        id: "filed",
        header: "Filed",
        cell: (c) => (
          <span className="text-muted-foreground">{format(new Date(c.openedAt), "MMM d, yyyy")}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (c) => (
          <CmsRowActions
            label="Court case actions"
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(c)}
            onEdit={() => crud.openEdit(c)}
            onDelete={() => crud.setDeleteTarget(c)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Court cases"
        description="Civil, labour, and commercial litigation — hearings and case status."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Court cases" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Register case
            </Button>
          ) : null
        }
      />
      <LegalFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search case numbers, courts…"
      />
      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{ icon: Gavel, title: "No court cases found" }}
      />
      <LegalCourtCaseFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete court case?"
        description="This soft-deletes the court case."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Court case deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete court case"),
          });
        }}
      />
    </PortalPageShell>
  );
}
