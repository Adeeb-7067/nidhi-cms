import { useState } from "react";
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
import {
  legalDashboardKpis,
  ndaExpiryAlerts,
  agreementRenewalReminders,
  upcomingHearings,
  casesByStatus,
  riskDistribution,
  mockComplianceItems,
  legalCounsel,
} from "@/modules/legal/mock-data";
import { formatCompactCurrency, formatPercent } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalRiskBadge,
  LegalStatusBadge,
} from "@/modules/legal/components";
import { toast } from "sonner";

export default function LegalDashboard() {
  const [dateRange, setDateRange] = useState("ytd");
  const [counsel, setCounsel] = useState("all");
  const kpis = legalDashboardKpis;

  const nonCompliant = mockComplianceItems.filter((c) => c.status === "non_compliant" || c.status === "partial");

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Legal Dashboard"
        description="Department overview — cases, compliance, agreements, and risk indicators"
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Dashboard" }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => toast.success("Legal summary export started (demo)")}
          >
            Export summary
          </Button>
        }
      />

      <LegalFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        counsel={counsel}
        onCounselChange={setCounsel}
        counselList={legalCounsel}
        onExport={() => toast.success("Export started (demo)")}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview KPIs</p>
        <PortalKpiGrid
          columns={4}
          count={6}
          items={[
            {
              title: "Active employee cases",
              value: String(kpis.activeCases),
              hint: `↑ ${kpis.trends.activeCases}% vs prior period`,
              icon: Briefcase,
              accent: "blue",
              href: "/legal/cases",
              delay: 0,
            },
            {
              title: "NDA alerts",
              value: String(kpis.ndaAlerts),
              hint: `↑ ${kpis.trends.ndaAlerts}% expiring or expired`,
              icon: FileWarning,
              accent: "amber",
              alert: true,
              href: "/legal/nda",
              delay: 1,
            },
            {
              title: "Open court cases",
              value: String(kpis.courtCases),
              hint: `${kpis.trends.courtCases}% vs last quarter`,
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
              hint: `↑ ${kpis.trends.expensesYtd}% vs prior year`,
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
          <ChartPanel title="Cases by status" description="Employee legal matters" icon={Briefcase} accent="blue" viewAllHref="/legal/cases">
            <div className="space-y-3 py-2">
              {casesByStatus.map((row) => (
                <div key={row.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{row.name}</span>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </div>
                  <Progress value={(row.count / 7) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel title="Risk distribution" description="Across all legal matters" icon={AlertTriangle} accent="amber">
            <div className="space-y-3 py-2">
              {riskDistribution.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                  <LegalRiskBadge level={row.name.toLowerCase() as "low" | "medium" | "high"} />
                  <span className="text-xs font-semibold tabular-nums">{row.count} items</span>
                </div>
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel title="Compliance gaps" description="Partial or non-compliant" icon={ShieldCheck} accent="rose" viewAllHref="/legal/compliance">
            <div className="space-y-2">
              {nonCompliant.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{item.requirement}</p>
                    <p className="text-[10px] text-muted-foreground">{item.framework}</p>
                  </div>
                  <LegalStatusBadge variant="compliance" value={item.status} />
                </div>
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel title="NDA expiry alerts" icon={FileWarning} accent="amber" viewAllHref="/legal/nda">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Party</TableHead>
                <TableHead className="text-xs">Expires</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ndaExpiryAlerts.slice(0, 5).map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="text-xs font-medium">{n.partyName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(n.expiresAt), "MMM d, yyyy")}</TableCell>
                  <TableCell><LegalRiskBadge level={n.risk} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartPanel>

        <ChartPanel title="Agreement renewals" icon={Scale} accent="violet" viewAllHref="/legal/agreements">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Agreement</TableHead>
                <TableHead className="text-xs">Renewal</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreementRenewalReminders.slice(0, 5).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <p className="text-xs font-medium truncate max-w-[180px]">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">{a.counterparty}</p>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(a.renewalDate), "MMM d, yyyy")}</TableCell>
                  <TableCell><LegalStatusBadge variant="agreement" value={a.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartPanel>
      </div>

      <ChartPanel title="Upcoming hearings & deadlines" icon={Gavel} accent="blue">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Reference</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Risk</TableHead>
              <TableHead className="text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcomingHearings.slice(0, 6).map((h) => (
              <TableRow key={`${h.type}-${h.id}`}>
                <TableCell className="text-xs">{h.type}</TableCell>
                <TableCell>
                  <p className="text-xs font-medium">{h.title}</p>
                  <p className="text-[10px] text-muted-foreground">{h.subtitle}</p>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(h.date), "MMM d, h:mm a")}</TableCell>
                <TableCell><LegalRiskBadge level={h.risk} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={h.href}>
                      Open <ArrowRight className="h-3 w-3 ml-1 inline" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartPanel>
    </PortalPageShell>
  );
}
