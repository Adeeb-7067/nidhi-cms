import { useState } from "react";
import { Percent, Download, FileSpreadsheet, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { CmsDataTable, CmsChipTabs, type CmsColumn } from "@/components/cms";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceErrorState,
  FinanceDualLineChart,
  TaxDepositFormModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useTaxSummary,
  useListTaxDeposits,
  useDeleteTaxDeposit,
  type TaxPeriodType,
  type TaxDeposit,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TaxPage() {
  const [periodTab, setPeriodTab] = useState<TaxPeriodType>("monthly");
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [editDeposit, setEditDeposit] = useState<TaxDeposit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxDeposit | null>(null);
  const { can } = usePermissions();
  const canCreate = can("finance_tax", "create");
  const canEdit = can("finance_tax", "edit");
  const canDelete = can("finance_tax", "delete");
  const deleteTaxDeposit = useDeleteTaxDeposit();
  const { data, isLoading, isError, refetch } = useTaxSummary(periodTab);
  const { data: depositsData, refetch: refetchDeposits } = useListTaxDeposits({ limit: 50 });

  const summaries = data?.summaries ?? [];
  const deposits = depositsData?.deposits ?? [];
  const gstChartData = [...summaries]
    .filter((t) => t.periodType === "monthly")
    .reverse()
    .map((t) => ({ month: t.period.split(" ")[0], collected: t.gstCollected, paid: t.gstPaid }));
  const latest = summaries[0];

  const openCreateDeposit = () => { setEditDeposit(null); setDepositModalOpen(true); };

  const handleDeleteDeposit = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTaxDeposit.mutateAsync(deleteTarget.id);
      toast.success("Tax deposit deleted");
      setDeleteTarget(null);
      refetchDeposits();
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete tax deposit");
    }
  };

  if (isLoading) {
    return <FinanceListPageSkeleton kpiCount={4} showCharts />;
  }
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const summaryColumns: CmsColumn<(typeof summaries)[number]>[] = [
    { id: "period", header: "Period", cell: (row) => <span className="font-medium">{row.period}</span> },
    { id: "gst-collected", header: "GST Collected", align: "right", cell: (row) => <span className="tabular-nums text-emerald-700">{formatCurrency(row.gstCollected)}</span> },
    { id: "gst-input-credit", header: "GST Input Credit", align: "right", cell: (row) => <span className="tabular-nums text-red-700">{formatCurrency(row.gstPaid)}</span> },
    { id: "net-gst", header: "Net GST", align: "right", cell: (row) => <span className="font-medium tabular-nums">{formatCurrency(row.netGst)}</span> },
    { id: "deposited", header: "Deposited", align: "right", cell: (row) => <span className="tabular-nums">{formatCurrency(row.gstDeposited ?? 0)}</span> },
    { id: "still-due", header: "Still due", align: "right", cell: (row) => <span className="font-medium tabular-nums">{formatCurrency(row.gstPayable ?? Math.max(0, (row.netGst ?? 0) - (row.gstDeposited ?? 0)))}</span> },
    { id: "tds", header: "TDS Deducted", align: "right", cell: (row) => <span className="tabular-nums">{formatCurrency(row.tdsDeducted)}</span> },
    { id: "export", header: "Export", align: "right", cell: (row) => <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.success(`${row.period} export started`)}><Download className="h-3 w-3" /></Button> },
  ];
  const depositColumns: CmsColumn<TaxDeposit>[] = [
    { id: "type", header: "Type", cell: (d) => <span className="uppercase font-medium">{d.type}</span> },
    { id: "period", header: "Period", cell: (d) => <span className="font-mono">{d.period}</span> },
    { id: "challan", header: "Challan", cell: (d) => <span className="text-muted-foreground">{d.challanNumber ?? "—"}</span> },
    { id: "deposited", header: "Deposited", cell: (d) => format(new Date(d.depositedAt), "MMM d, yyyy") },
    { id: "amount", header: "Amount", align: "right", cell: (d) => <span className="font-medium tabular-nums">{formatCurrency(d.amount)}</span> },
    ...(canEdit || canDelete ? [{
      id: "actions", header: "Actions", align: "right" as const,
      cell: (d: TaxDeposit) => <div className="flex justify-end gap-1">{canEdit && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditDeposit(d); setDepositModalOpen(true); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}{canDelete && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(d)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>}</div>,
    }] : []),
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Tax"
        description="GST dashboard, TDS summaries, and compliance reports."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Tax" }]}
        actions={
          <>
            {canCreate && (
              <Button size="sm" className="h-8 gap-1.5" onClick={openCreateDeposit}>
                <Plus className="h-3.5 w-3.5" />
                Record deposit
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("Excel export started")}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("PDF export started")}>
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </>
        }
      />

      <PortalKpiGrid
        items={[
          {
            title: `GST collected (${latest?.period ?? "—"})`,
            value: formatCurrency(latest?.gstCollected ?? 0),
            icon: Percent,
            accent: "green",
            delay: 0,
          },
          {
            title: `GST input credit (${latest?.period ?? "—"})`,
            value: formatCurrency(latest?.gstPaid ?? 0),
            icon: Percent,
            accent: "blue",
            delay: 1,
          },
          {
            title: (latest?.netGst ?? 0) >= 0 ? "Net GST to pay" : "Net GST credit",
            value: formatCurrency(Math.abs(latest?.netGst ?? 0)),
            icon: Percent,
            accent: (latest?.netGst ?? 0) > 0 ? "amber" : "green",
            delay: 2,
          },
          {
            title: "Still due after deposits",
            value: formatCurrency(latest?.gstPayable ?? Math.max(0, (latest?.netGst ?? 0) - (latest?.gstDeposited ?? 0))),
            icon: Percent,
            accent: (latest?.gstPayable ?? 0) > 0 ? "red" : "green",
            delay: 3,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel title="GST collected vs input credit" description="Monthly GST movement" icon={Percent} accent="violet">
            <FinanceDualLineChart data={gstChartData} line1Key="collected" line2Key="paid" line1Label="GST Collected" line2Label="Input Credit" line1Color="#22c55e" line2Color="#3b82f6" />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Quick actions" icon={Download} accent="blue">
            <div className="space-y-2 py-2">
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("GSTR-1 export started")}>Export GSTR-1 summary</Button>
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("GSTR-3B export started")}>Export GSTR-3B summary</Button>
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("TDS return export started")}>Export TDS return</Button>
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("Annual tax summary exported")}>Annual tax summary</Button>
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>

      <FinanceFilterBar onExport={() => toast.success("Tax report export started")} />

      <CmsChipTabs
        value={periodTab}
        onValueChange={(v) => setPeriodTab(v as TaxPeriodType)}
        items={[
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "annual", label: "Annual" },
        ]}
      />

      <CmsDataTable columns={summaryColumns} rows={summaries} rowKey={(row) => row.periodKey} />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax deposits</p>
        <CmsDataTable columns={depositColumns} rows={deposits} rowKey={(d) => d.id} empty={{ title: "No tax deposits recorded yet." }} />
      </div>

      <TaxDepositFormModal
        open={depositModalOpen}
        onOpenChange={(open) => { setDepositModalOpen(open); if (!open) setEditDeposit(null); }}
        deposit={editDeposit}
        onSuccess={() => { refetchDeposits(); refetch(); setEditDeposit(null); }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete tax deposit?"
        description={deleteTarget ? `${deleteTarget.type.toUpperCase()} deposit for ${deleteTarget.period} will be removed.` : undefined}
        loading={deleteTaxDeposit.isPending}
        onConfirm={handleDeleteDeposit}
      />
    </PortalPageShell>
  );
}
