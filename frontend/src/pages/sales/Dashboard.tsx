import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Users,
  CalendarClock,
  FileText,
  Receipt,
  IndianRupee,
  AlertCircle,
  TrendingUp,
  Target,
  CheckCircle2,
  XCircle,
  BarChart2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSalesDashboard, useSalesPipeline, useSalesRevenueTrend, useListFollowUps } from "@/api/sales";
import { formatCompactCurrency, formatCurrency } from "@/modules/sales/constants";
import {
  SalesFilterBar,
  SalesPipelineFlow,
  SalesPageHeader,
  SalesDonutPanel,
  SalesDualLineChart,
  SalesStatusBadge,
  SalesEmptyState,
} from "@/modules/sales/components";
import { toast } from "sonner";

function NoDataPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart2 className="h-8 w-8 opacity-20" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

export default function SalesDashboard() {
  const [leadPeriod, setLeadPeriod] = useState<"today" | "week" | "month">("month");
  const [trendPeriod, setTrendPeriod] = useState<"week" | "month" | "year">("month");

  const { data: dash, isLoading: dashLoading } = useSalesDashboard();
  const { data: pipelineData } = useSalesPipeline();
  const { data: trendData, isLoading: trendLoading } = useSalesRevenueTrend(trendPeriod);
  const { data: fuData, isLoading: fuLoading } = useListFollowUps();

  const leadCount =
    leadPeriod === "today"
      ? (dash?.leads.today ?? 0)
      : leadPeriod === "week"
        ? (dash?.leads.thisWeek ?? 0)
        : (dash?.leads.thisMonth ?? 0);

  const followUpRows = [...(fuData?.followUps ?? [])]
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 6);

  const trendChartData = (trendData?.trend ?? []).map((t) => ({
    day: format(new Date(t.date), "MMM d"),
    revenue: t.revenue,
    collected: t.revenue,
  }));

  const invoiceDonutData = Object.entries(dash?.invoiceByStatus ?? {}).map(([status, v]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    count: v.count,
    value: v.amount,
  }));

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="CRM & Sales Dashboard"
        description="Super admin control center — real-time snapshot of sales operations"
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Dashboard" }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => toast.success("Summary report export started (demo)")}
          >
            Export summary
          </Button>
        }
      />

      <SalesFilterBar onExport={() => toast.success("Export started (demo)")} />

      <motion.div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview KPIs</p>
          <Tabs value={leadPeriod} onValueChange={(v) => setLeadPeriod(v as typeof leadPeriod)}>
            <TabsList className="h-7">
              <TabsTrigger value="today" className="text-[10px] px-2 h-6">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-[10px] px-2 h-6">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-[10px] px-2 h-6">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {dashLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <PortalKpiGrid
            columns={4}
            count={6}
            items={[
              { title: "Total leads", value: leadCount.toLocaleString(), icon: Users, accent: "blue", href: "/sales/leads", delay: 0 },
              { title: "Active follow-ups", value: dash?.activeFollowUps ?? 0, icon: CalendarClock, accent: "amber", href: "/sales/follow-ups", delay: 1 },
              { title: "Proposals", value: dash?.totalProposals ?? 0, icon: FileText, accent: "violet", href: "/sales/proposals", delay: 2 },
              { title: "Pending invoices", value: dash?.pendingInvoices ?? 0, icon: Receipt, accent: "sky", href: "/sales/invoices", delay: 3 },
              { title: "Revenue collected", value: formatCompactCurrency(dash?.totalRevenue ?? 0), icon: IndianRupee, accent: "green", href: "/sales/payments", delay: 4 },
              { title: "Outstanding", value: formatCompactCurrency(dash?.outstanding ?? 0), icon: AlertCircle, accent: "red", alert: true, href: "/sales/payments", delay: 5 },
            ]}
          />
        )}
      </motion.div>

      <SalesPipelineFlow />

      <motion.div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial KPIs</p>
        {dashLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <PortalKpiGrid
            columns={4}
            count={6}
            items={[
              { title: "Total revenue", value: formatCompactCurrency(dash?.totalRevenue ?? 0), icon: IndianRupee, accent: "green", href: "/sales/reports", delay: 0 },
              { title: "Total billed", value: formatCompactCurrency(dash?.totalBilled ?? 0), icon: Receipt, accent: "blue", href: "/sales/invoices", delay: 1 },
              { title: "Outstanding", value: formatCompactCurrency(dash?.outstanding ?? 0), hint: "Across all customers", icon: AlertCircle, accent: "red", alert: true, href: "/sales/installments", delay: 2 },
              { title: "Pending invoices", value: dash?.pendingInvoices ?? 0, hint: "Awaiting collection", icon: Receipt, accent: "violet", href: "/sales/installments", delay: 3 },
              { title: "Active customers", value: dash?.activeCustomers ?? 0, icon: Users, accent: "sky", href: "/sales/customers", delay: 4 },
              { title: "Overdue invoices", value: dash?.invoiceByStatus?.overdue?.count ?? 0, hint: "Needs follow-up", icon: AlertCircle, accent: "amber", alert: true, href: "/sales/invoices", delay: 5 },
            ]}
          />
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Leads by source" description="Source breakdown not available yet" icon={Target} accent="blue" viewAllHref="/sales/leads">
            <NoDataPlaceholder label="Lead source data not in API — add aggregation endpoint" />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Invoice status" description={`${(dash?.pendingInvoices ?? 0) + (dash?.invoiceByStatus?.paid?.count ?? 0)} total`} icon={Receipt} accent="blue" viewAllHref="/sales/invoices">
            {invoiceDonutData.length > 0 ? (
              <SalesDonutPanel data={invoiceDonutData} />
            ) : (
              <NoDataPlaceholder label="No invoice data yet" />
            )}
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Revenue trend"
            description="Collected revenue over time"
            icon={TrendingUp}
            accent="emerald"
            viewAllHref="/sales/reports"
            headerExtra={
              <Tabs value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as typeof trendPeriod)}>
                <TabsList className="h-6">
                  <TabsTrigger value="week" className="text-[10px] px-2 h-5">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-[10px] px-2 h-5">Month</TabsTrigger>
                  <TabsTrigger value="year" className="text-[10px] px-2 h-5">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : trendChartData.length > 0 ? (
              <SalesDualLineChart
                data={trendChartData}
                line1Key="revenue"
                line2Key="collected"
                line1Label="Billed"
                line2Label="Collected"
                currency
              />
            ) : (
              <NoDataPlaceholder label="No trend data yet — add transactions to see chart" />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel title="Proposal outcomes" description="Accept / decline rates" icon={FileText} accent="amber">
            {dash ? (() => {
              const approved = dash.invoiceByStatus?.approved?.count ?? 0;
              const declined = dash.invoiceByStatus?.declined?.count ?? 0;
              const total = approved + declined;
              const acceptRate = total ? Math.round((approved / total) * 100) : 0;
              const rejectRate = total ? 100 - acceptRate : 0;
              return (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Acceptance rate</span>
                    </div>
                    <span className="text-lg font-bold text-green-700">{acceptRate}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Rejection rate</span>
                    </div>
                    <span className="text-lg font-bold text-destructive">{rejectRate}%</span>
                  </div>
                  <Progress value={acceptRate} className="h-2" />
                  <p className="text-[10px] text-muted-foreground text-center">{dash.totalProposals} proposals total</p>
                </div>
              );
            })() : <Skeleton className="h-[200px] rounded-lg" />}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={8}>
          <ChartPanel title="Top performing executives" description="Breakdown not available via API yet" icon={Users} accent="blue" viewAllHref="/sales/team">
            <NoDataPlaceholder label="Executive leaderboard requires user-aggregation endpoint" />
          </ChartPanel>
        </ChartGridCell>
      </div>

      <ChartPanel title="Follow-up summary" description="Scheduled and upcoming" icon={CalendarClock} accent="amber" viewAllHref="/sales/follow-ups">
        {fuLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : followUpRows.length === 0 ? (
          <SalesEmptyState title="No follow-ups scheduled" description="Create follow-ups from a lead's detail page." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Lead</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Follow-up date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followUpRows.map((fu) => (
                <TableRow key={fu.id}>
                  <TableCell>
                    <p className="text-xs font-medium">Lead #{fu.leadId}</p>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{fu.type}</TableCell>
                  <TableCell className="text-xs">{format(new Date(fu.scheduledAt), "MMM d, h:mm a")}</TableCell>
                  <TableCell><SalesStatusBadge variant="followUp" value={fu.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/sales/leads/${fu.leadId}`}>
                        Open <ArrowRight className="h-3 w-3 ml-1 inline" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ChartPanel>

      <ChartPanel title="Outstanding payments" description="Pending collections" icon={AlertCircle} accent="rose" viewAllHref="/sales/payments">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Total outstanding</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(dash?.outstanding ?? 0)}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/sales/invoices?status=unpaid">View unpaid invoices</Link>
          </Button>
        </div>
      </ChartPanel>
    </PortalPageShell>
  );
}
