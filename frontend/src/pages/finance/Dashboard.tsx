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
import {
  financeDashboardKpis,
  formatCompactCurrency,
  formatCurrency,
  monthlyRevenueVsExpense,
  expenseCategoryBreakdown,
} from "@/modules/finance/constants";
import {
  mockRecentTransactions,
  mockBudgets,
  mockFinanceInvoices,
  upcomingPayments,
} from "@/modules/finance/mock-data";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceDualLineChart,
  FinanceDonutPanel,
  RecentTransactionsList,
  BudgetConsumptionCard,
  FinanceStatusBadge,
  FinancePageLoader,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { calcInvoiceTotal } from "@/modules/finance/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FinanceDashboard() {
  const [dateRange, setDateRange] = useState("jun");
  const { loading } = useMockPageState();
  const kpis = financeDashboardKpis;

  const pendingInvoices = mockFinanceInvoices.filter(
    (i) => i.status === "unpaid" || i.status === "partially_paid",
  );

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading finance dashboard…" />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Finance Dashboard"
        description="Company-wide financial overview — income, expenses, budgets, and cash flow"
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Dashboard" }]}
        actions={
          <Button size="sm" variant="outline" className="h-8" onClick={() => toast.success("Finance summary export started (demo)")}>
            Export summary
          </Button>
        }
      />

      <FinanceFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Export started (demo)")}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial KPIs</p>
        <PortalKpiGrid
        columns={4}
        count={5}
        items={[
          { title: "Total income", value: formatCompactCurrency(kpis.totalIncome), hint: `↑ ${kpis.trends.totalIncome}% vs prior period`, icon: TrendingUp, accent: "green", href: "/finance/income", delay: 0 },
          { title: "Total expenses", value: formatCompactCurrency(kpis.totalExpenses), hint: `↑ ${kpis.trends.totalExpenses}% vs prior period`, icon: TrendingDown, accent: "red", href: "/finance/expenses", delay: 1 },
          { title: "Net profit / loss", value: formatCompactCurrency(kpis.netProfit), hint: `↑ ${kpis.trends.netProfit}% vs prior period`, icon: IndianRupee, accent: "green", href: "/finance/reports/pnl", delay: 2 },
          { title: "Pending invoices", value: kpis.pendingInvoices, hint: `${pendingInvoices.length} awaiting payment`, icon: Receipt, accent: "amber", href: "/finance/invoices", delay: 3 },
          { title: "Overdue amount", value: formatCompactCurrency(kpis.overdueAmount), hint: `↓ ${Math.abs(kpis.trends.overdueAmount)}% vs prior`, icon: AlertCircle, accent: "red", alert: true, href: "/finance/invoices", delay: 4 },
        ]}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends & breakdown</p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel title="Monthly revenue vs expense" description="Income collected vs operating costs" icon={TrendingUp} accent="emerald" viewAllHref="/finance/reports/pnl">
            <FinanceDualLineChart data={monthlyRevenueVsExpense} line1Key="revenue" line2Key="expense" line1Label="Revenue" line2Label="Expense" />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Expense category breakdown" description="Where money is being spent" icon={TrendingDown} accent="rose" viewAllHref="/finance/expenses">
            <FinanceDonutPanel data={expenseCategoryBreakdown.map((d) => ({ name: d.name, count: d.count, value: d.value }))} />
          </ChartPanel>
        </ChartGridCell>
      </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity & records</p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel title="Recent transactions" icon={IndianRupee} accent="blue" viewAllHref="/finance/payments">
          <RecentTransactionsList transactions={mockRecentTransactions} limit={6} />
        </ChartPanel>
        <ChartPanel title="Budget consumption" icon={AlertCircle} accent="amber" viewAllHref="/finance/budgets">
          <div className="grid gap-3 sm:grid-cols-2">
            {mockBudgets.slice(0, 4).map((b) => (
              <BudgetConsumptionCard key={b.id} budget={b} />
            ))}
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
              {pendingInvoices.slice(0, 5).map((inv) => {
                const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
                const due = total - inv.paidAmount;
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
            </TableBody>
          </Table>
        </ChartPanel>
        <ChartPanel title="Upcoming payments" icon={Calendar} accent="blue" viewAllHref="/finance/payments">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Party</TableHead>
                <TableHead className="text-xs">Due</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs max-w-[180px] truncate">{p.party}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(p.dueDate), "MMM d")}</TableCell>
                  <TableCell className={cn("text-xs text-right font-medium tabular-nums", p.type === "incoming" ? "text-emerald-700" : "text-red-700")}>
                    {p.type === "incoming" ? "+" : "−"}{formatCurrency(p.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartPanel>
      </div>
      </div>
    </PortalPageShell>
  );
}
