import { useMemo } from "react";
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
  ListChecks,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { useCaDashboard, useCaComplianceScore, downloadCaExportPack } from "@/api/ca";
import { useAuth } from "@/contexts/AuthContext";
import { formatCompactCurrency, formatPercent, AUDIT_PHASE_LABELS } from "@/modules/ca/constants";
import type { ComplianceStatusRow } from "@/modules/ca/types";
import {
  CAPageHeader,
  CAFilterBar,
  CAAlertBox,
  ComplianceStatusBadge,
  CAScoreWidget,
  CaRefLink,
  CaWorkQueue,
  CaAdminAnalyticsCharts,
} from "@/modules/ca/components";
import { caCalendarHref, caComplianceAreaHref } from "@/modules/ca/routes";
import { useCaWorkingPeriod } from "@/modules/ca/hooks/use-ca-working-period";
import { resolveCaDateRange } from "@/modules/ca/adapters/finance";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function CaDashboard() {
  const { user } = useAuth();
  const isAdminView = user?.role === "super_admin";
  const { dateRange, setDateRange } = useCaWorkingPeriod();
  const { dashboardPeriod } = resolveCaDateRange(dateRange);
  const { data, isLoading, isError, refetch } = useCaDashboard(dashboardPeriod);
  const { data: scoreData, isLoading: scoreLoading } = useCaComplianceScore(isAdminView);

  const kpis = data?.kpis;
  const alerts = data?.alerts ?? [];
  const complianceRows = data?.complianceStatus ?? [];
  const score = data?.scoreBreakdown ?? scoreData?.breakdown;
  const workQueue = data?.workQueue;
  const scoreHistory = scoreData?.history ?? [];

  const columns = useMemo<CmsColumn<ComplianceStatusRow>[]>(
    () => [
      {
        id: "area",
        header: "Area",
        cell: (row) => (
          <CaRefLink href={caComplianceAreaHref(row.area)}>{row.area}</CaRefLink>
        ),
      },
      {
        id: "item",
        header: "Item",
        cell: (row) => (
          <CaRefLink href={caCalendarHref()} className="max-w-[220px] truncate block">
            {row.item}
          </CaRefLink>
        ),
      },
      {
        id: "due",
        header: "Due date",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.dueDate ? format(new Date(row.dueDate), "MMM d, yyyy") : "—"}
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

  const moneyKpis = [
    {
      title: "Total revenue",
      value: isLoading ? "…" : formatCompactCurrency(kpis?.totalRevenue ?? 0),
      icon: TrendingUp,
      accent: "green" as const,
      delay: 0,
    },
    {
      title: "Total expenses",
      value: isLoading ? "…" : formatCompactCurrency(kpis?.totalExpenses ?? 0),
      icon: TrendingDown,
      accent: "red" as const,
      delay: 1,
    },
    {
      title: "GST liability",
      value: isLoading ? "…" : formatCompactCurrency(kpis?.gstLiability ?? 0),
      icon: Receipt,
      accent: "amber" as const,
      alert: true,
      href: "/ca/gst",
      delay: 2,
    },
    {
      title: "Compliance score",
      value: formatPercent(kpis?.overallComplianceScore ?? 0),
      icon: ShieldCheck,
      accent: "blue" as const,
      href: "/ca/compliance-score",
      delay: 3,
    },
    {
      title: "Open notices",
      value: String(kpis?.openNotices ?? 0),
      icon: Scale,
      accent: "red" as const,
      alert: (kpis?.openNotices ?? 0) > 0,
      href: "/ca/notices",
      delay: 4,
    },
    {
      title: "Suspense",
      value: isLoading ? "…" : formatCompactCurrency(kpis?.suspenseAmount ?? 0),
      icon: IndianRupee,
      accent: "violet" as const,
      alert: (kpis?.suspenseAmount ?? 0) > 0,
      href: "/ca/suspense",
      delay: 5,
    },
    {
      title: "Pending GST filings",
      value: String(kpis?.pendingGstFilings ?? 0),
      icon: FileText,
      accent: "amber" as const,
      alert: (kpis?.pendingGstFilings ?? 0) > 0,
      href: "/ca/gst",
      delay: 6,
    },
    {
      title: "Audit status",
      value: AUDIT_PHASE_LABELS[kpis?.auditStatus ?? "planning"],
      icon: ShieldCheck,
      accent: "violet" as const,
      href: "/ca/audit",
      delay: 7,
    },
  ];

  const opsPulse = [
    {
      title: "In queue",
      value: isLoading ? "…" : String(kpis?.queueTotal ?? workQueue?.counts.total ?? 0),
      icon: ListChecks,
      accent: "amber" as const,
      delay: 0,
    },
    {
      title: "Overdue",
      value: isLoading ? "…" : String(kpis?.overdueComplianceItems ?? 0),
      icon: FileText,
      accent: "red" as const,
      alert: (kpis?.overdueComplianceItems ?? 0) > 0,
      delay: 1,
    },
    {
      title: "Due soon",
      value: isLoading ? "…" : String(kpis?.queueDueSoon ?? 0),
      icon: AlertTriangle,
      accent: "amber" as const,
      alert: (kpis?.queueDueSoon ?? 0) > 0,
      delay: 2,
    },
    {
      title: "Blocked",
      value: isLoading ? "…" : String(kpis?.queueBlocked ?? 0),
      icon: Scale,
      accent: "red" as const,
      alert: (kpis?.queueBlocked ?? 0) > 0,
      href: "/ca/suspense",
      delay: 3,
    },
  ];

  return (
    <PortalPageShell>
      <CAPageHeader
        title={isAdminView ? "CA analytics" : "CA workbench"}
        description={
          isAdminView
            ? "Executive compliance analytics — score, liability, and filing posture"
            : "Your morning queue — overdue, due soon, and blocked items"
        }
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: isAdminView ? "Analytics" : "Dashboard" }]}
        actions={
          <div className="flex gap-2">
            {isAdminView ? (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                <Link href="/admin/analytics">
                  <BarChart3 className="h-3.5 w-3.5" /> Agency analytics
                </Link>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                void downloadCaExportPack().catch((err) =>
                  toastApiError(err, "Could not download compliance pack"),
                );
              }}
            >
              Export compliance pack
            </Button>
          </div>
        }
      />

      <CAFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => {
          void downloadCaExportPack()
            .then(() => toast.success("Compliance pack downloaded"))
            .catch((err) => toastApiError(err, "Could not download compliance pack"));
        }}
      />

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          Could not load CA dashboard.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      <CAAlertBox alerts={alerts} />

      {isAdminView ? (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Executive KPIs
            </p>
            <PortalKpiGrid columns={4} count={8} items={moneyKpis} />
          </div>

          <CaAdminAnalyticsCharts
            scoreBreakdown={score}
            scoreHistory={scoreHistory}
            workQueue={workQueue}
            money={{
              totalRevenue: kpis?.totalRevenue ?? 0,
              totalExpenses: kpis?.totalExpenses ?? 0,
              gstLiability: kpis?.gstLiability ?? 0,
              suspenseAmount: kpis?.suspenseAmount ?? 0,
            }}
            isLoading={isLoading || scoreLoading}
          />

          <div className="grid gap-4 lg:grid-cols-4">
            <CAScoreWidget label="GST compliance" score={score?.gst ?? 0} />
            <CAScoreWidget label="Tax compliance" score={score?.tax ?? 0} />
            <CAScoreWidget label="ROC compliance" score={score?.roc ?? 0} />
            <CAScoreWidget label="Audit readiness" score={score?.audit ?? 0} />
          </div>

          <ChartPanel
            title="Compliance calendar"
            description="Upcoming and overdue filings — oversight view"
            icon={ShieldCheck}
            accent="blue"
            viewAllHref="/ca/compliance-calendar"
          >
            <CmsDataTable
              columns={columns}
              rows={complianceRows.slice(0, 8)}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              embedded
              onRowClick={(row) => {
                window.location.href = caComplianceAreaHref(row.area);
              }}
            />
            <ChartGridCell className="pt-3">
              <Link href="/ca/compliance-calendar">
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                  View full calendar <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </ChartGridCell>
          </ChartPanel>

          <CaWorkQueue queue={workQueue} isLoading={isLoading} />
        </>
      ) : (
        <>
          <CaWorkQueue queue={workQueue} isLoading={isLoading} />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Queue pulse
            </p>
            <PortalKpiGrid columns={4} items={opsPulse} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Money snapshot
            </p>
            <PortalKpiGrid
              columns={4}
              items={moneyKpis.slice(0, 4).map((item, i) => ({ ...item, delay: i }))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <CAScoreWidget label="GST compliance" score={score?.gst ?? 0} />
            <CAScoreWidget label="Tax compliance" score={score?.tax ?? 0} />
            <CAScoreWidget label="ROC compliance" score={score?.roc ?? 0} />
            <CAScoreWidget label="Audit readiness" score={score?.audit ?? 0} />
          </div>

          <ChartPanel
            title="Compliance calendar preview"
            description="Upcoming and overdue filings from CA calendar"
            icon={ShieldCheck}
            accent="blue"
            viewAllHref="/ca/compliance-calendar"
          >
            <CmsDataTable
              columns={columns}
              rows={complianceRows.slice(0, 8)}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              embedded
              onRowClick={(row) => {
                window.location.href = caComplianceAreaHref(row.area);
              }}
            />
            <ChartGridCell className="pt-3">
              <Link href="/ca/compliance-calendar">
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                  View full calendar <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </ChartGridCell>
          </ChartPanel>
        </>
      )}
    </PortalPageShell>
  );
}
