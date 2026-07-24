import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Receipt,
  AlertCircle,
  Calendar,
  Wallet,
  ArrowLeftRight,
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
import { formatCompactCurrency, formatCurrency, MONEY_IN_CLASS, MONEY_OUT_CLASS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceDualLineChart,
  FinanceBarChart,
  FinanceDonutPanel,
  FinanceStatusBadge,
  FinanceErrorState,
  FinanceSourceBadge,
} from "@/modules/finance/components";
import { FinanceDashboardSkeleton } from "@/components/loading";
import {
  useListPayments,
  useListInvoices,
  useListBudgets,
  useFinanceDashboard,
} from "@/api/finance";
import { calcBudgetConsumption } from "@/modules/finance/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function FinanceDashboard() {
  const [dateRange, setDateRange] = useState<"current" | "previous">("current");
  const { data, isLoading, isError, refetch } = useFinanceDashboard(dateRange);
  const { data: unpaidInvoicesData } = useListInvoices({ status: "unpaid", limit: 5 });
  const { data: partialInvoicesData } = useListInvoices({ status: "partially_paid", limit: 5 });
  const { data: overdueInvoicesData } = useListInvoices({ status: "overdue", limit: 5 });
  const { data: budgetsData } = useListBudgets();
  const { data: paymentsData } = useListPayments({ limit: 6 });

  const pendingInvoices = useMemo(
    () =>
      [
        ...(unpaidInvoicesData?.invoices ?? []),
        ...(partialInvoicesData?.invoices ?? []),
        ...(overdueInvoicesData?.invoices ?? []),
      ].slice(0, 6),
    [unpaidInvoicesData, partialInvoicesData, overdueInvoicesData],
  );

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
  const budgets = budgetsData?.budgets ?? [];
  const payments = paymentsData?.payments ?? [];
  const cashFlow = data.cashFlowTrend ?? [];
  const apAging = data.apAging ?? [];
  const arAging = data.arAging ?? [];
  const periodLabel = dateRange === "previous" ? "previous month" : "this month";

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Finance Dashboard"
        description="Income, cash paid, dues, and bank movement — KPIs and charts stay in sync with settlements."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Dashboard" }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              window.location.href = "/finance/reports/pnl";
            }}
          >
            Open P&L report
          </Button>
        }
      />

      <FinanceFilterBar
        dateRange={dateRange}
        onDateRangeChange={(v) => setDateRange(v as "current" | "previous")}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Financial KPIs · {periodLabel}
        </p>
        <PortalKpiGrid
          columns={3}
          count={6}
          items={[
            {
              title: "Total income",
              value: formatCompactCurrency(kpis.totalIncome),
              hint: `${kpis.trends.totalIncome >= 0 ? "↑" : "↓"} ${Math.abs(kpis.trends.totalIncome)}% vs prior`,
              icon: TrendingUp,
              accent: "green",
              href: "/finance/income",
              delay: 0,
            },
            {
              title: "Total expenses (paid)",
              value: formatCompactCurrency(kpis.totalExpenses),
              hint: `${kpis.trends.totalExpenses >= 0 ? "↑" : "↓"} ${Math.abs(kpis.trends.totalExpenses)}% vs prior · cash recognized`,
              icon: TrendingDown,
              accent: "red",
              href: "/finance/expenses",
              delay: 1,
            },
            {
              title: "Net profit / loss",
              value: formatCompactCurrency(kpis.netProfit),
              hint: `${kpis.trends.netProfit >= 0 ? "↑" : "↓"} ${Math.abs(kpis.trends.netProfit)}% vs prior`,
              icon: IndianRupee,
              accent: kpis.netProfit >= 0 ? "green" : "red",
              href: "/finance/reports/pnl",
              delay: 2,
            },
            {
              title: "Open invoices",
              value: kpis.pendingInvoices,
              hint: "Unpaid + partial + overdue count",
              icon: Receipt,
              accent: "amber",
              href: "/finance/invoices",
              delay: 3,
            },
            {
              title: "Overdue AR",
              value: formatCompactCurrency(kpis.overdueAmount),
              hint: "Client invoices past due",
              icon: AlertCircle,
              accent: "red",
              alert: kpis.overdueAmount > 0,
              href: "/finance/invoices",
              delay: 4,
            },
            {
              title: "Vendor dues (AP)",
              value: formatCompactCurrency(kpis.outstandingPayables ?? 0),
              hint: "Approved bills still unpaid",
              icon: Wallet,
              accent: "violet",
              alert: (kpis.outstandingPayables ?? 0) > 0,
              href: "/finance/expenses",
              delay: 5,
            },
          ]}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends & breakdown</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
          <ChartGridCell colSpan={8} className="h-auto">
            <ChartPanel
              className="h-auto"
              title="Monthly revenue vs expense"
              description="Income collected vs cash-recognized operating costs (+ payroll)"
              icon={TrendingUp}
              accent="emerald"
              viewAllHref="/finance/reports/pnl"
            >
              <FinanceDualLineChart
                data={data.monthlyTrend}
                line1Key="revenue"
                line2Key="expense"
                line1Label="Revenue"
                line2Label="Expense"
              />
            </ChartPanel>
          </ChartGridCell>
          <ChartGridCell colSpan={4} className="h-auto">
            <ChartPanel
              className="h-auto"
              title="Expense mix"
              description={`Paid by category · ${periodLabel}`}
              icon={TrendingDown}
              accent="rose"
              viewAllHref="/finance/expenses"
            >
              <FinanceDonutPanel
                data={data.expenseBreakdown.map((d) => ({ name: d.name, count: d.count, value: d.value }))}
              />
            </ChartPanel>
          </ChartGridCell>
        </div>

        <ChartPanel
          className="h-auto"
          title="Cash in vs cash out"
          description="Bank movement by payment date (true cash timing)"
          icon={ArrowLeftRight}
          accent="blue"
          viewAllHref="/finance/payments"
        >
          <FinanceDualLineChart
            data={cashFlow}
            line1Key="inflow"
            line2Key="outflow"
            line1Label="Inflow"
            line2Label="Outflow"
            line1Color="#22c55e"
            line2Color="#f97316"
            height={200}
          />
        </ChartPanel>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
          <ChartPanel
            className="h-auto"
            title="AR aging"
            description="Client invoice outstanding by age"
            icon={Receipt}
            accent="violet"
            viewAllHref="/finance/invoices"
          >
            <FinanceBarChart
              data={arAging.map((b) => ({ name: b.bucket, amount: b.amount }))}
              dataKey="amount"
              nameKey="name"
              color="#8b5cf6"
              height={180}
            />
          </ChartPanel>
          <ChartPanel
            className="h-auto"
            title="AP aging"
            description="Vendor bill Due by age"
            icon={Wallet}
            accent="amber"
            viewAllHref="/finance/expenses"
          >
            <FinanceBarChart
              data={apAging.map((b) => ({ name: b.bucket, amount: b.amount }))}
              dataKey="amount"
              nameKey="name"
              color="#f59e0b"
              height={180}
            />
          </ChartPanel>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity & records</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
          <ChartPanel
            className="h-auto"
            title="Recent transactions"
            icon={IndianRupee}
            accent="blue"
            viewAllHref="/finance/payments"
          >
            <div className="space-y-3">
              {payments.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">No transactions yet.</p>
              )}
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
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.date), "MMM d, yyyy")} · {tx.reference}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium tabular-nums shrink-0",
                      tx.direction === "outgoing" ? MONEY_OUT_CLASS : MONEY_IN_CLASS,
                    )}
                  >
                    {formatCurrency(tx.amount)}
                  </span>
                </Link>
              ))}
            </div>
          </ChartPanel>
          <ChartPanel
            className="h-auto"
            title="Budget consumption"
            icon={AlertCircle}
            accent="amber"
            viewAllHref="/finance/budgets"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {budgets.slice(0, 4).map((b) => {
                const pct = calcBudgetConsumption(b.spent, b.allocated);
                return (
                  <Card key={b.id} className={cn(b.status === "exceeded" && "border-red-500/30")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{b.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {b.type === "project" ? "Project budget" : b.department ?? "Company-wide"}
                          </p>
                        </div>
                        <FinanceStatusBadge variant="budget" value={b.status} />
                      </div>
                      <Progress value={pct} className={cn("h-2", b.status === "exceeded" && "[&>div]:bg-red-500")} />
                      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatCurrency(b.spent)} spent</span>
                        <span>
                          {pct}% of {formatCurrency(b.allocated)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {budgets.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center col-span-2">No budgets yet.</p>
              )}
            </div>
          </ChartPanel>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
          <ChartPanel
            className="h-auto"
            title="Open invoice summary"
            icon={Receipt}
            accent="violet"
            viewAllHref="/finance/invoices"
          >            <Table>
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
                    <TableRow key={`${inv.source ?? "finance"}-${inv.id}`}>
                      <TableCell className="text-xs font-mono">
                        <Link href={`/finance/invoices/${inv.id}`} className="hover:text-primary">
                          {inv.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[140px]">{inv.clientName}</TableCell>
                      <TableCell>
                        <FinanceStatusBadge variant="invoice" value={inv.status} />
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">
                        {formatCurrency(due)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pendingInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                      No open invoices.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ChartPanel>
          <ChartPanel
            className="h-auto"
            title="Upcoming invoice dues"
            icon={Calendar}
            accent="blue"
            viewAllHref="/finance/invoices"
          >            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Due</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((inv) => (
                  <TableRow key={`due-${inv.source ?? "finance"}-${inv.id}`}>
                    <TableCell className="text-xs max-w-[180px] truncate">{inv.number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.dueDate ? format(new Date(inv.dueDate), "MMM d") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums text-emerald-700">
                      {formatCurrency((inv.total ?? 0) - inv.paidAmount)}
                    </TableCell>
                  </TableRow>
                ))}
                {pendingInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                      Nothing due.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ChartPanel>
        </div>
      </div>
    </PortalPageShell>
  );
}
