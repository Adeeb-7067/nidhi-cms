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
import { Download, TrendingUp, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartPanel,
  ChartGridCell,
} from "@/components/dashboard/admin-dashboard-charts";
import {
  revenueTrend,
  leadFunnel,
  leadsBySource,
  leadsByStatus,
  salesExecutives,
} from "@/modules/sales/mock-data";
import {
  formatCompactCurrency,
  SALES_FEATURE_COVERAGE,
  ADMIN_DASHBOARD_MODULES,
  financialDashboardKpis,
  monthlyCollections,
  outstandingVsPaid,
  installmentCollectionTrend,
} from "@/modules/sales/constants";
import { SalesPageHeader, SalesFeatureCoverage, RevenueChartCard } from "@/modules/sales/components";
import { Link } from "wouter";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/modules/permissions/usePermission";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#94a3b8"];

const conversionData = leadFunnel.map((f, i, arr) => ({
  stage: f.stage,
  count: f.count,
  rate: i === 0 ? 100 : Math.round((f.count / arr[0].count) * 100),
}));

const performanceData = salesExecutives.map((e) => ({
  name: e.name.split(" ")[0],
  revenue: e.revenue,
  deals: e.dealsClosed,
  target: e.target,
}));

export default function Reports() {
  const [reportType, setReportType] = useState("conversion");
  const { canViewHref } = usePermissions();

  const visibleModules = useMemo(
    () =>
      ADMIN_DASHBOARD_MODULES.filter(
        (mod) => !mod.route || canViewHref(mod.route),
      ),
    [canViewHref],
  );

  const exportReport = () => toast.success("Export started (demo)");

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Reports"
        description="Conversion, performance, and revenue analytics."
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

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="h-9">
          <TabsTrigger value="conversion" className="text-xs">
            Conversion
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">
            Performance
          </TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs">
            Lead sources
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs">
            Financial
          </TabsTrigger>
          <TabsTrigger value="modules" className="text-xs">
            Admin modules
          </TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs">
            Feature coverage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversion" className="mt-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <ChartGridCell colSpan={8}>
              <ChartPanel
                title="Funnel conversion"
                description="Stage-to-stage drop-off"
                icon={TrendingUp}
                accent="violet"
                headerExtra={
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportReport}>
                    <Download className="h-3 w-3 mr-1" />
                    CSV
                  </Button>
                }
              >
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionData} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={75} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </ChartGridCell>
            <ChartGridCell colSpan={4}>
              <ChartPanel
                title="Lead status mix"
                icon={Users}
                accent="blue"
              >
                <div className="h-[280px]">
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
                </div>
              </ChartPanel>
            </ChartGridCell>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <ChartPanel
            title="Executive performance"
            description="Revenue vs target by executive"
            icon={Users}
            accent="emerald"
            headerExtra={
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportReport}>
                <Download className="h-3 w-3 mr-1" />
                PDF
              </Button>
            }
          >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCompactCurrency(v)} />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" fill="#94a3b8" name="Target" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <ChartPanel
            title="Monthly revenue"
            description="Revenue and invoice count"
            icon={FileText}
            accent="emerald"
            headerExtra={
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exportReport}>
                <Download className="h-3 w-3 mr-1" />
                Excel
              </Button>
            }
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
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
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
        </TabsContent>

        <TabsContent value="financial" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <RevenueChartCard title="Monthly collections">
              <div className="h-[220px]">
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </RevenueChartCard>
            <RevenueChartCard title="Installment collection trend">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={installmentCollectionTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(v)} />
                    <Tooltip formatter={(v: number) => formatCompactCurrency(v)} />
                    <Bar dataKey="advance" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="development" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="final" stackId="a" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </RevenueChartCard>
          </div>
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
            {SALES_FEATURE_COVERAGE.length} features visible in the UI (mock data; backend integration pending).
          </p>
          <SalesFeatureCoverage features={[...SALES_FEATURE_COVERAGE]} />
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
