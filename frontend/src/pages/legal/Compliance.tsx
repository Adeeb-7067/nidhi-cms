import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeleteLegalCompliance, useLegalCompliance } from "@/api/legal";
import { formatPercent } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalComplianceFormModal,
} from "@/modules/legal/components";
import type { ComplianceItem } from "@/modules/legal/types";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

function scoreFromItems(items: ComplianceItem[]) {
  if (!items.length) return 100;
  let points = 0;
  for (const item of items) {
    if (item.status === "compliant") points += 1;
    else if (item.status === "partial") points += 0.5;
  }
  return Math.round((points / items.length) * 100);
}

export default function Compliance() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useLegalCompliance({
    q: search || undefined,
    limit: 500,
  });
  const deleteRow = useDeleteLegalCompliance();
  const crud = useLegalListCrud<ComplianceItem>();
  const rows = data?.items ?? [];
  const score = scoreFromItems(rows);
  const compliantCount = rows.filter((c) => c.status === "compliant").length;

  const columns = useMemo<CmsColumn<ComplianceItem>[]>(
    () => [
      { id: "framework", header: "Framework", cell: (c) => <span className="font-medium">{c.framework}</span> },
      {
        id: "requirement",
        header: "Requirement",
        cell: (c) => <span className="max-w-[240px] block">{c.requirement}</span>,
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (c) => <LegalStatusBadge variant="compliance" value={c.status} />,
      },
      { id: "risk", header: "Risk", chip: true, cell: (c) => <LegalRiskBadge level={c.risk} /> },
      {
        id: "lastReview",
        header: "Last review",
        cell: (c) => (
          <span className="text-muted-foreground">{format(new Date(c.lastReview), "MMM d, yyyy")}</span>
        ),
      },
      { id: "nextReview", header: "Next review", cell: (c) => format(new Date(c.nextReview), "MMM d, yyyy") },
      { id: "owner", header: "Owner", cell: (c) => <CounselAvatar name={c.owner?.name ?? "—"} /> },
      {
        id: "actions",
        header: "",
        cell: (c) => (
          <CmsRowActions
            label="Compliance actions"
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
        title="Compliance tracker"
        description="Regulatory and statutory compliance — ROC, GST, DPDP, labour codes, and more."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Compliance" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add item
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
              Overall score
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-2xl font-bold">{formatPercent(score)}</p>
            <Progress value={score} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
              Compliant items
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-2xl font-bold text-green-700">
            {compliantCount}/{rows.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-2xl font-bold text-amber-700">
            {rows.filter((c) => c.status !== "compliant").length}
          </CardContent>
        </Card>
      </div>

      <LegalFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search frameworks, requirements…"
      />

      <CmsDataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{ icon: ShieldCheck, title: "No compliance items found" }}
      />
      <LegalComplianceFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete compliance item?"
        description="This soft-deletes the compliance item."
        loading={deleteRow.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteRow.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Compliance item deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete item"),
          });
        }}
      />
    </PortalPageShell>
  );
}
