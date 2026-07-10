import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Receipt,
  AlertCircle,
  Calendar,
} from "lucide-react";
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
import { formatCompactCurrency, formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceDualLineChart,
  FinanceDonutPanel,
  FinanceStatusBadge,
  FinanceErrorState,
  FinanceSourceBadge,
} from "@/modules/finance/components";
import { FinanceDashboardSkeleton } from "@/components/loading";
import { useListPayments, useListInvoices, useListBudgets, useFinanceDashboard } from "@/api/finance";
import { calcBudgetConsumption } from "@/modules/finance/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FinanceDashboard() {
  const [dateRange, setDateRange] = useState<"current" | "previous">("current");
  const { data, isLoading, isError, refetch } = useFinanceDashboard(dateRange);
  const { data: pendingInvoicesData } = useListInvoices({ status: "unpaid", limit: 5 });
  const { data: overdueInvoicesData } = useListInvoices({ status: "overdue", limit: 5 });
  const { data: budgetsData } = useListBudgets();
  const { data: paymentsData } = useListPayments({ limit: 6 });

  if (isLoading && !data) {
    return <FinanceDashboardSkeleton />;
  }
  if (isError && !data) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }
  if (!data) return <FinanceDashboardSkeleton />;

  const kpis = data.kpis;
  const pendingInvoices = [...(pendingInvoicesData?.invoices ?? []), ...(overdueInvoicesData?.invoices ?? [])].slice(0, 5);
  const budgets = budgetsData?.budgets ?? [];
  const payments = paymentsData?.payments ?? [];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Finance Dashboard"
        description="Company-wide financial overview — income, expenses, budgets, and cash flow"
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Dashboard" }]}
        actions={
          <Button size="sm" variant="outline" className="h-8" onClick={() => toast.success("Finance summary export started")}>
            Export summary
          </Button>
        }
      />

      <FinanceFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Export started")}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial KPIs</p>
        <PortalKpiGrid
          columns={4}
          count={5}
          items={[
            { title: "Total income", value: formatCompactCurrency(kpis.totalIncome), hint: `${kpis.trends.totalIncome >= 0 ? "↑" : "↓"} ${Math.abs(kpis.trends.totalIncome)}% vs prior period`, icon: TrendingUp, accent: "green", href: "/finance/income", delay: 0 },
            { title: "Total expenses", value: formatCompactCurrency(kpis.totalExpenses), hint: `${kpis.trends.totalExpenses >= 0 ? "↑" : "↓"} ${Math.abs(kpis.trends.totalExpenses)}% vs prior period`, icon: TrendingDown, accent: "red", href: "/finance/expenses", delay: 1 },
            { title: "Net profit / loss", value: formatCompactCurrency(kpis.netProfit), hint: `${kpis.trends.netProfit >= 0 ? "↑" : "↓"} ${Math.abs(kpis.trends.netProfit)}% vs prior period`, icon: IndianRupee, accent: kpis.netProfit >= 0 ? "green" : "red", href: "/finance/reports/pnl", delay: 2 },
            { title: "Pending invoices", value: kpis.pendingInvoices, hint: `${pendingInvoices.length} shown below`, icon: Receipt, accent: "amber", href: "/finance/invoices", delay: 3 },
            { title: "Overdue amount", value: formatCompactCurrency(kpis.overdueAmount), hint: "Outstanding past due date", icon: AlertCircle, accent: "red", alert: kpis.overdueAmount > 0, href: "/finance/invoices", delay: 4 },
          ]}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends & breakdown</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <ChartGridCell colSpan={8}>
            <ChartPanel title="Monthly revenue vs expense" description="Income collected vs operating costs" icon={TrendingUp} accent="emerald" viewAllHref="/finance/reports/pnl">
              <FinanceDualLineChart data={data.monthlyTrend} line1Key="revenue" line2Key="expense" line1Label="Revenue" line2Label="Expense" />
            </ChartPanel>
          </ChartGridCell>
          <ChartGridCell colSpan={4}>
            <ChartPanel title="Expense category breakdown" description="Where money is being spent" icon={TrendingDown} accent="rose" viewAllHref="/finance/expenses">
              <FinanceDonutPanel data={data.expenseBreakdown.map((d) => ({ name: d.name, count: d.count, value: d.value }))} />
            </ChartPanel>
          </ChartGridCell>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity & records</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ChartPanel title="Recent transactions" icon={IndianRupee} accent="blue" viewAllHref="/finance/payments">
            <div className="space-y-3">
              {payments.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No transactions yet.</p>}
              {payments.map((tx) => (
                <Link
                  key={`${tx.source ?? "finance"}-${tx.id}`}
                  href={`/finance/payments/${tx.source ?? "finance"}/${tx.id}`}
                  className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 hover:bg-muted/30 rounded-md px-1 -mx-1 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold truncate">{tx.partyName}</p>
                      <FinanceSourceBadge source={tx.source} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(tx.date), "MMM d, yyyy")} · {tx.reference}</p>
                  </div>
                  <span className={cn("text-xs font-medium tabular-nums shrink-0", tx.direction === "outgoing" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                    {tx.direction === "outgoing" ? "−" : "+"}{formatCurrency(tx.amount)}
                  </span>
                </Link>
              ))}
            </div>
          </ChartPanel>
          <ChartPanel title="Budget consumption" icon={AlertCircle} accent="amber" viewAllHref="/finance/budgets">
            <div className="grid gap-3 sm:grid-cols-2">
              {budgets.slice(0, 4).map((b) => {
                const pct = calcBudgetConsumption(b.spent, b.allocated);
                return (
                  <Card key={b.id} className={cn(b.status === "exceeded" && "border-red-500/30")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{b.name}</p>
                          <p className="text-[10px] text-muted-foreground">{b.type === "project" ? "Project budget" : b.department ?? "Company-wide"}</p>
                        </div>
                        <FinanceStatusBadge variant="budget" value={b.status} />
                      </div>
                      <Progress value={pct} className={cn("h-2", b.status === "exceeded" && "[&>div]:bg-red-500")} />
                      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatCurrency(b.spent)} spent</span>
                        <span>{pct}% of {formatCurrency(b.allocated)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {budgets.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center col-span-2">No budgets yet.</p>}
            </div>
          </ChartPanel>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ChartPanel title="Pending invoice summary" icon={Receipt} accent="violet" viewAllHref="/finance/invoices">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((inv) => {
                  const due = (inv.total ?? 0) - inv.paidAmount;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-mono">
                        <Link href={`/finance/invoices/${inv.id}`} className="hover:text-primary">{inv.number}</Link>
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[140px]">{inv.clientName}</TableCell>
                      <TableCell><FinanceStatusBadge variant="invoice" value={inv.status} /></TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(due)}</TableCell>
                    </TableRow>
                  );
                })}
                {pendingInvoices.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No pending invoices.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ChartPanel>
          <ChartPanel title="Upcoming due dates" icon={Calendar} accent="blue" viewAllHref="/finance/payments">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Due</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-xs max-w-[180px] truncate">{inv.number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "MMM d")}</TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums text-emerald-700">
                      {formatCurrency((inv.total ?? 0) - inv.paidAmount)}
                    </TableCell>
                  </TableRow>
                ))}
                {pendingInvoices.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">Nothing due.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ChartPanel>
        </div>
      </div>
    </PortalPageShell>
  );
}
