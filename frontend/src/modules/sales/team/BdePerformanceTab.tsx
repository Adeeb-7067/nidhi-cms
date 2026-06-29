import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Users, Phone } from "lucide-react";
import { PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSalesTeam, type SalesTeamMember } from "@/api/sales";
import { formatCompactCurrency } from "@/modules/sales/constants";
import { SalesEmptyState, ExecutiveAvatar } from "@/modules/sales/components";

export function BdePerformanceTab({
  onSelectMember,
}: {
  onSelectMember?: (member: SalesTeamMember) => void;
}) {
  const { data, isLoading, isError } = useSalesTeam({ status: "active" });

  const team = data?.team ?? [];
  const totals = data?.totals ?? { count: 0, revenue: 0, dealsClosed: 0, pendingFollowUps: 0 };

  const sorted = useMemo(
    () => [...team].sort((a, b) => b.revenue - a.revenue),
    [team],
  );

  const maxRevenue = sorted[0]?.revenue ?? 1;

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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs text-right">Deals</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">Follow-ups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((exec) => (
                  <TableRow
                    key={exec.id}
                    className={onSelectMember ? "cursor-pointer" : undefined}
                    onClick={() => onSelectMember?.(exec)}
                  >
                    <TableCell>
                      <ExecutiveAvatar name={exec.name} />
                      <p className="text-[10px] text-muted-foreground pl-9">{exec.email}</p>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{exec.dealsClosed}</TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">
                      {formatCompactCurrency(exec.revenue)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {exec.pendingFollowUps}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
