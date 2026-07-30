import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useDeleteLegalAgreement, useLegalAgreements } from "@/api/legal";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalAgreementFormModal,
} from "@/modules/legal/components";
import type { AgreementRecord } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function Agreements() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useLegalAgreements({
    q: search || undefined,
    limit: 500,
  });
  const deleteRow = useDeleteLegalAgreement();
  const crud = useLegalListCrud<AgreementRecord>();
  const rows = data?.agreements ?? [];

  const columns = useMemo<CmsColumn<AgreementRecord>[]>(
    () => [
      { id: "title", header: "Title", cell: (a) => <span className="font-medium">{a.title}</span> },
      { id: "counterparty", header: "Counterparty", cell: (a) => a.counterparty },
      { id: "type", header: "Type", cell: (a) => <span className="uppercase">{a.type}</span> },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (a) => <LegalStatusBadge variant="agreement" value={a.status} />,
      },
      {
        id: "effective",
        header: "Effective",
        cell: (a) => (
          <span className="text-muted-foreground">{format(new Date(a.effectiveFrom), "MMM d, yyyy")}</span>
        ),
      },
      { id: "renewal", header: "Renewal", cell: (a) => format(new Date(a.renewalDate), "MMM d, yyyy") },
      {
        id: "renewalIn",
        header: "Renewal in",
        cell: (a) => {
          const daysToRenewal = differenceInDays(new Date(a.renewalDate), new Date());
          return (
            <span className={`tabular-nums ${daysToRenewal < 60 ? "text-amber-600 font-medium" : ""}`}>
              {daysToRenewal > 0 ? `${daysToRenewal}d` : "Overdue"}
            </span>
          );
        },
      },
      { id: "risk", header: "Risk", chip: true, cell: (a) => <LegalRiskBadge level={a.risk} /> },
      { id: "counsel", header: "Counsel", cell: (a) => <CounselAvatar name={a.assignedTo?.name ?? "—"} /> },
      {
        id: "actions",
        header: "",
        cell: (a) => (
          <CmsRowActions
            label="Agreement actions"
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(a)}
            onEdit={() => crud.openEdit(a)}
            onDelete={() => crud.setDeleteTarget(a)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Agreement management"
        description="MSAs, SLAs, employment contracts, and vendor agreements with renewal reminders."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Agreements" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> New agreement
            </Button>
          ) : null
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search agreements…" />
      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{ icon: FileText, title: "No agreements found" }}
      />
      <LegalAgreementFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete agreement?"
        description="This soft-deletes the agreement."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Agreement deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete agreement"),
          });
        }}
      />
    </PortalPageShell>
  );
}
