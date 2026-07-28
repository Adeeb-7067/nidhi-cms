import { useMemo } from "react";
import { Link } from "wouter";
import {
  Users,
  IndianRupee,
  CheckCircle2,
  Wallet,
  Receipt,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  FinanceErrorState,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListFreelancerEngagements } from "@/api/finance";
import { getProjectDetailHref } from "@/lib/project-routes";
import { FreelancerNavTabs } from "@/components/freelancers/FreelancerNavTabs";

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  unpaid: { label: "Unpaid", class: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  partially_paid: { label: "Partial", class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  paid: { label: "Paid", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

const CHART_COLORS = {
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  blue: "#3b82f6",
};

export default function FreelancerDashboardPage() {
  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();
  const engagements = data?.engagements ?? [];

  const kpis = useMemo(() => {
    const agreed = engagements.reduce((s, e) => s + e.agreedAmount, 0);
    const paid = engagements.reduce((s, e) => s + e.paidAmount, 0);
    const remaining = engagements.reduce((s, e) => s + e.remainingAmount, 0);
    const uniqueFreelancers = new Set(engagements.map((e) => e.userId)).size;
    const percentPaid = agreed > 0 ? Math.round((paid / agreed) * 100) : 0;
    return {
      count: engagements.length,
      uniqueFreelancers,
      agreed,
      paid,
      remaining,
      percentPaid,
    };
  }, [engagements]);

  const feeComparisonChartData = useMemo(() => {
    const map = new Map<string, { name: string; agreed: number; paid: number }>();
    for (const e of engagements) {
      const name = e.freelancerName ?? `User #${e.userId}`;
      const prev = map.get(name) ?? { name, agreed: 0, paid: 0 };
      prev.agreed += e.agreedAmount;
      prev.paid += e.paidAmount;
      map.set(name, prev);
    }
    return Array.from(map.values()).slice(0, 6);
  }, [engagements]);

  const statusDistributionData = useMemo(() => {
    const paidCount = engagements.filter((e) => e.paymentStatus === "paid").length;
    const partialCount = engagements.filter((e) => e.paymentStatus === "partially_paid").length;
    const unpaidCount = engagements.filter((e) => e.paymentStatus === "unpaid").length;
    return [
      { name: "Paid", value: paidCount, color: CHART_COLORS.emerald },
      { name: "Partial", value: partialCount, color: CHART_COLORS.amber },
      { name: "Unpaid", value: unpaidCount, color: CHART_COLORS.rose },
    ].filter((item) => item.value > 0);
  }, [engagements]);

  if (isLoading) return <FinanceListPageSkeleton />;
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Freelancers"
        description="Talent allocation, project fees, and payout status."
        breadcrumbs={[{ label: "Freelancers", href: "/freelancers" }, { label: "Dashboard" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/freelancers/payments">
              <Wallet className="h-3.5 w-3.5" />
              Manage payments
            </Link>
          </Button>
        }
      />

      <FreelancerNavTabs activeTab="dashboard" />

      <PortalKpiGrid
        items={[
          {
            title: "Working freelancers",
            value: String(kpis.uniqueFreelancers),
            hint: `${kpis.count} active contracts`,
            icon: Users,
            accent: "blue",
            href: "/freelancers/directory",
            delay: 0,
          },
          {
            title: "Agreed total",
            value: formatCurrency(kpis.agreed),
            hint: "Contract allocation",
            icon: IndianRupee,
            accent: "violet",
            href: "/freelancers/payments",
            delay: 1,
          },
          {
            title: "Paid out",
            value: formatCurrency(kpis.paid),
            hint: `${kpis.percentPaid}% of agreed`,
            icon: CheckCircle2,
            accent: "green",
            href: "/freelancers/receipts",
            delay: 2,
          },
          {
            title: "Outstanding",
            value: formatCurrency(kpis.remaining),
            hint: "Pending payouts",
            icon: Wallet,
            accent: "amber",
            href: "/freelancers/payments",
            alert: kpis.remaining > 0,
            delay: 3,
          },
        ]}
      />

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-muted-foreground">Disbursement progress</span>
          <span className="font-medium tabular-nums">{kpis.percentPaid}% paid</span>
        </div>
        <Progress value={kpis.percentPaid} className="h-2" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel
            title="Agreed vs paid"
            description="Fee allocation compared to disbursed payouts"
            icon={BarChart3}
            accent="blue"
            viewAllHref="/freelancers/payments"
          >
            {feeComparisonChartData.length === 0 ? (
              <FinanceEmptyState
                title="No contract data"
                description="Assign freelancers to projects to see fee analytics."
              />
            ) : (
              <div className="h-[240px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={feeComparisonChartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(val) => `₹${val}`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="agreed" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paid" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel
            title="Payment status"
            description="Contracts by payout state"
            icon={PieChartIcon}
            accent="violet"
          >
            {statusDistributionData.length === 0 ? (
              <FinanceEmptyState title="No status data" description="No engagements yet." />
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {statusDistributionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>
        </ChartGridCell>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel
            title="Recent engagements"
            description="Latest project fee contracts"
            icon={Users}
            accent="emerald"
            viewAllHref="/freelancers/directory"
          >
            {engagements.length === 0 ? (
              <FinanceEmptyState
                title="No freelancer engagements"
                description="Assign freelancers to projects to track fees and payouts."
              />
            ) : (
              <div className="space-y-2">
                {engagements.slice(0, 5).map((e) => {
                  const pct =
                    e.agreedAmount > 0
                      ? Math.round((e.paidAmount / e.agreedAmount) * 100)
                      : 0;
                  const statusCfg = PAYMENT_STATUS_CONFIG[e.paymentStatus] ?? {
                    label: e.paymentStatus,
                    class: "bg-muted text-muted-foreground",
                  };
                  return (
                    <div
                      key={e.id}
                      className="flex flex-col gap-3 rounded-lg border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(e.freelancerName ?? "F").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold leading-none">
                            {e.freelancerName ?? `User #${e.userId}`}
                          </p>
                          <Link
                            href={getProjectDetailHref(
                              e.projectId,
                              undefined,
                              e.projectType,
                            )}
                            className="mt-1 block truncate text-[11px] text-muted-foreground hover:text-primary"
                          >
                            {e.projectName ?? `Project #${e.projectId}`}
                          </Link>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-xs">
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(e.agreedAmount)}
                          </p>
                          <p className="text-[10px] font-medium text-emerald-600 tabular-nums">
                            {formatCurrency(e.paidAmount)} paid
                          </p>
                        </div>
                        <div className="hidden w-20 md:block">
                          <Progress value={pct} className="h-1.5" />
                          <span className="mt-0.5 block text-right text-[9px] text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-medium ${statusCfg.class}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4}>
          <ChartPanel title="Quick actions" icon={Receipt} accent="amber">
            <div className="space-y-2 py-1">
              <Button variant="outline" size="sm" className="h-8 w-full justify-start text-xs" asChild>
                <Link href="/freelancers/directory">All freelancers</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-full justify-start text-xs" asChild>
                <Link href="/freelancers/payments">Payments & contracts</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-full justify-start text-xs" asChild>
                <Link href="/freelancers/receipts">Payment receipts</Link>
              </Button>
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>
    </PortalPageShell>
  );
}
