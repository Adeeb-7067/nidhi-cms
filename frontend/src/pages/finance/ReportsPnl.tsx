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
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatCompactCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceErrorState,
  FinanceDualLineChart,
} from "@/modules/finance/components";
import { FinanceReportsSkeleton, PageChartGridSkeleton, PageChartPanelSkeleton } from "@/components/loading";
import { useFinancePnl, useFinanceProfitability, useFinanceRevenueTrend } from "@/api/finance";
import { toast } from "sonner";

export default function FinanceReportsPnlPage() {
  const [reportTab, setReportTab] = useState("pnl");
  const [pnlPeriod, setPnlPeriod] = useState("monthly");
  const { data: pnlData, isLoading: pnlLoading, isError: pnlError, refetch: refetchPnl } = useFinancePnl();
  const { data: profitabilityData, isLoading: profitLoading } = useFinanceProfitability(reportTab === "profitability");
  const { data: revenueTrendData, isLoading: revenueLoading } = useFinanceRevenueTrend(6, reportTab === "revenue");

  const exportPdf = () => toast.success("PDF export started");
  const exportExcel = () => toast.success("Excel export started");

  if (pnlLoading) {
    return <FinanceReportsSkeleton />;
  }
  if (pnlError || !pnlData) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetchPnl()} />
      </PortalPageShell>
    );
  }

  const pnlMonthly = pnlData.monthly;
  const pnlYearly = pnlData.yearly;
  const projectProfitability = profitabilityData?.projects ?? [];
  const departmentProfitability = profitabilityData?.departments ?? [];
  const revenueTrend = revenueTrendData?.trend ?? [];
  const monthlyColumns: CmsColumn<(typeof pnlMonthly)[number]>[] = [
    { id: "month", header: "Month", cell: (r) => <span className="font-medium">{r.month}</span> },
    { id: "income", header: "Income", align: "right", cell: (r) => <span className="tabular-nums text-emerald-700">{formatCurrency(r.income)}</span> },
    { id: "expenses", header: "Expenses", align: "right", cell: (r) => <span className="tabular-nums text-red-700">{formatCurrency(r.expenses)}</span> },
    { id: "profit", header: "Net Profit", align: "right", cell: (r) => <span className="font-semibold tabular-nums">{formatCurrency(r.profit)}</span> },
  ];
  const yearlyColumns: CmsColumn<(typeof pnlYearly)[number]>[] = [
    { id: "year", header: "Financial Year", cell: (r) => <span className="font-medium">{r.year}</span> },
    { id: "income", header: "Income", align: "right", cell: (r) => <span className="tabular-nums">{formatCurrency(r.income)}</span> },
    { id: "expenses", header: "Expenses", align: "right", cell: (r) => <span className="tabular-nums">{formatCurrency(r.expenses)}</span> },
    { id: "profit", header: "Net Profit", align: "right", cell: (r) => <span className="font-semibold tabular-nums text-emerald-700">{formatCurrency(r.profit)}</span> },
    { id: "margin", header: "Margin", align: "right", cell: (r) => <span className="tabular-nums">{r.income > 0 ? ((r.profit / r.income) * 100).toFixed(1) : "0.0"}%</span> },
  ];
  const departmentColumns: CmsColumn<(typeof departmentProfitability)[number]>[] = [
    { id: "department", header: "Department", cell: (d) => d.department },
    { id: "revenue", header: "Revenue", align: "right", cell: (d) => <span className="tabular-nums">{formatCurrency(d.revenue)}</span> },
    { id: "cost", header: "Cost", align: "right", cell: (d) => <span className="tabular-nums">{formatCurrency(d.cost)}</span> },
    { id: "profit", header: "Profit", align: "right", cell: (d) => <span className="font-medium tabular-nums text-emerald-700">{formatCurrency(d.revenue - d.cost)}</span> },
  ];

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

      <div className="space-y-4">
        <CmsChipTabs
          value={reportTab}
          onValueChange={setReportTab}
          items={[
            { value: "pnl", label: "Profit & Loss" },
            { value: "profitability", label: "Profitability" },
            { value: "revenue", label: "Revenue analytics" },
          ]}
        />
        <Tabs value={reportTab} onValueChange={setReportTab}>

        <TabsContent value="pnl" className="mt-0 space-y-4">
          <CmsChipTabs
            value={pnlPeriod}
            onValueChange={setPnlPeriod}
            items={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          {pnlPeriod === "monthly" ? (
            <>
              <ChartGridCell colSpan={12}>
                <ChartPanel title="Monthly P&L" description="Income, expenses, and net profit" icon={BarChart3} accent="emerald" headerExtra={
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportPdf}><Download className="h-3 w-3 mr-1" />PDF</Button>
                }>
                  <FinanceDualLineChart data={pnlMonthly.map((r) => ({ month: r.month, income: r.income, expenses: r.expenses }))} line1Key="income" line2Key="expenses" line1Label="Income" line2Label="Expenses" />
                </ChartPanel>
              </ChartGridCell>
              <CmsDataTable className="mt-3" columns={monthlyColumns} rows={pnlMonthly} rowKey={(r) => r.month} />
            </>
          ) : (
            <CmsDataTable columns={yearlyColumns} rows={pnlYearly} rowKey={(r) => r.year} />
          )}
        </TabsContent>

        <TabsContent value="profitability" className="mt-0 space-y-4">
          {profitLoading ? (
            <PageChartGridSkeleton count={2} />
          ) : (
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
                <CmsDataTable columns={departmentColumns} rows={departmentProfitability} rowKey={(d) => d.department} />
              </ChartPanel>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          {revenueLoading ? (
            <PageChartPanelSkeleton height="h-[260px]" />
          ) : (
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
          )}
        </TabsContent>
      </Tabs>
      </div>
    </PortalPageShell>
  );
}
