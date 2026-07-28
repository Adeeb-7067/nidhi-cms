import { useState } from "react";
import { format } from "date-fns";
import { FileText, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog } from "@/components/cms";
import { useCaCompanyItr, useDeleteCaCompanyItr, type CaCompanyItrDto } from "@/api/ca";
import { formatCompactCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CaCompanyItrFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function CompanyItr() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const { data, isLoading, isError, refetch } = useCaCompanyItr({ limit: 20 });
  const deleteItr = useDeleteCaCompanyItr();
  const crud = useCaListCrud<CaCompanyItrDto>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const records = data?.records ?? [];
  const itr = records[0];

  if (isError) {
    return (
      <PortalPageShell>
        <CAPageHeader
          title="Company ITR"
          description="Corporate income tax return"
          breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Company ITR" }]}
        />
        <button type="button" className="text-sm underline" onClick={() => void refetch()}>
          Could not load — retry
        </button>
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Company ITR"
        description="Corporate income tax return — revenue, profit, liability, and filing status"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Company ITR" }]}
        actions={
          canCreate && !itr ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add ITR
            </Button>
          ) : canEdit && itr ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-8" onClick={() => crud.openView(itr)}>
                View
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => crud.openEdit(itr)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              {canDelete ? (
                <Button size="sm" variant="destructive" className="h-8" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              ) : null}
            </div>
          ) : itr ? (
            <Button size="sm" variant="outline" className="h-8" onClick={() => crud.openView(itr)}>
              View
            </Button>
          ) : null
        }
      />
      <PortalKpiGrid
        columns={4}
        items={[
          {
            title: "Revenue",
            value: isLoading || !itr ? "…" : formatCompactCurrency(itr.revenue),
            icon: FileText,
            accent: "green",
            delay: 0,
          },
          {
            title: "Expenses",
            value: isLoading || !itr ? "…" : formatCompactCurrency(itr.expenses),
            icon: FileText,
            accent: "red",
            delay: 1,
          },
          {
            title: "Profit before tax",
            value: isLoading || !itr ? "…" : formatCompactCurrency(itr.profitBeforeTax),
            icon: FileText,
            accent: "blue",
            delay: 2,
          },
          {
            title: "Tax liability",
            value: isLoading || !itr ? "…" : formatCompactCurrency(itr.taxLiability),
            icon: FileText,
            accent: "amber",
            delay: 3,
          },
        ]}
      />
      {!itr && !isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground text-center space-y-3">
            <p>No company ITR record yet.</p>
            {canCreate ? (
              <Button size="sm" className="gap-1.5" onClick={crud.openCreate}>
                <Plus className="h-3.5 w-3.5" /> Add ITR
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : itr ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">FY {itr.financialYear}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Filing status</span>
                <p className="font-medium">{FILING_STATUS_LABELS[itr.filingStatus]}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Due date</span>
                <p className="font-medium">
                  {itr.dueDate ? format(new Date(itr.dueDate), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Filed on</span>
                <p className="font-medium">
                  {itr.filedAt ? format(new Date(itr.filedAt), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Documents
            </p>
            {(itr.documents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No checklist documents attached.</p>
            ) : (
              (itr.documents ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{d.name}</span>
                  <Badge variant={d.uploaded ? "default" : "outline"} className="text-[10px]">
                    {d.uploaded ? "Uploaded" : "Missing"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}

      <CaCompanyItrFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete company ITR?"
        description="This soft-deletes the company ITR record."
        loading={deleteItr.isPending}
        onConfirm={() => {
          if (!itr) return;
          deleteItr.mutate(itr.id, {
            onSuccess: () => {
              toast.success("Company ITR deleted");
              setDeleteOpen(false);
            },
            onError: (err) => toastApiError(err, "Could not delete company ITR"),
          });
        }}
      />
    </PortalPageShell>
  );
}
