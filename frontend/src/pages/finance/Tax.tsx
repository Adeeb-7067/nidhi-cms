import { useState } from "react";
import { Percent, Download, FileSpreadsheet } from "lucide-react";
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
import { mockTaxSummaries } from "@/modules/finance/mock-data";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinancePageLoader,
  FinanceDualLineChart,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { toast } from "sonner";

const gstChartData = mockTaxSummaries
  .filter((t) => t.periodType === "monthly")
  .map((t) => ({
    month: t.period.split(" ")[0],
    collected: t.gstCollected,
    paid: t.gstPaid,
  }));

export default function TaxPage() {
  const [periodTab, setPeriodTab] = useState("monthly");
  const { loading } = useMockPageState();

  const filtered = mockTaxSummaries.filter((t) => t.periodType === periodTab);
  const latestMonthly = mockTaxSummaries.find((t) => t.period === "May 2026");

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading tax data…" />
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
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("Excel export started (demo)")}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toast.success("PDF export started (demo)")}>
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "GST collected (May)", value: formatCurrency(latestMonthly?.gstCollected ?? 0), icon: Percent, accent: "green", delay: 0 },
          { title: "GST paid (May)", value: formatCurrency(latestMonthly?.gstPaid ?? 0), icon: Percent, accent: "red", delay: 1 },
          { title: "Net GST payable", value: formatCurrency(latestMonthly?.netGst ?? 0), icon: Percent, accent: "amber", delay: 2 },
          { title: "TDS deposited (May)", value: formatCurrency(latestMonthly?.tdsDeposited ?? 0), icon: Percent, accent: "blue", delay: 3 },
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
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("GSTR-1 export (demo)")}>Export GSTR-1 summary</Button>
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("GSTR-3B export (demo)")}>Export GSTR-3B summary</Button>
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("TDS return export (demo)")}>Export TDS return</Button>
              <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs" onClick={() => toast.success("Annual tax summary (demo)")}>Annual tax summary</Button>
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>

      <FinanceFilterBar onExport={() => toast.success("Tax report export (demo)")} />

      <Tabs value={periodTab} onValueChange={setPeriodTab}>
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
                {filtered.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="text-xs font-medium">{row.period}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(row.gstCollected)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-red-700">{formatCurrency(row.gstPaid)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(row.netGst)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.tdsDeducted)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(row.tdsDeposited)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.success(`${row.period} export (demo)`)}>
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
    </PortalPageShell>
  );
}
