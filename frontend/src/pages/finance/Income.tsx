import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, TrendingUp, Pencil, Trash2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatCompactCurrency, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import type { IncomeStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceDualLineChart,
  FinanceAreaTrendChart,
  RecordPaymentModal,
  IncomeEditModal,
  GstClassificationBadge,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useListIncome,
  useDeleteIncome,
  useFinanceRevenueTrend,
  useFinancePnl,
  type ListIncomeParams,
  type Income,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { useListClients } from "@/api/generated/api";
import { toast } from "sonner";

const STATUS_TABS: (IncomeStatus | "all")[] = ["all", "received", "partial", "pending"];

export default function IncomePage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<Income | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);
  const { can } = usePermissions();
  const canEdit = can("finance_income", "edit");
  const canDelete = can("finance_income", "delete");
  const deleteIncome = useDeleteIncome();

  const { data: clientsData } = useListClients({ limit: 200 });
  const { data: revenueTrendData } = useFinanceRevenueTrend(6);
  const { data: pnlData } = useFinancePnl();

  const params: ListIncomeParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      status: statusTab === "all" ? undefined : (statusTab as IncomeStatus),
      clientId: clientFilter === "all" ? undefined : Number(clientFilter),
    }),
    [page, search, statusTab, clientFilter],
  );
  const { data, isLoading, isError, refetch } = useListIncome(params);
  const income = data?.income ?? [];
  const total = data?.total ?? 0;

  const totalReceived = income.filter((i) => i.status === "received").reduce((s, i) => s + i.amount, 0);
  const totalPending = income.filter((i) => i.status !== "received").reduce((s, i) => s + i.amount, 0);
  const gstReceived = income.filter((i) => i.gstEnabled !== false).reduce((s, i) => s + i.amount, 0);
  const nonGstReceived = income.filter((i) => i.gstEnabled === false).reduce((s, i) => s + i.amount, 0);
  const gstTaxTotal = income.reduce((s, i) => s + (i.gstAmount ?? 0), 0);

  const incomeVsExpenseTrend = (pnlData?.monthly ?? []).map((m) => ({ month: m.month, income: m.income, expense: m.expenses }));
  const revenueTrend = revenueTrendData?.trend ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIncome.mutateAsync(deleteTarget.id);
      toast.success(`Income ${deleteTarget.reference} removed`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete income");
    }
  };

  const showActions = canEdit || canDelete;

  if (isLoading) {
    return <FinanceListPageSkeleton kpiCount={3} showCharts />;
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
        title="Income"
        description="Track client payments and revenue collections."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Income" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Record payment
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Total received", value: formatCompactCurrency(totalReceived), icon: TrendingUp, accent: "green", delay: 0 },
          { title: "GST income", value: formatCompactCurrency(gstReceived), icon: TrendingUp, accent: "blue", delay: 1 },
          { title: "Non-GST income", value: formatCompactCurrency(nonGstReceived), icon: TrendingUp, accent: "default", delay: 2 },
          { title: "GST collected", value: formatCompactCurrency(gstTaxTotal), icon: TrendingUp, accent: "amber", delay: 3 },
          { title: "Pending / partial", value: formatCompactCurrency(totalPending), icon: TrendingUp, accent: "amber", delay: 4 },
          { title: "Transactions", value: total, icon: TrendingUp, accent: "blue", delay: 5 },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel title="Income vs expense" description="Monthly comparison" icon={TrendingUp} accent="emerald">
            <FinanceDualLineChart data={incomeVsExpenseTrend} line1Key="income" line2Key="expense" line1Label="Income" line2Label="Expense" />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Revenue trends" description="Month-over-month growth" icon={TrendingUp} accent="blue">
            <FinanceAreaTrendChart data={revenueTrend} dataKey="revenue" gradientId="revenueTrend" stroke="#3b82f6" />
          </ChartPanel>
        </ChartGridCell>
      </div>

      <FinanceFilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search client, reference…" onExport={() => toast.success("Income export started")}>
        <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {(clientsData?.clients ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FinanceFilterBar>

      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); setPage(1); }}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : s.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {income.length === 0 ? (
        <FinanceEmptyState icon={TrendingUp} title="No income records" description="Adjust filters or record a payment." actionLabel="Record payment" onAction={() => setDrawerOpen(true)} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">GST</TableHead>
                <TableHead className="text-xs text-right">GST amt</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                {showActions && <TableHead className="text-xs text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {income.map((i) => {
                const synced = Boolean(i.salesPaymentId);
                return (
                <TableRow key={i.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs">{format(new Date(i.date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs font-mono">{i.reference}</TableCell>
                  <TableCell className="text-xs font-medium">{i.clientName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{i.projectName ?? "—"}</TableCell>
                  <TableCell><FinanceStatusBadge variant="income" value={i.status} /></TableCell>
                  <TableCell><GstClassificationBadge gstEnabled={i.gstEnabled} /></TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                    {(i.gstAmount ?? 0) > 0 ? formatCurrency(i.gstAmount ?? 0) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums text-emerald-700">{formatCurrency(i.amount)}</TableCell>
                  <TableCell className="text-xs">{PAYMENT_MODE_LABELS[i.paymentMode]}</TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      {synced ? (
                        <span className="text-[10px] text-muted-foreground">Sales</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditIncome(i)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(i)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t">
            <span>{total} total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={income.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <RecordPaymentModal open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => refetch()} />
      <IncomeEditModal
        open={editIncome != null}
        onOpenChange={(open) => { if (!open) setEditIncome(null); }}
        income={editIncome}
        onSuccess={() => { refetch(); setEditIncome(null); }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete income receipt?"
        description={deleteTarget ? `${deleteTarget.reference} will be removed and any linked invoice balance restored.` : undefined}
        loading={deleteIncome.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
