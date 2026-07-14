import { useState } from "react";
import { Percent, Download, FileSpreadsheet, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          { title: `GST collected (${latest?.period ?? "—"})`, value: formatCurrency(latest?.gstCollected ?? 0), icon: Percent, accent: "green", delay: 0 },
          { title: `GST paid (${latest?.period ?? "—"})`, value: formatCurrency(latest?.gstPaid ?? 0), icon: Percent, accent: "red", delay: 1 },
          { title: "Net GST payable", value: formatCurrency(latest?.netGst ?? 0), icon: Percent, accent: "amber", delay: 2 },
          { title: "TDS deposited", value: formatCurrency(latest?.tdsDeposited ?? 0), icon: Percent, accent: "blue", delay: 3 },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel title="GST collected vs paid" description="Monthly GST movement" icon={Percent} accent="violet">
            <FinanceDualLineChart data={gstChartData} line1Key="collected" line2Key="paid" line1Label="GST Collected" line2Label="GST Paid" line1Color="#22c55e" line2Color="#ef4444" />
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

      <Tabs value={periodTab} onValueChange={(v) => setPeriodTab(v as TaxPeriodType)}>
        <TabsList className="h-9">
          <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly" className="text-xs">Quarterly</TabsTrigger>
          <TabsTrigger value="annual" className="text-xs">Annual</TabsTrigger>
        </TabsList>

        <TabsContent value={periodTab} className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs text-right">GST Collected</TableHead>
                  <TableHead className="text-xs text-right">GST Paid</TableHead>
                  <TableHead className="text-xs text-right">Net GST</TableHead>
                  <TableHead className="text-xs text-right">TDS Deducted</TableHead>
                  <TableHead className="text-xs text-right">TDS Deposited</TableHead>
                  <TableHead className="text-xs text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((row) => (
                  <TableRow key={row.periodKey}>
                    <TableCell className="text-xs font-medium">{row.period}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(row.gstCollected)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-red-700">{formatCurrency(row.gstPaid)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(row.netGst)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.tdsDeducted)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.tdsDeposited)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.success(`${row.period} export started`)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax deposits</p>
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Period</TableHead>
                <TableHead className="text-xs">Challan</TableHead>
                <TableHead className="text-xs">Deposited</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-xs text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs uppercase font-medium">{d.type}</TableCell>
                  <TableCell className="text-xs font-mono">{d.period}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.challanNumber ?? "—"}</TableCell>
                  <TableCell className="text-xs">{format(new Date(d.depositedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(d.amount)}</TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditDeposit(d); setDepositModalOpen(true); }} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(d)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {deposits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={(canEdit || canDelete) ? 6 : 5} className="text-center text-xs text-muted-foreground py-6">
                    No tax deposits recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
