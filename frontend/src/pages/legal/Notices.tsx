import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useDeleteLegalNotice, useLegalNotices } from "@/api/legal";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalNoticeFormModal,
} from "@/modules/legal/components";
import type { LegalNotice } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function Notices() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("all");
  const { data, isLoading, isError, refetch } = useLegalNotices({
    q: search || undefined,
    limit: 500,
  });
  const deleteRow = useDeleteLegalNotice();
  const crud = useLegalListCrud<LegalNotice>();
  const rows = data?.notices ?? [];

  const filtered = useMemo(
    () => (direction === "all" ? rows : rows.filter((n) => n.direction === direction)),
    [rows, direction],
  );

  const columns = useMemo<CmsColumn<LegalNotice>[]>(
    () => [
      { id: "reference", header: "Reference", cell: (n) => <span className="font-mono">{n.reference}</span> },
      {
        id: "direction",
        header: "Direction",
        chip: true,
        cell: (n) => (
          <Badge variant={n.direction === "incoming" ? "secondary" : "outline"} className="text-[10px] capitalize">
            {n.direction}
          </Badge>
        ),
      },
      {
        id: "subject",
        header: "Subject",
        cell: (n) => <span className="font-medium max-w-[200px] block truncate">{n.subject}</span>,
      },
      { id: "counterparty", header: "Counterparty", cell: (n) => n.counterparty },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (n) => <LegalStatusBadge variant="notice" value={n.status} />,
      },
      { id: "dueDate", header: "Due date", cell: (n) => format(new Date(n.dueDate), "MMM d, yyyy") },
      { id: "risk", header: "Risk", chip: true, cell: (n) => <LegalRiskBadge level={n.risk} /> },
      { id: "counsel", header: "Counsel", cell: (n) => <CounselAvatar name={n.assignedTo?.name ?? "—"} /> },
      {
        id: "actions",
        header: "",
        cell: (n) => (
          <CmsRowActions
            label="Notice actions"
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
        title="Legal notices"
        description="Track incoming and outgoing legal notices, show-cause letters, and demand notices."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Notices" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Draft notice
            </Button>
          ) : null
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search notices…" />
      <CmsChipTabs
        value={direction}
        onValueChange={setDirection}
        items={[
          { value: "all", label: "All", count: rows.length },
          { value: "incoming", label: "Incoming" },
          { value: "outgoing", label: "Outgoing" },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(n) => n.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{ icon: Mail, title: "No notices found" }}
      />
      <LegalNoticeFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete notice?"
        description="This soft-deletes the legal notice."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Notice deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete notice"),
          });
        }}
      />
    </PortalPageShell>
  );
}
