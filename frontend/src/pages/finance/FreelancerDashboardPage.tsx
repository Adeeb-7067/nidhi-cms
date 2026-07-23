import { useMemo } from "react";
import { Link } from "wouter";
import {
  Users,
  IndianRupee,
  CheckCircle2,
  Wallet,
  Briefcase,
  Receipt,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  BarChart3,
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
  AreaChart,
  Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  FinanceErrorState,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListFreelancerEngagements } from "@/api/finance";
import { getProjectDetailHref } from "@/lib/project-routes";

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  unpaid: { label: "Unpaid", class: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  partially_paid: { label: "Partial", class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  paid: { label: "Paid", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  blue: "#3b82f6",
  rose: "#f43f5e",
};

export default function FreelancerDashboardPage() {
  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();

  const engagements = data?.engagements ?? [];

  const kpis = useMemo(() => {
    const rows = engagements;
    const agreed = rows.reduce((s, e) => s + e.agreedAmount, 0);
    const paid = rows.reduce((s, e) => s + e.paidAmount, 0);
    const remaining = rows.reduce((s, e) => s + e.remainingAmount, 0);
    const uniqueFreelancers = new Set(rows.map((e) => e.userId)).size;
    const percentPaid = agreed > 0 ? Math.round((paid / agreed) * 100) : 0;
    return { count: rows.length, uniqueFreelancers, agreed, paid, remaining, percentPaid };
  }, [engagements]);

  // Chart Data 1: Top Freelancers Fee Comparison
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

  // Chart Data 2: Payment Status Donut
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
      {/* HEADER WITH SHIMMER GRADIENT */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm text-primary font-medium text-xs">
                <Sparkles className="h-3 w-3" /> Freelancer Hub Analytics
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-2">
              Freelancer Operations & Financial Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Track talent allocation, project fee fulfillment, and real-time disbursement metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2 shadow-sm" asChild>
              <Link href="/freelancers/payments">
                <Wallet className="h-3.5 w-3.5" /> Manage Contracts
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* SLEEK HIGH-DENSITY METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="group relative overflow-hidden rounded-xl border bg-card/60 p-4 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Working Talent
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight">{kpis.uniqueFreelancers}</span>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              <Zap className="h-3 w-3" /> {kpis.count} Active Contracts
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="group relative overflow-hidden rounded-xl border bg-card/60 p-4 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Agreed Budget Total
            </span>
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight">{formatCurrency(kpis.agreed)}</span>
            <span className="text-[11px] text-muted-foreground">Contract Allocation</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="group relative overflow-hidden rounded-xl border bg-card/60 p-4 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Disbursed Payouts
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">{formatCurrency(kpis.paid)}</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {kpis.percentPaid}% Paid
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="group relative overflow-hidden rounded-xl border bg-card/60 p-4 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Outstanding Payable
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-600">{formatCurrency(kpis.remaining)}</span>
            <span className="text-[11px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
              Pending
            </span>
          </div>
        </div>
      </div>

      {/* DISBURSED PAYOUT PROGRESS */}
      <div className="rounded-xl border bg-card/50 p-4 backdrop-blur-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Overall Contract Disbursement Fulfillment
          </span>
          <span className="font-bold text-emerald-600">{kpis.percentPaid}% Completed</span>
        </div>
        <Progress value={kpis.percentPaid} className="h-2 bg-muted/80" />
      </div>

      {/* ANALYTICS CHARTS GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CHART 1: AGREED VS PAID FEES BY FREELANCER (BAR CHART) */}
        <div className="rounded-xl border bg-card/70 p-5 lg:col-span-8 space-y-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Contract Value vs Paid Amount
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparison of agreed fee allocations vs disbursed payouts by freelancer
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Agreed
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Disbursed
              </span>
            </div>
          </div>

          {feeComparisonChartData.length === 0 ? (
            <FinanceEmptyState
              title="No contract data"
              description="Assign freelancers to projects to display visual analytics."
            />
          ) : (
            <div className="h-[240px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeComparisonChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => `₹${val}`} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                    formatter={(val: number) => [formatCurrency(val)]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="agreed" name="Agreed Fee" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="paid" name="Disbursed Paid" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 2: PAYMENT STATUS DONUT CHART */}
        <div className="rounded-xl border bg-card/70 p-5 lg:col-span-4 space-y-4 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-600" /> Fulfillment Breakdown
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contract status ratio
            </p>
          </div>

          {statusDistributionData.length === 0 ? (
            <FinanceEmptyState
              title="No status data"
              description="Metrics display once contracts are active."
            />
          ) : (
            <div className="h-[180px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border/50">
            {statusDistributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground font-medium">{item.name}</span>
                </span>
                <span className="font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WORKING ROSTER & QUICK LINKS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* WORKING ROSTER */}
        <div className="rounded-xl border bg-card/70 p-5 lg:col-span-8 space-y-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Active Working Talent Roster
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current active engagements and individual payout status
              </p>
            </div>
            <Button size="sm" variant="ghost" className="gap-1 text-xs text-primary" asChild>
              <Link href="/freelancers/directory">
                View All <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {engagements.length === 0 ? (
            <FinanceEmptyState
              title="No freelancer engagements"
              description="Assign freelancers to active projects to track their work and payments here."
            />
          ) : (
            <div className="space-y-2">
              {engagements.slice(0, 5).map((e) => {
                const pct = e.agreedAmount > 0 ? Math.round((e.paidAmount / e.agreedAmount) * 100) : 0;
                const statusCfg = PAYMENT_STATUS_CONFIG[e.paymentStatus] ?? {
                  label: e.paymentStatus,
                  class: "bg-muted text-muted-foreground",
                };
                return (
                  <div
                    key={e.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-muted/40 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {(e.freelancerName ?? "F").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-none">{e.freelancerName ?? `User #${e.userId}`}</p>
                        <Link href={getProjectDetailHref(e.projectId, undefined, e.projectType)} className="text-[11px] text-muted-foreground hover:text-primary truncate mt-1 block">
                          {e.projectName ?? `Project #${e.projectId}`}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(e.agreedAmount)}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">{formatCurrency(e.paidAmount)} paid</p>
                      </div>

                      <div className="w-20 hidden md:block">
                        <Progress value={pct} className="h-1.5" />
                        <span className="text-[9px] text-muted-foreground mt-0.5 block text-right">{pct}%</span>
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
        </div>

        {/* QUICK NAVIGATION ACTION CARDS */}
        <div className="rounded-xl border bg-card/70 p-5 lg:col-span-4 space-y-4 backdrop-blur-sm shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Navigation Shortcuts
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quick access to freelancer sections
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/freelancers/directory"
              className="group flex items-center justify-between p-3 rounded-lg border bg-background/60 hover:bg-primary/5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold group-hover:text-primary transition-colors">All Working Freelancers</p>
                  <p className="text-[10px] text-muted-foreground">Directory & project roster</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/freelancers/payments"
              className="group flex items-center justify-between p-3 rounded-lg border bg-background/60 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold group-hover:text-emerald-600 transition-colors">Payments & Contracts</p>
                  <p className="text-[10px] text-muted-foreground">Milestones & fee payouts</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
            </Link>

            <Link
              href="/freelancers/receipts"
              className="group flex items-center justify-between p-3 rounded-lg border bg-background/60 hover:bg-violet-500/5 hover:border-violet-500/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold group-hover:text-violet-600 transition-colors">Payment Receipts</p>
                  <p className="text-[10px] text-muted-foreground">Printable vouchers & history</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-violet-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </PortalPageShell>
  );
}
