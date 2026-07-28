import { useMemo } from "react";
import { format } from "date-fns";
import { Percent, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsConfirmDialog, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useTaxSummary, useListTaxDeposits } from "@/api/finance";
import {
  useCaTdsReturns,
  useCaTdsCertificates,
  useDeleteCaTdsReturn,
  useDeleteCaTdsCertificate,
  type CaTdsReturnDto,
  type CaTdsCertificateDto,
} from "@/api/ca";
import { formatCompactCurrency, formatCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import type { FilingStatus } from "@/modules/ca/types";
import {
  CAPageHeader,
  CAFilterBar,
  CaRowActions,
  CaTdsReturnFormModal,
  CaTdsCertificateFormModal,
} from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { useCaWorkingPeriod } from "@/modules/ca/hooks/use-ca-working-period";
import { filterByCaDateRange, resolveCaDateRange } from "@/modules/ca/adapters/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const filingTone: Record<FilingStatus, "success" | "warning" | "danger" | "neutral"> = {
  filed: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
};

export default function Tds() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const { dateRange, setDateRange } = useCaWorkingPeriod("q1");
  const { taxPeriod } = resolveCaDateRange(dateRange);
  const { data: taxData } = useTaxSummary(taxPeriod === "monthly" ? "quarterly" : taxPeriod);
  const { data: depositsData } = useListTaxDeposits({ type: "tds", limit: 50 });
  const { data: returnsData, isLoading: returnsLoading, isError: returnsError, refetch: refetchReturns } =
    useCaTdsReturns({ limit: 100 });
  const { data: certsData, isLoading: certsLoading, isError: certsError, refetch: refetchCerts } =
    useCaTdsCertificates({ limit: 100 });
  const deleteReturn = useDeleteCaTdsReturn();
  const deleteCert = useDeleteCaTdsCertificate();
  const returnsCrud = useCaListCrud<CaTdsReturnDto>();
  const certsCrud = useCaListCrud<CaTdsCertificateDto>();

  const summary = taxData?.summaries?.[0];
  const tdsDeposited = (depositsData?.deposits ?? []).reduce((s, d) => s + Number(d.amount ?? 0), 0);
  const tds = {
    deducted: summary?.tdsDeducted ?? 0,
    receivable: Math.max(0, (summary?.tdsDeducted ?? 0) - (summary?.tdsDeposited ?? tdsDeposited)),
    payable: Math.max(0, (summary?.tdsDeducted ?? 0) - (summary?.tdsDeposited ?? tdsDeposited)),
  };

  const returns = useMemo(
    () => filterByCaDateRange(returnsData?.returns ?? [], dateRange),
    [returnsData?.returns, dateRange],
  );
  const certificates = certsData?.certificates ?? [];

  const returnColumns = useMemo<CmsColumn<CaTdsReturnDto>[]>(
    () => [
      {
        id: "return",
        header: "Return",
        cell: (r) => <span className="font-medium">{r.returnType}</span>,
      },
      { id: "quarter", header: "Quarter", cell: (r) => r.quarter },
      {
        id: "due",
        header: "Due date",
        cell: (r) => (r.dueDate ? format(new Date(r.dueDate), "MMM d, yyyy") : "—"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (r) => (
          <CmsStatusChip label={FILING_STATUS_LABELS[r.status]} tone={filingTone[r.status]} />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (r) => (
          <CaRowActions
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => returnsCrud.openView(r)}
            onEdit={() => returnsCrud.openEdit(r)}
            onDelete={() => returnsCrud.setDeleteTarget(r)}
          />
        ),
      },
    ],
    [canEdit, canDelete, returnsCrud],
  );

  const certColumns = useMemo<CmsColumn<CaTdsCertificateDto>[]>(
    () => [
      {
        id: "form",
        header: "Form",
        cell: (c) => <span className="font-medium">Form {c.form}</span>,
      },
      { id: "party", header: "Party", cell: (c) => c.party },
      {
        id: "pan",
        header: "PAN",
        cell: (c) => <span className="font-mono">{c.pan}</span>,
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (c) => <span className="tabular-nums">{formatCurrency(c.amount)}</span>,
      },
      {
        id: "issued",
        header: "Issued",
        chip: true,
        cell: (c) => (
          <CmsStatusChip
            label={c.issued ? "Issued" : "Pending"}
            tone={c.issued ? "success" : "warning"}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (c) => (
          <CaRowActions
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => certsCrud.openView(c)}
            onEdit={() => certsCrud.openEdit(c)}
            onDelete={() => certsCrud.setDeleteTarget(c)}
          />
        ),
      },
    ],
    [canEdit, canDelete, certsCrud],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="TDS management"
        description="Deducted amounts from Finance tax — quarterly returns and Form 16/16A in CA"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "TDS" }]}
        actions={
          canCreate ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={returnsCrud.openCreate}>
                <Plus className="h-3.5 w-3.5" /> Add return
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={certsCrud.openCreate}>
                <Plus className="h-3.5 w-3.5" /> Add certificate
              </Button>
            </div>
          ) : null
        }
      />
      <CAFilterBar dateRange={dateRange} onDateRangeChange={setDateRange} />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "TDS deducted", value: formatCompactCurrency(tds.deducted), icon: Percent, accent: "blue", delay: 0 },
          { title: "TDS receivable", value: formatCompactCurrency(tds.receivable), icon: Percent, accent: "green", delay: 1 },
          {
            title: "TDS payable",
            value: formatCompactCurrency(tds.payable),
            icon: Percent,
            accent: "amber",
            alert: true,
            delay: 2,
          },
        ]}
      />
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quarterly returns
        </p>
        <CmsDataTable
          columns={returnColumns}
          rows={returns}
          rowKey={(r) => r.id}
          isLoading={returnsLoading}
          error={returnsError}
          onRetry={() => void refetchReturns()}
          empty={{
            icon: Percent,
            title: "No TDS returns yet",
            description: "Add a quarterly TDS return to track filing status.",
            actionLabel: canCreate ? "Add return" : undefined,
            onAction: canCreate ? returnsCrud.openCreate : undefined,
          }}
        />
      </div>
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Certificates
        </p>
        <CmsDataTable
          columns={certColumns}
          rows={certificates}
          rowKey={(c) => c.id}
          isLoading={certsLoading}
          error={certsError}
          onRetry={() => void refetchCerts()}
          empty={{
            icon: Percent,
            title: "No TDS certificates yet",
            description: "Add a Form 16/16A certificate record.",
            actionLabel: canCreate ? "Add certificate" : undefined,
            onAction: canCreate ? certsCrud.openCreate : undefined,
          }}
        />
      </div>

      <CaTdsReturnFormModal
        open={returnsCrud.dialogOpen}
        onOpenChange={returnsCrud.closeDialog}
        editing={returnsCrud.editing}
        readOnly={returnsCrud.readOnly}
      />
      <CaTdsCertificateFormModal
        open={certsCrud.dialogOpen}
        onOpenChange={certsCrud.closeDialog}
        editing={certsCrud.editing}
        readOnly={certsCrud.readOnly}
      />
      <CmsConfirmDialog
        open={!!returnsCrud.deleteTarget}
        onOpenChange={(open) => !open && returnsCrud.setDeleteTarget(null)}
        title="Delete TDS return?"
        description="This soft-deletes the TDS return record."
        loading={deleteReturn.isPending}
        onConfirm={() => {
          if (!returnsCrud.deleteTarget) return;
          deleteReturn.mutate(returnsCrud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("TDS return deleted");
              returnsCrud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete TDS return"),
          });
        }}
      />
      <CmsConfirmDialog
        open={!!certsCrud.deleteTarget}
        onOpenChange={(open) => !open && certsCrud.setDeleteTarget(null)}
        title="Delete TDS certificate?"
        description="This soft-deletes the TDS certificate record."
        loading={deleteCert.isPending}
        onConfirm={() => {
          if (!certsCrud.deleteTarget) return;
          deleteCert.mutate(certsCrud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("TDS certificate deleted");
              certsCrud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete TDS certificate"),
          });
        }}
      />
    </PortalPageShell>
  );
}
