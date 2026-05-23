import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { LucideIcon, TrendingUp, Bug, Layers, Building2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const PIPELINE_COLORS = [
  { fill: "#3b82f6", soft: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { fill: "#8b5cf6", soft: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { fill: "#f59e0b", soft: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { fill: "#94a3b8", soft: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
  { fill: "#22c55e", soft: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { fill: "#06b6d4", soft: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
];

type ChartPanelProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: "blue" | "violet" | "amber" | "emerald" | "rose";
  badge?: string | number;
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
};

const accentHeader = {
  blue: "from-blue-500/10 via-transparent to-transparent border-blue-500/20",
  violet: "from-violet-500/10 via-transparent to-transparent border-violet-500/20",
  amber: "from-amber-500/10 via-transparent to-transparent border-amber-500/20",
  emerald: "from-emerald-500/10 via-transparent to-transparent border-emerald-500/20",
  rose: "from-rose-500/10 via-transparent to-transparent border-rose-500/20",
};

const accentIcon = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/25",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-violet-500/25",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/25",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/25",
};

/** Grid cell wrapper — stretch panel to fill column/row with no gaps. */
export function ChartGridCell({
  children,
  colSpan = 12,
  className,
}: {
  children: React.ReactNode;
  colSpan?: 3 | 4 | 5 | 8 | 12;
  className?: string;
}) {
  const colClass = {
    3: "lg:col-span-3",
    4: "lg:col-span-4",
    5: "lg:col-span-5",
    8: "lg:col-span-8",
    12: "lg:col-span-12",
  }[colSpan];

  return (
    <div className={cn("flex min-h-0 flex-col h-full", colClass, className)}>{children}</div>
  );
}

export function ChartPanel({
  title,
  description,
  icon: Icon,
  accent = "blue",
  badge,
  viewAllHref,
  children,
  className,
  headerExtra,
}: ChartPanelProps) {
  return (
    <Card
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-border/50 shadow-sm",
        "bg-gradient-to-br",
        accentHeader[accent],
        className,
      )}
    >
      <CardHeader className="shrink-0 pb-2.5 pt-3 px-3 border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                accentIcon[accent],
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
              {description && (
                <CardDescription className="text-[11px] mt-0.5 leading-relaxed">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {headerExtra}
            {badge !== undefined && (
              <Badge variant="secondary" className="text-[10px] font-bold tabular-nums">
                {badge}
              </Badge>
            )}
            {viewAllHref && (
              <Link href={viewAllHref} className="text-[11px] font-medium text-primary hover:underline">
                View all
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-3">{children}</CardContent>
    </Card>
  );
}

export function ChartEmptyState({ message, icon: Icon = TrendingUp }: { message: string; icon?: LucideIcon }) {
  return (
    <div className="flex min-h-[120px] flex-1 flex-col items-center justify-center py-6 px-4 text-center rounded-lg border border-dashed border-border/60 bg-muted/20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-[220px]">{message}</p>
    </div>
  );
}

function DashboardTooltip({
  active,
  payload,
  label,
  valueLabel = "Count",
}: TooltipProps<number, string> & { valueLabel?: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border/80 bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm font-bold tabular-nums text-foreground">
        {valueLabel}: <span className="text-primary">{value}</span>
      </p>
    </div>
  );
}

type TrendPoint = { month: string; count: number };

export function DashboardTrendChart({
  data,
  stroke,
  gradientId,
  summaryLabel,
}: {
  data: TrendPoint[];
  stroke: string;
  gradientId: string;
  summaryLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const peak = data.reduce((max, d) => (d.count > max.count ? d : max), data[0]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-end gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {summaryLabel ?? "Period total"}
          </p>
          <p className="text-xl font-bold tabular-nums tracking-tight">{total}</p>
        </div>
        {peak && (
          <div className="rounded-lg bg-muted/50 border border-border/50 px-2.5 py-1">
            <p className="text-[10px] text-muted-foreground">Peak · {peak.month}</p>
            <p className="text-sm font-semibold tabular-nums">{peak.count}</p>
          </div>
        )}
      </div>
      <div className="min-h-[140px] flex-1 rounded-lg bg-muted/15 border border-border/40 p-1.5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip content={<DashboardTooltip valueLabel="Count" />} cursor={{ stroke: stroke, strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={stroke}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: stroke, strokeWidth: 2, stroke: "hsl(var(--card))" }}
              activeDot={{ r: 5, fill: stroke, stroke: "hsl(var(--card))", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type PipelineSlice = { name: string; value: number };

export function DashboardPipelineChart({ data }: { data: PipelineSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative min-h-[120px] flex-1 max-h-[160px] rounded-lg bg-muted/15 border border-border/40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={76}
              paddingAngle={4}
              dataKey="value"
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length].fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as PipelineSlice;
                const pct = total ? Math.round((p.value / total) * 100) : 0;
                return (
                  <div className="rounded-lg border border-border/80 bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg text-sm">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.value} projects · {pct}%
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tabular-nums tracking-tight">{total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total
          </span>
        </div>
      </div>
      <div className="shrink-0 space-y-1.5 max-h-[140px] overflow-y-auto dialog-scroll pr-0.5">
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
          return (
            <div key={d.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: color.fill }}
                  />
                  {d.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{d.value}</span>
                  <span className="mx-1">·</span>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color.fill }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type SeverityRow = { name: string; value: number; color: string };

export function DashboardSeverityChart({ data }: { data: SeverityRow[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Open issues
        </p>
        <p className="text-lg font-bold tabular-nums">{total}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
        {data.map((d) => (
          <div key={d.name} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium">{d.name}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: d.color }}>
                {d.value}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/80 overflow-hidden ring-1 ring-border/30">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-90"
                style={{
                  width: `${Math.max(8, (d.value / max) * 100)}%`,
                  background: `linear-gradient(90deg, ${d.color}cc, ${d.color})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPortfolioTable({
  companies,
}: {
  companies: {
    companyId: number;
    companyName: string;
    activeProjects: number;
    totalProjects: number;
    openTickets?: number;
    delayedProjects?: number;
  }[];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2.5 pl-4 pr-2 font-semibold">Company</th>
            <th className="py-2.5 px-2 font-semibold text-center">Active</th>
            <th className="py-2.5 px-2 font-semibold text-center">Total</th>
            <th className="py-2.5 px-2 font-semibold text-center">Tickets</th>
            <th className="py-2.5 pr-4 pl-2 font-semibold text-right">Delayed</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c, i) => (
            <tr
              key={c.companyId}
              className={cn(
                "border-t border-border/40 transition-colors hover:bg-primary/5",
                i % 2 === 0 ? "bg-card" : "bg-muted/10",
              )}
            >
              <td className="py-3 pl-4 pr-2">
                <Link
                  href="/admin/clients"
                  className="font-medium hover:text-primary inline-flex items-center gap-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                    {c.companyName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate max-w-[140px] sm:max-w-none">{c.companyName}</span>
                </Link>
              </td>
              <td className="py-3 px-2 text-center">
                <Badge variant="secondary" className="tabular-nums font-semibold text-[11px]">
                  {c.activeProjects}
                </Badge>
              </td>
              <td className="py-3 px-2 text-center tabular-nums text-muted-foreground">
                {c.totalProjects}
              </td>
              <td className="py-3 px-2 text-center tabular-nums">{c.openTickets ?? 0}</td>
              <td className="py-3 pr-4 pl-2 text-right tabular-nums">
                {(c.delayedProjects ?? 0) > 0 ? (
                  <Badge variant="destructive" className="text-[10px]">
                    {c.delayedProjects}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { Building2, Layers, Bug, Activity };
