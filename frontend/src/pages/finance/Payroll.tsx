import { Link } from "wouter";
import { Users, IndianRupee, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/modules/finance/constants";
import { FinancePageHeader, FinanceErrorState } from "@/modules/finance/components";
import { PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { PageHeroSkeleton, PageTableSkeleton } from "@/components/loading";
import { useHrmPayrollOrgOverview, useHrmPayrollRuns, useAdminPayslips } from "@/api/hrm";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const RUN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  finalized: "Finalized",
  paid: "Paid",
};

const RUN_STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  reviewed: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  finalized: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  paid: "bg-green-500/10 text-green-700 border-green-500/25",
};

export default function PayrollPage() {
  const overview = useHrmPayrollOrgOverview();
  const runs = useHrmPayrollRuns();
  const payslips = useAdminPayslips({ allPeriods: false });

  const isLoading = overview.isLoading || runs.isLoading;
  const isError = overview.isError || runs.isError;

  if (isLoading) {
    return (
      <PortalPageShell>
        <PageHeroSkeleton />
        <PageKpiSkeleton count={4} columns={4} />
        <div className="grid gap-4 lg:grid-cols-2">
          <PageTableSkeleton rows={5} columns={2} />
          <PageTableSkeleton rows={5} columns={3} />
        </div>
      </PortalPageShell>
    );
  }
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => { overview.refetch(); runs.refetch(); }} />
      </PortalPageShell>
    );
  }

  const org = overview.data;
  const recentRuns = [...(runs.data?.runs ?? [])]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, 6);
  const recentSlips = (payslips.data?.slips ?? []).slice(0, 8);
  const payrollRunColumns: CmsColumn<(typeof recentRuns)[number]>[] = [
    { id: "period", header: "Period", cell: (run) => <span className="font-medium">{MONTH_NAMES[run.month]} {run.year}</span> },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (run) => <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${RUN_STATUS_STYLES[run.status] ?? "bg-secondary text-secondary-foreground"}`}>{RUN_STATUS_LABELS[run.status] ?? run.status}</span>,
    },
  ];
  const salarySlipColumns: CmsColumn<(typeof recentSlips)[number]>[] = [
    { id: "employee", header: "Employee", cell: (slip) => <span className="font-medium">{slip.employeeName}</span> },
    { id: "period", header: "Period", cell: (slip) => <span className="text-muted-foreground">{MONTH_NAMES[slip.month]} {slip.year}</span> },
    { id: "net", header: "Net", align: "right", cell: (slip) => <span className="tabular-nums text-emerald-700">{formatCurrency(slip.net ?? 0)}</span> },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Payroll"
        description="Read-only view of company payroll cost — payroll is processed and paid from HRM."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Payroll" }]}
        actions={
          <Button asChild size="sm" className="h-8 gap-1.5">
            <Link href="/hrm/payroll">Open HRM payroll <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Active employees", value: org?.totalActive ?? 0, icon: Users, accent: "blue", delay: 0 },
          { title: "Monthly commitment (net)", value: formatCurrency(org?.monthlyCommitmentNet ?? 0), icon: IndianRupee, accent: "green", delay: 1 },
          { title: "Avg. net salary", value: formatCurrency(org?.avgNetSalary ?? 0), icon: IndianRupee, accent: "violet", delay: 2 },
          { title: "Not yet configured", value: org?.notConfiguredCount ?? 0, icon: Users, accent: "amber", alert: (org?.notConfiguredCount ?? 0) > 0, delay: 3 },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent payroll runs</CardTitle></CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No payroll runs yet.</p>
            ) : <CmsDataTable columns={payrollRunColumns} rows={recentRuns} rowKey={(run) => run.id} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent salary slips</CardTitle></CardHeader>
          <CardContent>
            {recentSlips.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No salary slips yet.</p>
            ) : <CmsDataTable columns={salarySlipColumns} rows={recentSlips} rowKey={(slip) => slip.id} />}
          </CardContent>
        </Card>
      </div>
    </PortalPageShell>
  );
}
