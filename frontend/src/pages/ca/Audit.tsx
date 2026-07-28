import { useMemo } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, type CmsColumn } from "@/components/cms";
import { useCaAudits, useDeleteCaAudit, type CaAuditDto } from "@/api/ca";
import { AUDIT_PHASE_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, ComplianceStatusBadge, CaRowActions, CaAuditFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function Audit() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const { data, isLoading, isError, refetch } = useCaAudits({ limit: 200 });
  const deleteAudit = useDeleteCaAudit();
  const crud = useCaListCrud<CaAuditDto>();
  const records = data?.records ?? [];
  const statutory = records.find((a) => a.type === "statutory") ?? records[0];

  const columns = useMemo<CmsColumn<CaAuditDto>[]>(
    () => [
      {
        id: "type",
        header: "Type",
        cell: (a) => <span className="capitalize font-medium">{a.type}</span>,
      },
      {
        id: "auditor",
        header: "Auditor",
        cell: (a) => <span className="max-w-[180px] block truncate">{a.auditor}</span>,
      },
      { id: "period", header: "Period", cell: (a) => a.financialYear },
      { id: "phase", header: "Phase", cell: (a) => AUDIT_PHASE_LABELS[a.phase] },
      {
        id: "observations",
        header: "Observations",
        cell: (a) => <span className="tabular-nums">{a.observations}</span>,
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (a) => <ComplianceStatusBadge status={a.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: (a) => (
          <CaRowActions
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
      <CAPageHeader
        title="Audit management"
        description="Internal audit observations, statutory audit, and auditor details"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Audit" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add audit
            </Button>
          ) : null
        }
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Statutory auditor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Firm</span>
            <p className="font-medium">{statutory?.firm || statutory?.auditor || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Partner</span>
            <p className="font-medium">{statutory?.partner || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Membership no.</span>
            <p className="font-medium font-mono">{statutory?.membershipNo || "—"}</p>
          </div>
        </CardContent>
      </Card>
      <CmsDataTable
        columns={columns}
        rows={records}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: ShieldCheck,
          title: "No audit records yet",
          description: "Add an audit record to track observations and status.",
          actionLabel: canCreate ? "Add audit" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaAuditFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete audit record?"
        description="This soft-deletes the audit record."
        loading={deleteAudit.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteAudit.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Audit record deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete audit record"),
          });
        }}
      />
    </PortalPageShell>
  );
}
