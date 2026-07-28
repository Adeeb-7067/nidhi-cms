import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ListChecks, Receipt, ShieldCheck, TrendingUp } from "lucide-react";
import {
  ChartPanel,
  ChartGridCell,
  ChartEmptyState,
} from "@/components/dashboard/admin-dashboard-charts";
import type { CaWorkQueueDto } from "@/api/ca";
import type { ComplianceScoreBreakdown } from "@/modules/ca/types";
import { formatCompactCurrency } from "@/modules/ca/constants";

const QUEUE_COLORS = {
  overdue: "#ef4444",
  dueSoon: "#f59e0b",
  blocked: "#8b5cf6",
  open: "#94a3b8",
};

const SCORE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e"];

type MoneySlice = {
  totalRevenue: number;
  totalExpenses: number;
  gstLiability: number;
  suspenseAmount: number;
};

export function CaAdminAnalyticsCharts({
  scoreBreakdown,
  scoreHistory,
  workQueue,
  money,
  isLoading,
}: {
  scoreBreakdown?: ComplianceScoreBreakdown | null;
  scoreHistory: Array<{ month: string; score: number }>;
  workQueue?: CaWorkQueueDto | null;
  money: MoneySlice;
  isLoading?: boolean;
}) {
  const scoreBars = useMemo(
    () => [
      { name: "GST", score: scoreBreakdown?.gst ?? 0 },
      { name: "Tax", score: scoreBreakdown?.tax ?? 0 },
      { name: "ROC", score: scoreBreakdown?.roc ?? 0 },
      { name: "Audit", score: scoreBreakdown?.audit ?? 0 },
    ],
    [scoreBreakdown],
  );

  const queueSlices = useMemo(() => {
    const c = workQueue?.counts;
    if (!c) return [];
    return [
      { name: "Overdue", value: c.overdue, fill: QUEUE_COLORS.overdue },
      { name: "Due soon", value: c.dueSoon, fill: QUEUE_COLORS.dueSoon },
      { name: "Blocked", value: c.blocked, fill: QUEUE_COLORS.blocked },
      { name: "Open", value: c.open, fill: QUEUE_COLORS.open },
    ].filter((d) => d.value > 0);
  }, [workQueue]);

  const moneyBars = useMemo(
    () => [
      { name: "Revenue", amount: money.totalRevenue },
      { name: "Expenses", amount: money.totalExpenses },
      { name: "GST due", amount: money.gstLiability },
      { name: "Suspense", amount: money.suspenseAmount },
    ],
    [money],
  );

  const trendData = useMemo(
    () => scoreHistory.map((h) => ({ month: h.month, count: h.score })),
    [scoreHistory],
  );

  return (
    <section
      className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-stretch"
      aria-label="CA analytics charts"
    >
      <ChartGridCell colSpan={8} className="min-h-[300px]">
        <ChartPanel
          title="Compliance score trend"
          description="Overall score · last snapshots"
          icon={ShieldCheck}
          accent="blue"
          viewAllHref="/ca/compliance-score"
        >
          {isLoading ? (
            <ChartEmptyState message="Loading score trend…" />
          ) : trendData.length > 0 ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caScoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Score"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    fill="url(#caScoreGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartEmptyState message="Score history will appear after the first compliance snapshot." />
          )}
        </ChartPanel>
      </ChartGridCell>

      <ChartGridCell colSpan={4} className="min-h-[300px]">
        <ChartPanel title="Work queue mix" description="By urgency" icon={ListChecks} accent="amber">
          {queueSlices.length > 0 ? (
            <div className="flex h-[220px] flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={queueSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {queueSlices.map((s) => (
                        <Cell key={s.name} fill={s.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                {queueSlices.map((s) => (
                  <span key={s.name} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                    {s.name} ({s.value})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <ChartEmptyState message="Queue is clear — nothing to chart." icon={ListChecks} />
          )}
        </ChartPanel>
      </ChartGridCell>

      <ChartGridCell colSpan={6} className="min-h-[280px]">
        <ChartPanel
          title="Score by area"
          description="GST · tax · ROC · audit"
          icon={ShieldCheck}
          accent="violet"
        >
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {scoreBars.map((_, i) => (
                    <Cell key={scoreBars[i].name} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </ChartGridCell>

      <ChartGridCell colSpan={6} className="min-h-[280px]">
        <ChartPanel
          title="Money snapshot"
          description="From Finance ledgers (read-only)"
          icon={TrendingUp}
          accent="emerald"
          viewAllHref="/finance/reports/pnl"
        >
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moneyBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={48}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                />
                <Tooltip
                  formatter={(value: number) => [formatCompactCurrency(value), "Amount"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
            <Receipt className="h-3 w-3" /> Finance remains source of truth for money / GST
          </p>
        </ChartPanel>
      </ChartGridCell>
    </section>
  );
}
