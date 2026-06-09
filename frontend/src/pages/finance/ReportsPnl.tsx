import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, TrendingUp, BarChart3, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
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
import {
  pnlMonthly,
  pnlYearly,
  projectProfitability,
  departmentProfitability,
  revenueTrend,
} from "@/modules/finance/mock-data";
import { formatCurrency, formatCompactCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinancePageLoader,
  FinanceDualLineChart,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { toast } from "sonner";

export default function FinanceReportsPnlPage() {
  const [reportTab, setReportTab] = useState("pnl");
  const { loading } = useMockPageState();

  const exportPdf = () => toast.success("PDF export started (demo)");
  const exportExcel = () => toast.success("Excel export started (demo)");

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading reports…" />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Financial reports"
        description="Profit & loss, profitability analysis, and revenue analytics."
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Reports" },
          { label: "P&L" },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportExcel}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportPdf}>
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </>
        }
      />

      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList className="h-9">
          <TabsTrigger value="pnl" className="text-xs">Profit & Loss</TabsTrigger>
          <TabsTrigger value="profitability" className="text-xs">Profitability</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="mt-4 space-y-4">
          <Tabs defaultValue="monthly">
            <TabsList className="h-8">
              <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-3">
              <ChartGridCell colSpan={12}>
                <ChartPanel title="Monthly P&L" description="Income, expenses, and net profit" icon={BarChart3} accent="emerald" headerExtra={
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportPdf}><Download className="h-3 w-3 mr-1" />PDF</Button>
                }>
                  <FinanceDualLineChart data={pnlMonthly.map((r) => ({ month: r.month, income: r.income, expenses: r.expenses }))} line1Key="income" line2Key="expenses" line1Label="Income" line2Label="Expenses" />
                </ChartPanel>
              </ChartGridCell>
              <div className="rounded-xl border bg-card overflow-hidden mt-3">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs text-right">Income</TableHead>
                      <TableHead className="text-xs text-right">Expenses</TableHead>
                      <TableHead className="text-xs text-right">Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pnlMonthly.map((r) => (
                      <TableRow key={r.month}>
                        <TableCell className="text-xs font-medium">{r.month}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(r.income)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-red-700">{formatCurrency(r.expenses)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(r.profit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="yearly" className="mt-3">
              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Financial Year</TableHead>
                      <TableHead className="text-xs text-right">Income</TableHead>
                      <TableHead className="text-xs text-right">Expenses</TableHead>
                      <TableHead className="text-xs text-right">Net Profit</TableHead>
                      <TableHead className="text-xs text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pnlYearly.map((r) => (
                      <TableRow key={r.year}>
                        <TableCell className="text-xs font-medium">{r.year}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{formatCurrency(r.income)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{formatCurrency(r.expenses)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold text-emerald-700">{formatCurrency(r.profit)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{((r.profit / r.income) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="profitability" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartPanel title="Project-wise profitability" icon={BarChart3} accent="blue">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectProfitability.slice(0, 6)} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="project" tick={{ fontSize: 8 }} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={48} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
            <ChartPanel title="Department-wise profitability" icon={BarChart3} accent="violet">
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Department</TableHead>
                      <TableHead className="text-xs text-right">Revenue</TableHead>
                      <TableHead className="text-xs text-right">Cost</TableHead>
                      <TableHead className="text-xs text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentProfitability.map((d) => (
                      <TableRow key={d.department}>
                        <TableCell className="text-xs">{d.department}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{formatCurrency(d.revenue)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{formatCurrency(d.cost)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium text-emerald-700">{formatCurrency(d.revenue - d.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ChartPanel>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          <ChartGridCell colSpan={12}>
            <ChartPanel title="Revenue growth trends" description="Month-over-month revenue and growth %" icon={TrendingUp} accent="emerald">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={48} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} width={40} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="growth" name="Growth %" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </ChartGridCell>
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
