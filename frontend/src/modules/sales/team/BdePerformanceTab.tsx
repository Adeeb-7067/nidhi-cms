import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Users, Phone, CheckCircle2, AlertCircle, Clock, MinusCircle } from "lucide-react";
import { PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSalesTeam, useAllBdeTargets, type SalesTeamMember, type BdeTarget } from "@/api/sales";
import { formatCompactCurrency } from "@/modules/sales/constants";
import { SalesEmptyState, ExecutiveAvatar } from "@/modules/sales/components";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type TargetStatus = "completed" | "on_track" | "behind" | "no_target";

function getTargetStatus(pct: number, hasTarget: boolean): TargetStatus {
  if (!hasTarget) return "no_target";
  if (pct >= 100) return "completed";
  if (pct >= 50) return "on_track";
  return "behind";
}

const STATUS_CONFIG: Record<TargetStatus, { label: string; icon: React.ElementType; classes: string }> = {
  completed: { label: "Completed", icon: CheckCircle2, classes: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" },
  on_track: { label: "On track", icon: Clock, classes: "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30" },
  behind: { label: "Behind", icon: AlertCircle, classes: "text-red-500 border-red-300 bg-red-50 dark:bg-red-950/30" },
  no_target: { label: "No target", icon: MinusCircle, classes: "text-muted-foreground border-border" },
};

function StatusBadge({ status }: { status: TargetStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1 py-0.5", cfg.classes)}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  );
}

function TargetCell({
  actual,
  target,
  format,
}: {
  actual: number;
  target: number | null;
  format: (v: number) => string;
}) {
  if (target == null) return <span className="text-muted-foreground/40">—</span>;
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  return (
    <div className="space-y-1 min-w-[90px]">
      <div className="flex justify-between text-[10px]">
        <span className="font-medium tabular-nums">{format(actual)}</span>
        <span className="text-muted-foreground tabular-nums">/{format(target)}</span>
      </div>
      <Progress value={pct} className="h-1" />
      <p className="text-[10px] text-muted-foreground tabular-nums text-right">{pct}%</p>
    </div>
  );
}

export function BdePerformanceTab({
  onSelectMember,
}: {
  onSelectMember?: (member: SalesTeamMember) => void;
}) {
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState(now.getMonth() + 1);
  const [targetYear, setTargetYear] = useState(now.getFullYear());

  const { data, isLoading, isError } = useSalesTeam({ status: "active" });
  const { data: periodData } = useSalesTeam({ status: "active", month: targetMonth, year: targetYear });
  const { data: targetsData, isLoading: targetsLoading } = useAllBdeTargets(targetMonth, targetYear);

  const team = data?.team ?? [];
  const totals = data?.totals ?? { count: 0, revenue: 0, dealsClosed: 0, pendingFollowUps: 0 };

  const sorted = useMemo(
    () => [...team].sort((a, b) => b.revenue - a.revenue),
    [team],
  );

  const maxRevenue = sorted[0]?.revenue ?? 1;

  // Map userId → target for quick lookup
  const targetByUserId = useMemo(() => {
    const map = new Map<number, BdeTarget>();
    for (const t of targetsData?.targets ?? []) map.set(t.userId, t);
    return map;
  }, [targetsData?.targets]);

  // Map userId → actuals scoped to the selected target month (falls back to all-time until loaded)
  const periodStatsByUserId = useMemo(() => {
    const map = new Map<number, { revenue: number; closedProjectValue: number; dealsClosed: number; leadCount: number }>();
    for (const m of periodData?.team ?? []) map.set(m.id, m);
    return map;
  }, [periodData?.team]);

  // Summarize target statuses for the banner
  const targetSummary = useMemo(() => {
    const counts = { completed: 0, on_track: 0, behind: 0, no_target: 0 };
    for (const m of sorted) {
      const t = targetByUserId.get(m.id);
      const hasAny = t != null && (t.revenueTarget != null || t.dealsTarget != null || t.leadsTarget != null);
      if (!hasAny) { counts.no_target++; continue; }
      const actual = periodStatsByUserId.get(m.id) ?? m;
      const closedValue = actual.closedProjectValue ?? 0;
      const revPct = t.revenueTarget != null ? (closedValue / t.revenueTarget) * 100 : 100;
      const dealsPct = t.dealsTarget != null ? (actual.dealsClosed / t.dealsTarget) * 100 : 100;
      const leadsPct = t.leadsTarget != null ? (actual.leadCount / t.leadsTarget) * 100 : 100;
      const worstPct = Math.min(revPct, dealsPct, leadsPct);
      const s = getTargetStatus(worstPct, true);
      counts[s]++;
    }
    return counts;
  }, [sorted, targetByUserId, periodStatsByUserId]);

  const currentYear = now.getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  type PerformanceRow = SalesTeamMember & {
    closedValue: number;
    target: BdeTarget | undefined;
    hasAny: boolean;
    status: TargetStatus;
  };

  const performanceRows = useMemo<PerformanceRow[]>(
    () =>
      sorted.map((exec) => {
        const t = targetByUserId.get(exec.id);
        const hasAny = t != null && (t.revenueTarget != null || t.dealsTarget != null || t.leadsTarget != null);
        const actual = periodStatsByUserId.get(exec.id) ?? exec;
        const closedValue = actual.closedProjectValue ?? 0;
        let worstPct = 100;
        if (t?.revenueTarget != null) worstPct = Math.min(worstPct, t.revenueTarget > 0 ? (closedValue / t.revenueTarget) * 100 : 0);
        if (t?.dealsTarget != null) worstPct = Math.min(worstPct, t.dealsTarget > 0 ? (actual.dealsClosed / t.dealsTarget) * 100 : 0);
        if (t?.leadsTarget != null) worstPct = Math.min(worstPct, t.leadsTarget > 0 ? (actual.leadCount / t.leadsTarget) * 100 : 0);
        return {
          ...exec,
          closedValue,
          target: t,
          hasAny,
          status: getTargetStatus(worstPct, hasAny),
        };
      }),
    [sorted, targetByUserId, periodStatsByUserId],
  );

  const targetProgressColumns = useMemo<CmsColumn<PerformanceRow>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: (exec) => (
          <>
            <ExecutiveAvatar name={exec.name} />
            <p className="text-[10px] text-muted-foreground pl-9">{exec.email}</p>
          </>
        ),
      },
      {
        id: "closedValue",
        header: "Closed project value",
        cell: (exec) => (
          <TargetCell
            actual={exec.closedValue}
            target={exec.target?.revenueTarget ?? null}
            format={formatCompactCurrency}
          />
        ),
      },
      {
        id: "deals",
        header: "Deals target",
        cell: (exec) => (
          <TargetCell
            actual={exec.dealsClosed}
            target={exec.target?.dealsTarget ?? null}
            format={(v) => String(v)}
          />
        ),
      },
      {
        id: "leads",
        header: "Leads target",
        cell: (exec) => (
          <TargetCell
            actual={exec.leadCount}
            target={exec.target?.leadsTarget ?? null}
            format={(v) => String(v)}
          />
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (exec) => <StatusBadge status={exec.status} />,
      },
    ],
    [],
  );

  const summaryColumns = useMemo<CmsColumn<SalesTeamMember>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: (exec) => (
          <>
            <ExecutiveAvatar name={exec.name} />
            <p className="text-[10px] text-muted-foreground pl-9">{exec.email}</p>
          </>
        ),
      },
      {
        id: "deals",
        header: "Deals",
        align: "right",
        cell: (exec) => <span className="tabular-nums">{exec.dealsClosed}</span>,
      },
      {
        id: "revenue",
        header: "Revenue",
        align: "right",
        cell: (exec) => (
          <span className="font-medium tabular-nums">{formatCompactCurrency(exec.revenue)}</span>
        ),
      },
      {
        id: "followUps",
        header: "Follow-ups",
        align: "right",
        cell: (exec) => (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {exec.pendingFollowUps}
          </span>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return <SalesEmptyState title="Failed to load performance" description="Could not fetch BDE team metrics." />;
  }

  if (team.length === 0) {
    return (
      <SalesEmptyState
        title="No active BDE employees"
        description="Add BDE team members in the Roster tab to see performance metrics."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PortalKpiGrid
        columns={3}
        count={3}
        items={[
          { title: "Active BDEs", value: totals.count, icon: Users, accent: "blue", delay: 0 },
          { title: "Total revenue", value: formatCompactCurrency(totals.revenue), icon: Trophy, accent: "green", delay: 1 },
          { title: "Deals closed", value: totals.dealsClosed, icon: Target, accent: "violet", delay: 2 },
        ]}
      />

      {/* ── Monthly Target Progress ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Monthly target progress
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                How each BDE is tracking against their assigned targets
              </p>
            </div>
            {/* Month / Year selectors */}
            <div className="flex items-center gap-2">
              <Select value={String(targetMonth)} onValueChange={(v) => setTargetMonth(Number(v))}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(targetYear)} onValueChange={(v) => setTargetYear(Number(v))}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status summary pills */}
          {!targetsLoading && (
            <div className="flex flex-wrap gap-2 mt-2">
              {(Object.entries(targetSummary) as [TargetStatus, number][])
                .filter(([, count]) => count > 0)
                .map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status];
                  const Icon = cfg.icon;
                  return (
                    <span key={status} className={cn("inline-flex items-center gap-1 text-[10px] border rounded-full px-2 py-0.5", cfg.classes)}>
                      <Icon className="h-2.5 w-2.5" />
                      {count} {cfg.label.toLowerCase()}
                    </span>
                  );
                })}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {targetsLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
            </div>
          ) : (
            <CmsDataTable
              embedded
              columns={targetProgressColumns}
              rows={performanceRows}
              rowKey={(exec) => exec.id}
              onRowClick={onSelectMember}
              getRowClassName={(exec) =>
                cn(
                  exec.status === "completed" && "bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/40",
                  exec.status === "behind" && "bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50/40",
                )
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sorted.map((exec, i) => (
              <motion.button
                key={exec.id}
                type="button"
                className="flex w-full items-start gap-3 text-left rounded-lg p-1 -m-1 hover:bg-muted/50 transition-colors"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectMember?.(exec)}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-amber-500/20 text-amber-700"
                      : i === 1
                        ? "bg-slate-400/20 text-slate-600"
                        : i === 2
                          ? "bg-orange-600/20 text-orange-700"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <ExecutiveAvatar name={exec.name} />
                      {exec.employeeId ? (
                        <p className="text-[10px] text-muted-foreground pl-9 font-mono">{exec.employeeId}</p>
                      ) : null}
                    </div>
                    <span className="text-xs font-semibold tabular-nums shrink-0">
                      {formatCompactCurrency(exec.revenue)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-9">
                    {exec.dealsClosed} approved deal{exec.dealsClosed === 1 ? "" : "s"}
                    {exec.pendingFollowUps > 0 ? ` · ${exec.pendingFollowUps} follow-up${exec.pendingFollowUps === 1 ? "" : "s"} pending` : ""}
                  </p>
                </div>
              </motion.button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sorted.map((exec) => (
              <div key={exec.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium truncate">{exec.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {maxRevenue > 0 ? Math.round((exec.revenue / maxRevenue) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${maxRevenue > 0 ? (exec.revenue / maxRevenue) * 100 : 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CmsDataTable
            embedded
            columns={summaryColumns}
            rows={sorted}
            rowKey={(exec) => exec.id}
            onRowClick={onSelectMember}
          />
        </CardContent>
      </Card>
    </div>
  );
}
