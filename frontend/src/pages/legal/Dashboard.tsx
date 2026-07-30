import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Scale,
  FileWarning,
  Gavel,
  ShieldCheck,
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Progress } from "@/components/ui/progress";
import { useLegalDashboard, type LegalHearingDto } from "@/api/legal";
import type { AgreementRecord, ComplianceItem, NdaRecord } from "@/modules/legal/types";
import { formatCompactCurrency, formatPercent } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalRiskBadge,
  LegalStatusBadge,
  legalDateRangeBounds,
} from "@/modules/legal/components";

function trendHint(value: number, suffix: string) {
  if (value === 0) return suffix;
  const arrow = value > 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(value)}% ${suffix}`;
}

function inRange(iso: string | undefined | null, start: Date, end: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t <= end.getTime();
}

function matchesCounsel(
  assigned: { id?: number } | null | undefined,
  counselFilter: string,
) {
  if (counselFilter === "all") return true;
  return String(assigned?.id ?? "") === counselFilter;
}

export default function LegalDashboard() {
  const [dateRange, setDateRange] = useState("ytd");
  const [counselFilter, setCounselFilter] = useState("all");
  const { data, isLoading, isError, refetch } = useLegalDashboard();

  const kpis = data?.kpis;
  const casesByStatus = data?.casesByStatus ?? [];
  const riskDistribution = data?.riskDistribution ?? [];
  const counselList = data?.counsel ?? [];
  const { start, end } = useMemo(() => legalDateRangeBounds(dateRange), [dateRange]);

  const ndaExpiryAlerts = useMemo(() => {
    const rows = data?.ndaExpiryAlerts ?? [];
    return rows.filter(
      (n) =>
        matchesCounsel(n.assignedTo, counselFilter) && inRange(n.expiresAt, start, end),
    );
  }, [data?.ndaExpiryAlerts, counselFilter, start, end]);

  const agreementRenewalReminders = useMemo(() => {
    const rows = data?.agreementRenewalReminders ?? [];
    return rows.filter(
      (a) =>
        matchesCounsel(a.assignedTo, counselFilter) && inRange(a.renewalDate, start, end),
    );
  }, [data?.agreementRenewalReminders, counselFilter, start, end]);

  const upcomingHearings = useMemo(() => {
    const rows = data?.upcomingHearings ?? [];
    return rows.filter((h) => {
      const counselOk =
        counselFilter === "all" || String(h.assignedToId ?? "") === counselFilter;
      return counselOk && inRange(h.date, start, end);
    });
  }, [data?.upcomingHearings, counselFilter, start, end]);

  const nonCompliant = useMemo(() => {
    const rows = data?.complianceGaps ?? [];
    return rows.filter((c) => matchesCounsel(c.owner, counselFilter));
  }, [data?.complianceGaps, counselFilter]);

  const maxCaseCount = Math.max(1, ...casesByStatus.map((r) => r.count));

  const ndaColumns: CmsColumn<NdaRecord>[] = [
    { id: "party", header: "Party", cell: (n) => <span className="font-medium">{n.partyName}</span> },
    {
      id: "expires",
      header: "Expires",
      cell: (n) => (
        <span className="text-muted-foreground">{format(new Date(n.expiresAt), "MMM d, yyyy")}</span>
      ),
    },
    { id: "risk", header: "Risk", chip: true, cell: (n) => <LegalRiskBadge level={n.risk} /> },
  ];

  const agreementColumns: CmsColumn<AgreementRecord>[] = [
    {
      id: "agreement",
      header: "Agreement",
      cell: (a) => (
        <>
          <p className="font-medium truncate max-w-[180px]">{a.title}</p>
          <p className="text-[10px] text-muted-foreground">{a.counterparty}</p>
        </>
      ),
    },
    {
      id: "renewal",
      header: "Renewal",
      cell: (a) => format(new Date(a.renewalDate), "MMM d, yyyy"),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (a) => <LegalStatusBadge variant="agreement" value={a.status} />,
    },
  ];

  const hearingColumns: CmsColumn<LegalHearingDto>[] = [
    { id: "type", header: "Type", cell: (h) => h.type },
    {
      id: "reference",
      header: "Reference",
      cell: (h) => (
        <>
          <p className="font-medium">{h.title}</p>
          <p className="text-[10px] text-muted-foreground">{h.subtitle}</p>
        </>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: (h) => format(new Date(h.date), "MMM d, h:mm a"),
    },
    { id: "risk", header: "Risk", chip: true, cell: (h) => <LegalRiskBadge level={h.risk} /> },
    {
      id: "action",
      header: "Action",
      align: "right",
      cell: (h) => (
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href={h.href}>
            Open <ArrowRight className="h-3 w-3 ml-1 inline" />
          </Link>
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <PortalPageShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading legal dashboard…
        </div>
      </PortalPageShell>
    );
  }

  if (isError || !kpis) {
    return (
      <PortalPageShell>
        <LegalPageHeader
          title="Legal Dashboard"
          description="Could not load dashboard data."
          breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Dashboard" }]}
          actions={
            <Button size="sm" variant="outline" className="h-8" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Legal Dashboard"
        description="Department overview — cases, compliance, agreements, and risk indicators"
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Dashboard" }]}
        actions={
          <Button size="sm" variant="outline" className="h-8" asChild>
            <Link href="/legal/counsel">Manage counsel</Link>
          </Button>
        }
      />

      <LegalFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        counsel={counselFilter}
        onCounselChange={setCounselFilter}
        counselList={counselList}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Overview KPIs
        </p>
        <PortalKpiGrid
          columns={4}
          count={6}
          items={[
            {
              title: "Active employee cases",
              value: String(kpis.activeCases),
              hint: trendHint(kpis.trends.activeCases, "opened vs last month"),
              icon: Briefcase,
              accent: "blue",
              href: "/legal/cases",
              delay: 0,
            },
            {
              title: "NDA alerts",
              value: String(kpis.ndaAlerts),
              hint: trendHint(kpis.trends.ndaAlerts, "vs prior month window"),
              icon: FileWarning,
              accent: "amber",
              alert: true,
              href: "/legal/nda",
              delay: 1,
            },
            {
              title: "Open court cases",
              value: String(kpis.courtCases),
              hint: trendHint(kpis.trends.courtCases, "filed vs last month"),
              icon: Gavel,
              accent: "violet",
              href: "/legal/court-cases",
              delay: 2,
            },
            {
              title: "Compliance score",
              value: formatPercent(kpis.complianceScore),
              hint: "Framework adherence",
              icon: ShieldCheck,
              accent: "green",
              href: "/legal/compliance",
              delay: 3,
            },
            {
              title: "Legal expenses (YTD)",
              value: formatCompactCurrency(kpis.expensesYtd),
              hint: trendHint(kpis.trends.expensesYtd, "vs prior year to date"),
              icon: IndianRupee,
              accent: "sky",
              href: "/legal/expenses",
              delay: 4,
            },
            {
              title: "High-risk items",
              value: String(kpis.highRiskItems),
              hint: "Requires immediate attention",
              icon: AlertTriangle,
              accent: "red",
              alert: true,
              href: "/legal/cases",
              delay: 5,
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Cases by status"
            description="Employee legal matters"
            icon={Briefcase}
            accent="blue"
            viewAllHref="/legal/cases"
          >
            <div className="space-y-3 py-2">
              {casesByStatus.map((row) => (
                <div key={row.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{row.name}</span>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </div>
                  <Progress value={(row.count / maxCaseCount) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Risk distribution"
            description="Across all legal matters"
            icon={AlertTriangle}
            accent="amber"
          >
            <div className="space-y-3 py-2">
              {riskDistribution.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                >
                  <LegalRiskBadge level={row.name.toLowerCase() as "low" | "medium" | "high"} />
                  <span className="text-xs font-semibold tabular-nums">{row.count} items</span>
                </div>
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Compliance gaps"
            description="Partial or non-compliant"
            icon={ShieldCheck}
            accent="rose"
            viewAllHref="/legal/compliance"
          >
            <div className="space-y-2">
              {nonCompliant.slice(0, 4).map((item: ComplianceItem) => (
                <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{item.requirement}</p>
                    <p className="text-[10px] text-muted-foreground">{item.framework}</p>
                  </div>
                  <LegalStatusBadge variant="compliance" value={item.status} />
                </div>
              ))}
              {!nonCompliant.length ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No compliance gaps</p>
              ) : null}
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel title="NDA expiry alerts" icon={FileWarning} accent="amber" viewAllHref="/legal/nda">
          <CmsDataTable
            columns={ndaColumns}
            rows={ndaExpiryAlerts.slice(0, 5)}
            rowKey={(n) => n.id}
            empty={{ title: "No NDA alerts", description: "No matching NDA expiries for this filter." }}
            className="[&>div]:shadow-none [&>div]:border-0 [&>div]:rounded-none"
          />
        </ChartPanel>

        <ChartPanel
          title="Agreement renewals"
          icon={Scale}
          accent="violet"
          viewAllHref="/legal/agreements"
        >
          <CmsDataTable
            columns={agreementColumns}
            rows={agreementRenewalReminders.slice(0, 5)}
            rowKey={(a) => a.id}
            empty={{ title: "No renewals", description: "No matching renewals for this filter." }}
            className="[&>div]:shadow-none [&>div]:border-0 [&>div]:rounded-none"
          />
        </ChartPanel>
      </div>

      <ChartPanel title="Upcoming hearings & deadlines" icon={Gavel} accent="blue">
        <CmsDataTable
          columns={hearingColumns}
          rows={upcomingHearings.slice(0, 6)}
          rowKey={(h) => `${h.type}-${h.id}`}
          empty={{ title: "No hearings", description: "No matching hearings for this filter." }}
          className="[&>div]:shadow-none [&>div]:border-0 [&>div]:rounded-none"
        />
      </ChartPanel>
    </PortalPageShell>
  );
}
