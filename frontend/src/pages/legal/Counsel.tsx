import { useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useDeleteLegalCounsel, useLegalCounsel } from "@/api/legal";
import type { LegalCounsel } from "@/modules/legal/types";
import { COUNSEL_ROLE_LABELS } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  CounselAvatar,
  LegalCounselFormModal,
} from "@/modules/legal/components";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function LegalCounselPage() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useLegalCounsel({
    q: search || undefined,
    limit: 200,
  });
  const deleteRow = useDeleteLegalCounsel();
  const crud = useLegalListCrud<LegalCounsel>();
  const rows = data?.counsel ?? [];

  const columns = useMemo<CmsColumn<LegalCounsel>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (c) => <CounselAvatar name={c.name} />,
      },
      {
        id: "email",
        header: "Email",
        cell: (c) => <span className="text-muted-foreground">{c.email}</span>,
      },
      {
        id: "role",
        header: "Role",
        cell: (c) => COUNSEL_ROLE_LABELS[c.role] ?? c.role,
      },
      {
        id: "actions",
        header: "",
        cell: (c) => (
          <CmsRowActions
            label="Counsel actions"
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
        title="Counsel directory"
        description="Internal and external counsel assigned to legal matters."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Counsel" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add counsel
            </Button>
          ) : null
        }
      />
      <LegalFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search counsel by name or email…"
      />
      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Scale,
          title: "No counsel yet",
          description: "Add legal head, associates, or external firms so matters can be assigned.",
          actionLabel: canCreate ? "Add counsel" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <LegalCounselFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete counsel?"
        description="Existing matters keep their assigned snapshot. New assignments will no longer list this person."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Counsel deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete counsel"),
          });
        }}
      />
    </PortalPageShell>
  );
}
