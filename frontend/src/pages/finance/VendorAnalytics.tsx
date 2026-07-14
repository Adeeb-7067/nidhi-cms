import { useState } from "react";
import { Link } from "wouter";
import {
  Building2,
  TrendingDown,
  Wallet,
  Users,
  Trophy,
} from "lucide-react";
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
  FinancePageHeader,
  FinanceFilterBar,
  FinanceBarChart,
  FinanceAreaTrendChart,
  FinanceDonutPanel,
  FinanceErrorState,
} from "@/modules/finance/components";
import { FinanceDashboardSkeleton } from "@/components/loading";
import { formatCompactCurrency, formatCurrency } from "@/modules/finance/constants";
import { useVendorAnalytics } from "@/api/finance";

const CATEGORY_LABELS: Record<string, string> = {
  software: "Software",
  hardware: "Hardware",
  travel: "Travel",
  office: "Office",
  marketing: "Marketing",
  utilities: "Utilities",
  professional: "Professional",
  misc: "Misc",
};

function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export default function FinanceVendorAnalytics() {
  const [dateRange, setDateRange] = useState<"current" | "previous">("current");
  const { data, isLoading, isError, refetch } = useVendorAnalytics(dateRange);

  if (isLoading && !data) return <FinanceDashboardSkeleton />;
  if (isError && !data) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }
  if (!data) return <FinanceDashboardSkeleton />;

  const { kpis, monthlyTrend, topVendors, categoryBreakdown } = data;
  const trendData = monthlyTrend.map((m) => ({ month: formatMonth(m.month), spend: m.spend }));
  const topVendorBars = topVendors.slice(0, 6).map((v) => ({ name: v.name, spend: v.spend }));
  const donutData = categoryBreakdown.map((c) => ({
    name: CATEGORY_LABELS[c.name] ?? c.name,
    count: c.count,
    value: c.value,
  }));

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Vendor Analytics"
        description="Spend by vendor, top vendors, monthly trend, and outstanding payables"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Vendors", href: "/finance/vendors" },
          { label: "Analytics" },
        ]}
      />

      <FinanceFilterBar
        dateRange={dateRange}
        onDateRangeChange={(v) => setDateRange(v as "current" | "previous")}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor KPIs</p>
        <PortalKpiGrid
          columns={4}
          count={4}
          items={[
            {
              title: "Vendor spend",
              value: formatCompactCurrency(kpis.totalSpend),
              hint: `${kpis.trends.totalSpend >= 0 ? "↑" : "↓"} ${Math.abs(kpis.trends.totalSpend)}% vs prior period`,
              icon: TrendingDown,
              accent: "red",
              href: "/finance/expenses",
              delay: 0,
            },
            {
              title: "Active vendors",
              value: kpis.activeVendors,
              hint: `${kpis.totalVendors} total vendors`,
              icon: Users,
              accent: "blue",
              href: "/finance/vendors",
              delay: 1,
            },
            {
              title: "Top vendor",
              value: formatCompactCurrency(kpis.topVendorSpend),
              hint: kpis.topVendorName ?? "No spend yet",
              icon: Trophy,
              accent: "amber",
              delay: 2,
            },
            {
              title: "Outstanding payables",
              value: formatCompactCurrency(kpis.outstandingPayables),
              hint: "Bill amount still unpaid",
              icon: Wallet,
              accent: kpis.outstandingPayables > 0 ? "red" : "green",
              alert: kpis.outstandingPayables > 0,
              href: "/finance/ledgers",
              delay: 3,
            },
          ]}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends & breakdown</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <ChartGridCell colSpan={8}>
            <ChartPanel
              title="Monthly vendor spend"
              description="Approved vendor expenses over time"
              icon={TrendingDown}
              accent="rose"
              viewAllHref="/finance/expenses"
            >
              {trendData.some((d) => d.spend > 0) ? (
                <FinanceAreaTrendChart data={trendData} dataKey="spend" xKey="month" stroke="#ef4444" gradientId="vendorSpend" />
              ) : (
                <p className="text-xs text-muted-foreground py-16 text-center">No vendor spend recorded yet.</p>
              )}
            </ChartPanel>
          </ChartGridCell>
          <ChartGridCell colSpan={4}>
            <ChartPanel
              title="Spend by category"
              description="Where vendor money goes"
              icon={Building2}
              accent="violet"
              viewAllHref="/finance/expenses"
            >
              {donutData.length > 0 ? (
                <FinanceDonutPanel data={donutData} />
              ) : (
                <p className="text-xs text-muted-foreground py-16 text-center">No categorised vendor spend yet.</p>
              )}
            </ChartPanel>
          </ChartGridCell>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top vendors</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <ChartGridCell colSpan={4}>
            <ChartPanel title="Top vendors by spend" icon={Trophy} accent="amber" viewAllHref="/finance/vendors">
              {topVendorBars.length > 0 ? (
                <FinanceBarChart data={topVendorBars} dataKey="spend" nameKey="name" color="#f59e0b" />
              ) : (
                <p className="text-xs text-muted-foreground py-16 text-center">No vendor spend yet.</p>
              )}
            </ChartPanel>
          </ChartGridCell>
          <ChartGridCell colSpan={8}>
            <ChartPanel title="Vendor spend detail" icon={Building2} accent="blue" viewAllHref="/finance/vendors">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vendor</TableHead>
                    <TableHead className="text-xs text-right">Expenses</TableHead>
                    <TableHead className="text-xs text-right">Total spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topVendors.map((v) => (
                    <TableRow key={v.vendorId}>
                      <TableCell className="text-xs font-medium truncate max-w-[220px]">
                        <Link href={`/finance/ledgers/vendors/${v.vendorId}`} className="hover:text-primary">
                          {v.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{v.count}</TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(v.spend)}</TableCell>
                    </TableRow>
                  ))}
                  {topVendors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                        No vendor spend recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ChartPanel>
          </ChartGridCell>
        </div>
      </div>
    </PortalPageShell>
  );
}
