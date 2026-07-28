import { useMemo, useState } from "react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, TrendingUp, Users, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CmsChipTabs } from "@/components/cms";
import {
  ChartPanel,
  ChartGridCell,
} from "@/components/dashboard/admin-dashboard-charts";
import {
  formatCompactCurrency,
  SALES_FEATURE_COVERAGE,
  ADMIN_DASHBOARD_MODULES,
  LEAD_STATUS_ORDER,
  LEAD_STATUS_LABELS,
  formatLeadSourceLabel,
} from "@/modules/sales/constants";
import { SalesPageHeader, SalesFeatureCoverage, RevenueChartCard } from "@/modules/sales/components";
import { Link } from "wouter";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/modules/permissions/usePermission";
import {
  useSalesPipeline,
  useSalesReports,
  useSalesRevenueTrend,
} from "@/api/sales";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#94a3b8"];

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export default function Reports() {
  const [reportType, setReportType] = useState("conversion");
  const { canViewHref } = usePermissions();

  const { data: pipeline, isLoading: pipelineLoading, isError: pipelineError } = useSalesPipeline();
  const { data: reports, isLoading: reportsLoading, isError: reportsError } = useSalesReports();
  const { data: revenueData, isLoading: revenueLoading } = useSalesRevenueTrend("year");

  const visibleModules = useMemo(
    () =>
      ADMIN_DASHBOARD_MODULES.filter(
        (mod) => !mod.route || canViewHref(mod.route),
      ),
    [canViewHref],
  );

  const conversionData = useMemo(() => {
    const p = pipeline?.pipeline ?? {};
    const ordered = LEAD_STATUS_ORDER.map((stage) => ({
      stage: LEAD_STATUS_LABELS[stage],
      count: p[stage] ?? 0,
    }));
    const top = ordered[0]?.count || 1;
    return ordered.map((row) => ({
      ...row,
      rate: Math.round((row.count / top) * 100),
    }));
  }, [pipeline?.pipeline]);

  const leadsByStatus = useMemo(
    () =>
      (reports?.leadsByStatus ?? []).map((row) => ({
        name: LEAD_STATUS_LABELS[row.status as keyof typeof LEAD_STATUS_LABELS] ?? row.status,
        count: row.count,
      })),
    [reports?.leadsByStatus],
  );

  const leadsBySource = useMemo(
    () =>
      (reports?.leadsBySource ?? []).map((row) => ({
        name: formatLeadSourceLabel(row.source),
        count: row.count,
      })),
    [reports?.leadsBySource],
  );

  const performanceData = useMemo(
    () =>
      (reports?.executivePerformance ?? []).map((e) => ({
        name: e.name.split(" ")[0],
        revenue: e.revenue,
        payments: e.payments,
      })),
    [reports?.executivePerformance],
  );

  const revenueTrend = useMemo(
    () =>
      (revenueData?.trend ?? []).map((row) => ({
        month: row.date,
        revenue: row.collected ?? row.revenue ?? 0,
      })),
    [revenueData?.trend],
  );

  const monthlyCollections = useMemo(
    () =>
      (reports?.monthlyCollections ?? []).map((row) => ({
        month: formatMonthLabel(row.month),
        collected: row.collected,
        outstanding: row.outstanding,
      })),
    [reports?.monthlyCollections],
  );

  const outstandingVsPaid = reports?.outstandingVsPaid ?? [];
  const loading = pipelineLoading || reportsLoading;

  const exportReport = () => {
    if (!reports && !pipeline) {
      toast.error("Report data not loaded yet");
      return;
    }
    const rows: string[][] = [["Section", "Label", "Value"]];
    for (const row of conversionData) {
      rows.push(["Conversion", row.stage, String(row.count)]);
    }
    for (const row of leadsBySource) {
      rows.push(["Leads by source", row.name, String(row.count)]);
    }
    for (const row of performanceData) {
      rows.push(["Executive", row.name, String(row.revenue)]);
    }
    for (const row of monthlyCollections) {
      rows.push(["Collections", row.month, String(row.collected)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Report exported as CSV");
  };

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Reports"
        description="Conversion, performance, and revenue analytics from live sales data."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Reports" },
        ]}
        actions={
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportReport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        }
      />

      {(pipelineError || reportsError) ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mb-4">
          <p className="text-sm text-destructive">Some report data could not be loaded. Charts may be incomplete.</p>
        </div>
      ) : null}

      <div className="space-y-4">
        <CmsChipTabs
          value={reportType}
          onValueChange={setReportType}
          items={[
            { value: "conversion", label: "Conversion" },
            { value: "performance", label: "Performance" },
            { value: "revenue", label: "Revenue" },
            { value: "sources", label: "Lead sources" },
            { value: "financial", label: "Financial" },
            { value: "modules", label: "Admin modules" },
            { value: "coverage", label: "Feature coverage" },
          ]}
        />
        <Tabs value={reportType} onValueChange={setReportType}>
        <TabsContent value="conversion" className="mt-0">
          {loading ? (
            <Skeleton className="h-[320px] w-full rounded-xl" />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <ChartGridCell colSpan={8}>
                <ChartPanel
                  title="Funnel conversion"
                  description="Live lead pipeline stage counts"
                  icon={TrendingUp}
                  accent="violet"
                >
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversionData} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={95} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartPanel>
              </ChartGridCell>
              <ChartGridCell colSpan={4}>
                <ChartPanel title="Lead status mix" icon={Users} accent="blue">
                  <div className="h-[280px]">
                    {leadsByStatus.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">No lead data yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={leadsByStatus}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {leadsByStatus.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </ChartPanel>
              </ChartGridCell>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          {reportsLoading ? (
            <Skeleton className="h-[320px] w-full rounded-xl" />
          ) : performanceData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment activity recorded yet.</p>
          ) : (
            <ChartPanel
              title="Executive performance"
              description="Revenue collected by staff who recorded payments"
              icon={Users}
              accent="emerald"
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(v)} />
                    <Tooltip formatter={(v: number) => formatCompactCurrency(v)} />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          {revenueLoading ? (
            <Skeleton className="h-[320px] w-full rounded-xl" />
          ) : revenueTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue recorded this year.</p>
          ) : (
            <ChartPanel
              title="Revenue trend"
              description="Payments received (year to date)"
              icon={FileText}
              accent="emerald"
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(v)} />
                    <Tooltip formatter={(v: number) => formatCompactCurrency(v)} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          )}
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          {reportsLoading ? (
            <Skeleton className="h-[320px] w-full rounded-xl" />
          ) : leadsBySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads in the database.</p>
          ) : (
            <ChartPanel title="Leads by source" icon={Users} accent="blue">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsBySource}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          )}
        </TabsContent>

        <TabsContent value="financial" className="mt-4 space-y-4">
          {reportsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading financial reports…
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <RevenueChartCard title="Monthly collections">
                <div className="h-[220px]">
                  {monthlyCollections.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No billing activity in the last 6 months.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyCollections}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(v)} />
                        <Tooltip formatter={(v: number) => formatCompactCurrency(v)} />
                        <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </RevenueChartCard>
              <RevenueChartCard title="Outstanding vs paid">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={outstandingVsPaid} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {outstandingVsPaid.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCompactCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </RevenueChartCard>
            </div>
          )}
        </TabsContent>

        <TabsContent value="modules" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Modules you can access — {visibleModules.filter((m) => m.inUi).length} of{" "}
            {visibleModules.length} pages.
          </p>
          <ul className="rounded-xl border bg-card divide-y">
            {visibleModules.map((mod) => (
              <li key={mod.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                {mod.inUi ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="flex-1 text-xs font-medium">{mod.label}</span>
                {mod.route && mod.inUi ? (
                  <Link href={mod.route} className="text-[10px] text-primary hover:underline">{mod.route}</Link>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Planned</span>
                )}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Spec checklist from your sales process flow — {SALES_FEATURE_COVERAGE.filter((f) => f.inUi).length} of{" "}
            {SALES_FEATURE_COVERAGE.length} features visible in the UI.
          </p>
          <SalesFeatureCoverage features={[...SALES_FEATURE_COVERAGE]} />
        </TabsContent>
      </Tabs>
      </div>
    </PortalPageShell>
  );
}
