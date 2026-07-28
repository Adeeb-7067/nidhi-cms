import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  AlertTriangle,
  Scale,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import {
  caDashboardKpis,
  caDashboardAlerts,
  complianceStatusTable,
  complianceScoreBreakdown,
} from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatPercent, AUDIT_PHASE_LABELS } from "@/modules/ca/constants";
import type { ComplianceStatusRow } from "@/modules/ca/types";
import {
  CAPageHeader,
  CAFilterBar,
  CAAlertBox,
  ComplianceStatusBadge,
  CAScoreWidget,
} from "@/modules/ca/components";
import { toast } from "sonner";

export default function CaDashboard() {
  const [dateRange, setDateRange] = useState("jun");
  const kpis = caDashboardKpis;

  const columns = useMemo<CmsColumn<ComplianceStatusRow>[]>(
    () => [
      {
        id: "area",
        header: "Area",
        cell: (row) => <span className="font-medium">{row.area}</span>,
      },
      { id: "item", header: "Item", cell: (row) => row.item },
      {
        id: "due",
        header: "Due date",
        cell: (row) => (
          <span className="text-muted-foreground">
            {format(new Date(row.dueDate), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (row) => <ComplianceStatusBadge status={row.status} />,
      },
      { id: "owner", header: "Owner", cell: (row) => row.owner },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="CA Master Dashboard"
        description="CEO compliance overview — revenue, tax liability, filings, and audit status"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Dashboard" }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => toast.success("Summary export started (demo)")}
          >
            Export summary
          </Button>
        }
      />

      <CAFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Export started (demo)")}
      />

      <CAAlertBox alerts={caDashboardAlerts} />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          CEO widgets
        </p>
        <PortalKpiGrid
          columns={4}
          count={8}
          items={[
            { title: "Total revenue", value: formatCompactCurrency(kpis.totalRevenue), icon: TrendingUp, accent: "green", delay: 0 },
            { title: "Total expenses", value: formatCompactCurrency(kpis.totalExpenses), icon: TrendingDown, accent: "red", delay: 1 },
            {
              title: "GST liability",
              value: formatCompactCurrency(kpis.gstLiability),
              icon: Receipt,
              accent: "amber",
              alert: true,
              href: "/ca/gst",
              delay: 2,
            },
            {
              title: "Pending GST filings",
              value: String(kpis.pendingGstFilings),
              icon: FileText,
              accent: "amber",
              alert: kpis.pendingGstFilings > 0,
              href: "/ca/gst",
              delay: 3,
            },
            {
              title: "Pending ROC filings",
              value: String(kpis.pendingRocFilings),
              icon: Scale,
              accent: "red",
              alert: kpis.pendingRocFilings > 0,
              href: "/ca/roc",
              delay: 4,
            },
            {
              title: "Suspense amount",
              value: formatCompactCurrency(kpis.suspenseAmount),
              icon: AlertTriangle,
              accent: "red",
              alert: true,
              href: "/ca/suspense",
              delay: 5,
            },
            {
              title: "Audit status",
              value: AUDIT_PHASE_LABELS[kpis.auditStatus],
              icon: ShieldCheck,
              accent: "violet",
              href: "/ca/audit",
              delay: 6,
            },
            {
              title: "Compliance score",
              value: formatPercent(kpis.overallComplianceScore),
              icon: IndianRupee,
              accent: "blue",
              href: "/ca/compliance-score",
              delay: 7,
            },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <CAScoreWidget label="GST compliance" score={complianceScoreBreakdown.gst} />
        <CAScoreWidget label="Tax compliance" score={complianceScoreBreakdown.tax} />
        <CAScoreWidget label="ROC compliance" score={complianceScoreBreakdown.roc} />
        <CAScoreWidget label="Audit readiness" score={complianceScoreBreakdown.audit} />
      </div>

      <ChartPanel
        title="Compliance status"
        description="Upcoming and overdue filings"
        icon={ShieldCheck}
        accent="blue"
        viewAllHref="/ca/compliance-calendar"
      >
        <CmsDataTable
          columns={columns}
          rows={complianceStatusTable.slice(0, 8)}
          rowKey={(row) => row.id}
        />
        <ChartGridCell className="pt-3">
          <Link href="/ca/compliance-calendar">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              View full calendar <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </ChartGridCell>
      </ChartPanel>
    </PortalPageShell>
  );
}
