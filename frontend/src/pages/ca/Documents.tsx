import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useCaDocuments, useDeleteCaDocument, type CaDocumentDto } from "@/api/ca";
import { DOCUMENT_CATEGORY_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, CaRowActions, CaDocumentFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function Documents() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useCaDocuments({ limit: 200 });
  const deleteDoc = useDeleteCaDocument();
  const crud = useCaListCrud<CaDocumentDto>();
  const documents = data?.documents ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter(
      (d) =>
        !q ||
        d.title.toLowerCase().includes(q) ||
        DOCUMENT_CATEGORY_LABELS[d.category]?.toLowerCase().includes(q),
    );
  }, [search, documents]);

  const columns = useMemo<CmsColumn<CaDocumentDto>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        cell: (d) => (
          <div>
            <span className="font-medium">{d.title}</span>
            {d.fileUrl ? (
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-[10px] text-primary truncate max-w-[220px]"
                onClick={(e) => e.stopPropagation()}
              >
                Open file
              </a>
            ) : null}
          </div>
        ),
      },
      {
        id: "category",
        header: "Category",
        chip: true,
        cell: (d) => (
          <CmsStatusChip label={DOCUMENT_CATEGORY_LABELS[d.category] ?? d.category} tone="neutral" />
        ),
      },
      {
        id: "version",
        header: "Version",
        cell: (d) => <span className="font-mono">{d.version}</span>,
      },
      {
        id: "linked",
        header: "Linked",
        cell: (d) =>
          d.linkedEntityType ? (
            <span className="text-xs text-muted-foreground">
              {d.linkedEntityType.replace(/_/g, " ")}
              {d.linkedEntityId != null ? ` #${d.linkedEntityId}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "uploaded",
        header: "Uploaded",
        cell: (d) => (
          <span className="text-muted-foreground">
            {d.uploadedAt ? format(new Date(d.uploadedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      { id: "by", header: "By", cell: (d) => d.uploadedBy },
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
        title="Document management"
        description="GST certificate, PAN, MOA, AOA, audit reports — version control"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Documents" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Upload
            </Button>
          ) : null
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search documents…" />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: FolderOpen,
          title: "No documents found",
          actionLabel: canCreate ? "Upload document" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaDocumentFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete document?"
        loading={deleteDoc.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteDoc.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Document deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete document"),
          });
        }}
      />
    </PortalPageShell>
  );
}
