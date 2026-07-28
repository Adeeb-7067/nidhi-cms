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
  ShoppingBag,
  Sparkles,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { Progress } from "@/components/ui/progress";
import { useSalesDashboard, useSalesRevenueTrend, useListFollowUps, useSalesTeam } from "@/api/sales";
import { formatCompactCurrency, formatCurrency, formatLeadSourceLabel } from "@/modules/sales/constants";
import {
  SalesFilterBar,
  SalesPipelineFlow,
  SalesPageHeader,
  SalesDonutPanel,
  SalesDualLineChart,
  SalesStatusBadge,
  SalesEmptyState,
  ExecutiveAvatar,
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: dash, isLoading: dashLoading, isError: dashError, refetch: refetchDash } = useSalesDashboard({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: trendData, isLoading: trendLoading, isError: trendError } = useSalesRevenueTrend(trendPeriod);
  const { data: fuData, isLoading: fuLoading } = useListFollowUps({ limit: 50 });
  const { data: teamData } = useSalesTeam({ limit: 8 });

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
    revenue: t.billed ?? 0,
    collected: t.collected ?? t.revenue ?? 0,
  }));

  const invoiceDonutData = Object.entries(dash?.invoiceByStatus ?? {}).map(([status, v]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    count: v.count,
    value: v.amount,
  }));

  const leadsSourceData = (dash?.leadsBySource ?? []).map((row) => ({
    name: formatLeadSourceLabel(row.source),
    count: row.count,
    value: row.count,
  }));

  const exportDashboardCsv = () => {
    if (!dash) { toast.error("Dashboard data not loaded yet"); return; }
    const rows = [
      ["Metric", "Value"],
      [dash.isFiltered ? "Revenue (selected period)" : "Revenue (all time)", dash.totalRevenue ?? 0],
      ["Total sales (deals)", dash.totalSales?.count ?? 0],
      ["Total sales (value)", dash.totalSales?.value ?? 0],
      ["Total collected", dash.totalCollected ?? 0],
      ["New project money", dash.newProjectMoney ?? 0],
      ["Old project money collected", dash.oldProjectMoney ?? 0],
      ["Outstanding", dash.outstanding ?? 0],
      ["Leads today", dash.leads?.today ?? 0],
      ["Leads this week", dash.leads?.thisWeek ?? 0],
      ["Leads this month", dash.leads?.thisMonth ?? 0],
      ["Leads closed", dash.totalLeadsClosed ?? dash.leads?.closed ?? 0],
      ["Total proposals", dash.totalProposals ?? 0],
      ["Pending invoices", dash.pendingInvoices ?? 0],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `sales-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

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
            onClick={exportDashboardCsv}
          >
            Export summary
          </Button>
        }
      />

      <SalesFilterBar onExport={exportDashboardCsv}>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[150px] bg-background text-xs"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-[150px] bg-background text-xs"
            aria-label="To date"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
            >
              Clear
            </Button>
          )}
        </div>
      </SalesFilterBar>
      {dash?.salesKpisPeriod ? (
        <p className="text-[11px] text-muted-foreground">
          Sales KPIs below cover{" "}
          {dash.salesKpisPeriod.from ? format(new Date(dash.salesKpisPeriod.from), "MMM d, yyyy") : "the beginning"}
          {" – "}
          {dash.salesKpisPeriod.to ? format(new Date(dash.salesKpisPeriod.to), "MMM d, yyyy") : "now"}
          {!dateFrom && !dateTo ? " (this month by default — pick a date range above to change it)" : ""}
        </p>
      ) : null}

      {dashError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-destructive">Could not load dashboard metrics.</p>
          <Button size="sm" variant="outline" onClick={() => void refetchDash()}>Retry</Button>
        </div>
      ) : null}

      <motion.div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview KPIs</p>
          <CmsChipTabs
            value={leadPeriod}
            onValueChange={(v) => setLeadPeriod(v as typeof leadPeriod)}
            items={[
              { value: "today", label: "Today" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </div>
        {dashLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <PortalKpiGrid
            columns={4}
            count={8}
            items={[
              { title: "Total leads", value: leadCount.toLocaleString(), icon: Users, accent: "blue", href: "/sales/leads", delay: 0 },
              { title: "Leads closed", value: (dash?.totalLeadsClosed ?? dash?.leads?.closed ?? 0).toLocaleString(), hint: "Converted to customers", icon: CheckCircle2, accent: "violet", href: "/sales/leads", delay: 1 },
              { title: "Active follow-ups", value: dash?.activeFollowUps ?? 0, icon: CalendarClock, accent: "amber", href: "/sales/follow-ups", delay: 2 },
              { title: "Proposals", value: dash?.totalProposals ?? 0, icon: FileText, accent: "violet", href: "/sales/proposals", delay: 3 },
              { title: "Pending invoices", value: dash?.pendingInvoices ?? 0, icon: Receipt, accent: "sky", href: "/sales/invoices", delay: 4 },
              { title: "Total sales", value: formatCompactCurrency(dash?.totalSales?.value ?? 0), hint: `${dash?.totalSales?.count ?? 0} deals`, icon: ShoppingBag, accent: "green", href: "/sales/installments", delay: 5 },
              { title: "Revenue collected", value: formatCompactCurrency(dash?.totalRevenue ?? 0), hint: dash?.isFiltered ? "Selected period" : "All time", icon: IndianRupee, accent: "green", href: "/sales/payments", delay: 6 },
              { title: "Outstanding", value: formatCompactCurrency(dash?.outstanding ?? 0), icon: AlertCircle, accent: "red", alert: true, href: "/sales/payments", delay: 7 },
            ]}
          />
        )}
      </motion.div>

      <SalesPipelineFlow />

      <motion.div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial KPIs</p>
        {dashLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <PortalKpiGrid
            columns={4}
            count={7}
            items={[
              { title: "Total collected", value: formatCompactCurrency(dash?.totalCollected ?? 0), hint: "This period", icon: IndianRupee, accent: "green", href: "/sales/payments", delay: 0 },
              { title: "New project money", value: formatCompactCurrency(dash?.newProjectMoney ?? 0), hint: "From deals closed this period", icon: Sparkles, accent: "blue", href: "/sales/payments", delay: 1 },
              { title: "Old project money", value: formatCompactCurrency(dash?.oldProjectMoney ?? 0), hint: "Collected on earlier deals", icon: History, accent: "violet", href: "/sales/payments", delay: 2 },
              { title: "Outstanding", value: formatCompactCurrency(dash?.outstanding ?? 0), hint: dash?.isFiltered ? "Selected period" : "Across all customers", icon: AlertCircle, accent: "red", alert: true, href: "/sales/installments", delay: 3 },
              { title: "Pending invoices", value: dash?.pendingInvoices ?? 0, hint: "Awaiting collection", icon: Receipt, accent: "violet", href: "/sales/installments", delay: 4 },
              { title: "Active customers", value: dash?.activeCustomers ?? 0, icon: Users, accent: "sky", href: "/sales/customers", delay: 5 },
              { title: "Overdue invoices", value: dash?.invoiceByStatus?.overdue?.count ?? 0, hint: "Needs follow-up", icon: AlertCircle, accent: "amber", alert: true, href: "/sales/invoices", delay: 6 },
            ]}
          />
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Leads by source" description={`${dash?.leads?.total ?? 0} total leads`} icon={Target} accent="blue" viewAllHref="/sales/leads">
            {leadsSourceData.length > 0 ? (
              <SalesDonutPanel data={leadsSourceData} />
            ) : (
              <NoDataPlaceholder label="No lead source data yet" />
            )}
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
              <CmsChipTabs
                value={trendPeriod}
                onValueChange={(v) => setTrendPeriod(v as typeof trendPeriod)}
                items={[
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "year", label: "Year" },
                ]}
              />
            }
          >
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : trendError ? (
              <NoDataPlaceholder label="Could not load revenue trend" />
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
              const approved = dash.proposalByStatus?.approved ?? 0;
              const declined = dash.proposalByStatus?.declined ?? 0;
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
          <ChartPanel title="Top performing executives" description="Ranked by revenue generated" icon={Users} accent="blue" viewAllHref="/sales/team">
            {(() => {
              const members = [...(teamData?.team ?? [])].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
              if (!members.length) return <NoDataPlaceholder label="No team members found" />;
              const ranked = members.map((m, i) => ({ ...m, rank: i + 1 }));
              return (
                <CmsDataTable
                  columns={[
                    {
                      id: "rank",
                      header: "#",
                      headerClassName: "w-8",
                      cell: (m) => (
                        <span className="font-bold text-muted-foreground">{m.rank}</span>
                      ),
                    },
                    {
                      id: "executive",
                      header: "Executive",
                      cell: (m) => (
                        <Link href={`/sales/team/${m.id}/profile`}>
                          <ExecutiveAvatar name={m.name} />
                        </Link>
                      ),
                    },
                    {
                      id: "revenue",
                      header: "Revenue",
                      align: "right",
                      cell: (m) => (
                        <span className="font-medium tabular-nums">{formatCurrency(m.revenue)}</span>
                      ),
                    },
                    {
                      id: "deals",
                      header: "Deals",
                      align: "right",
                      cell: (m) => m.dealsClosed,
                    },
                    {
                      id: "followups",
                      header: "Follow-ups",
                      align: "right",
                      cell: (m) => <span className="text-amber-600">{m.pendingFollowUps}</span>,
                    },
                  ] satisfies CmsColumn<(typeof ranked)[number]>[]}
                  rows={ranked}
                  rowKey={(m) => m.id}
                  embedded
                />
              );
            })()}
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
          <CmsDataTable
            columns={[
              {
                id: "lead",
                header: "Lead",
                cell: (fu) => (
                  <p className="font-medium">{fu.leadName ?? `Lead #${fu.leadId}`}</p>
                ),
              },
              {
                id: "type",
                header: "Type",
                cell: (fu) => <span className="capitalize">{fu.type}</span>,
              },
              {
                id: "date",
                header: "Follow-up date",
                cell: (fu) => format(new Date(fu.scheduledAt), "MMM d, h:mm a"),
              },
              {
                id: "status",
                header: "Status",
                chip: true,
                cell: (fu) => <SalesStatusBadge variant="followUp" value={fu.status} />,
              },
              {
                id: "action",
                header: "Action",
                align: "right",
                cell: (fu) => (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/sales/leads/${fu.leadId}`}>
                      Open <ArrowRight className="h-3 w-3 ml-1 inline" />
                    </Link>
                  </Button>
                ),
              },
            ]}
            rows={followUpRows}
            rowKey={(fu) => fu.id}
            embedded
          />
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

      <ChartPanel title="Overdue by client" description="Clients with an overdue balance right now" icon={AlertCircle} accent="rose" viewAllHref="/sales/customers">
        {dashLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : (dash?.overdueByCustomer ?? []).length === 0 ? (
          <SalesEmptyState title="No overdue balances" description="Every client is current on their payments." />
        ) : (
          <CmsDataTable
            columns={[
              {
                id: "client",
                header: "Client",
                cell: (row) => <span className="font-medium">{row.companyName}</span>,
              },
              {
                id: "contact",
                header: "Contact",
                cell: (row) => (
                  <span className="text-muted-foreground">{row.contactPerson ?? "—"}</span>
                ),
              },
              {
                id: "amount",
                header: "Overdue amount",
                align: "right",
                cell: (row) => (
                  <span className="font-semibold text-destructive tabular-nums">
                    {formatCurrency(row.overdueAmount)}
                  </span>
                ),
              },
              {
                id: "action",
                header: "Action",
                align: "right",
                cell: (row) => (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/sales/customers/${row.customerId}`}>
                      Open <ArrowRight className="h-3 w-3 ml-1 inline" />
                    </Link>
                  </Button>
                ),
              },
            ]}
            rows={dash?.overdueByCustomer ?? []}
            rowKey={(row) => row.customerId}
            embedded
          />
        )}
      </ChartPanel>
    </PortalPageShell>
  );
}
