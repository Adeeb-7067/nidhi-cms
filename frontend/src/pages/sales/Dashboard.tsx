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
  ArrowRight,
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  dashboardKpis,
  salesOverviewMay,
  leadsBySource,
  leadsByStatus,
  mockFollowUps,
  salesExecutives,
  invoiceSummary,
  mockPayments,
  mockFinancialTimeline,
} from "@/modules/sales/mock-data";
import { formatCompactCurrency, formatCurrency, formatPercent, financialDashboardKpis } from "@/modules/sales/constants";
import {
  SalesFilterBar,
  SalesPipelineFlow,
  SalesPageHeader,
  SalesDonutPanel,
  SalesDualLineChart,
  SalesStatusBadge,
  ExecutiveAvatar,
  FinancialActivityTimeline,
} from "@/modules/sales/components";
import { toast } from "sonner";

export default function SalesDashboard() {
  const [dateRange, setDateRange] = useState("month");
  const [executive, setExecutive] = useState("all");
  const [leadPeriod, setLeadPeriod] = useState<"today" | "week" | "month">("month");
  const kpis = dashboardKpis;

  const leadCount =
    leadPeriod === "today"
      ? kpis.leadPeriods.today
      : leadPeriod === "week"
        ? kpis.leadPeriods.week
        : kpis.leadPeriods.month;

  const followUpRows = [...mockFollowUps]
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 6);

  const topExecutives = [...salesExecutives].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxExecRevenue = topExecutives[0]?.revenue ?? 1;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Admin dashboard"
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

      <SalesFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        executive={executive}
        onExecutiveChange={setExecutive}
        executives={salesExecutives}
        onExport={() => toast.success("Export started (demo)")}
      />

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
        <PortalKpiGrid
          columns={3}
          count={6}
          items={[
            { title: "Total leads", value: leadCount.toLocaleString(), hint: `↑ ${kpis.trends.totalLeads}% vs prior period`, icon: Users, accent: "blue", href: "/sales/leads", delay: 0 },
            { title: "Active follow-ups", value: kpis.activeFollowUps, hint: `↑ ${kpis.trends.activeFollowUps}% vs Apr`, icon: CalendarClock, accent: "amber", href: "/sales/follow-ups", delay: 1 },
            { title: "Proposals sent", value: kpis.proposalsSent, hint: `↑ ${kpis.trends.proposals}% vs Apr`, icon: FileText, accent: "violet", href: "/sales/proposals", delay: 2 },
            { title: "Pending invoices", value: kpis.pendingInvoices, hint: `↓ ${Math.abs(kpis.trends.pendingInvoices)}% vs Apr`, icon: Receipt, accent: "sky", href: "/sales/invoices", delay: 3 },
            { title: "Revenue collected", value: formatCompactCurrency(kpis.payments), hint: `↑ ${kpis.trends.payments}% vs Apr`, icon: IndianRupee, accent: "green", href: "/sales/payments", delay: 4 },
            { title: "Outstanding amount", value: formatCompactCurrency(kpis.dueAmount), hint: `↓ ${Math.abs(kpis.trends.dueAmount)}% vs Apr`, icon: AlertCircle, accent: "red", alert: true, href: "/sales/payments", delay: 5 },
          ]}
        />
      </motion.div>

      <SalesPipelineFlow />

      <motion.div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial KPIs</p>
        <PortalKpiGrid
          columns={3}
          count={6}
          items={[
            { title: "Total revenue", value: formatCompactCurrency(financialDashboardKpis.totalRevenue), hint: `↑ ${financialDashboardKpis.trends.totalRevenue}%`, icon: IndianRupee, accent: "green", href: "/sales/reports", delay: 0 },
            { title: "Outstanding", value: formatCompactCurrency(financialDashboardKpis.outstandingPayments), hint: "Across all customers", icon: AlertCircle, accent: "red", alert: true, href: "/sales/installments", delay: 1 },
            { title: "Installments pending", value: financialDashboardKpis.installmentsPending, hint: "Awaiting collection", icon: Receipt, accent: "violet", href: "/sales/installments", delay: 2 },
            { title: "Payments received", value: financialDashboardKpis.paymentsReceived, hint: "This month", icon: IndianRupee, accent: "blue", href: "/sales/payments", delay: 3 },
            { title: "Overdue invoices", value: financialDashboardKpis.overdueInvoices, hint: "Needs follow-up", icon: AlertCircle, accent: "amber", alert: true, href: "/sales/invoices", delay: 4 },
            { title: "Proposal pipeline", value: formatCompactCurrency(financialDashboardKpis.proposalValue), hint: "Open estimate value", icon: FileText, accent: "sky", href: "/sales/proposals", delay: 5 },
          ]}
        />
      </motion.div>

  

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Leads by source" description="Website, Instagram, manual, import" icon={Target} accent="blue" viewAllHref="/sales/leads">
            <SalesDonutPanel data={leadsBySource.map((d) => ({ name: d.name, count: d.count, value: d.value }))} />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Leads by status" description="New, follow-up, interested, closed" icon={Users} accent="violet" viewAllHref="/sales/leads">
            <SalesDonutPanel data={leadsByStatus.map((d) => ({ name: d.name, count: d.count, value: d.value }))} />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Revenue trend" description="Daily / weekly / monthly" icon={TrendingUp} accent="emerald" viewAllHref="/sales/reports">
            <SalesDualLineChart data={salesOverviewMay} line1Key="invoices" line2Key="payments" line1Label="Invoiced" line2Label="Collected" currency />
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel title="Proposal outcomes" description="Acceptance vs rejection rate" icon={FileText} accent="amber">
            <div className="space-y-4 py-2">
              <motion.div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Acceptance rate</span>
                </div>
                <span className="text-lg font-bold text-green-700">{formatPercent(kpis.proposalAcceptanceRate)}</span>
              </motion.div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <motion.div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Rejection rate</span>
                </motion.div>
                <span className="text-lg font-bold text-destructive">{formatPercent(kpis.proposalRejectionRate)}</span>
              </div>
              <Progress value={kpis.proposalAcceptanceRate} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">{kpis.proposalsSent} proposals sent this month</p>
            </div>
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel title="Invoice status" description={`${kpis.invoices} total generated`} icon={Receipt} accent="blue" viewAllHref="/sales/invoices">
            <SalesDonutPanel data={invoiceSummary.map((d) => ({ name: d.name, count: d.count, value: d.value }))} />
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel title="Top performing executives" description="By revenue this month" icon={Users} accent="blue" viewAllHref="/sales/team">
            <div className="space-y-3">
              {topExecutives.map((e, i) => (
                <div key={e.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                      <ExecutiveAvatar name={e.name} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{formatCompactCurrency(e.revenue)}</span>
                  </div>
                  <Progress value={(e.revenue / maxExecRevenue) * 100} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground pl-6">{e.dealsClosed} deals · {e.pendingFollowUps} follow-ups pending</p>
                </div>
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>

      <ChartPanel title="Follow-up summary" description="Today's, overdue, and upcoming" icon={CalendarClock} accent="amber" viewAllHref="/sales/follow-ups">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Lead</TableHead>
              <TableHead className="text-xs">Executive</TableHead>
              <TableHead className="text-xs">Follow-up date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {followUpRows.map((fu) => (
              <TableRow key={fu.id}>
                <TableCell>
                  <p className="text-xs font-medium">{fu.leadName}</p>
                  <p className="text-[10px] text-muted-foreground">{fu.company}</p>
                </TableCell>
                <TableCell><ExecutiveAvatar name={fu.executive.name} /></TableCell>
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
      </ChartPanel>

      <ChartPanel title="Outstanding payments" description="Pending collections" icon={AlertCircle} accent="rose" viewAllHref="/sales/payments">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Invoice</TableHead>
              <TableHead className="text-xs text-right">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPayments.filter((p) => p.status !== "paid").map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{p.customerName}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{p.invoiceNumber}</TableCell>
                <TableCell className="text-xs text-right font-medium text-destructive tabular-nums">{formatCurrency(p.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartPanel>
      <ChartPanel title="Recent financial activity" icon={IndianRupee} accent="emerald">
        <FinancialActivityTimeline events={mockFinancialTimeline} limit={6} />
      </ChartPanel>
    </PortalPageShell>
  );
}
