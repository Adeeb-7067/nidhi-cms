import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Users, Phone } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { salesExecutives } from "@/modules/sales/mock-data";
import { formatCompactCurrency } from "@/modules/sales/constants";
import { SalesPageHeader, ExecutiveAvatar } from "@/modules/sales/components";

export default function Team() {
  const sorted = useMemo(
    () => [...salesExecutives].sort((a, b) => b.revenue - a.revenue),
    [],
  );

  const totals = useMemo(() => {
    const revenue = salesExecutives.reduce((s, e) => s + e.revenue, 0);
    const deals = salesExecutives.reduce((s, e) => s + e.dealsClosed, 0);
    const followUps = salesExecutives.reduce((s, e) => s + e.pendingFollowUps, 0);
    return { revenue, deals, followUps, count: salesExecutives.length };
  }, []);

  const maxRevenue = sorted[0]?.revenue ?? 1;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Sales team"
        description="Performance leaderboard and executive targets."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Team" },
        ]}
      />

      <PortalKpiGrid
        columns={3}
        count={3}
        items={[
          { title: "Team size", value: totals.count, icon: Users, accent: "blue", delay: 0 },
          { title: "Total revenue", value: formatCompactCurrency(totals.revenue), icon: Trophy, accent: "green", delay: 1 },
          { title: "Deals closed", value: totals.deals, icon: Target, accent: "violet", delay: 2 },
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
            {sorted.map((exec, i) => {
              const pct = Math.round((exec.revenue / exec.target) * 100);
              return (
                <motion.div
                  key={exec.id}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
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
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <ExecutiveAvatar name={exec.name} />
                      <span className="text-xs font-semibold tabular-nums">
                        {formatCompactCurrency(exec.revenue)}
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">
                      {pct}% of {formatCompactCurrency(exec.target)} target · {exec.dealsClosed}{" "}
                      deals
                    </p>
                  </div>
                </motion.div>
              );
            })}
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
                    {Math.round((exec.revenue / maxRevenue) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(exec.revenue / maxRevenue) * 100}%` }}
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
          <CardTitle className="text-sm">Team roster</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Executive</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs text-right">Deals</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">Target</TableHead>
                  <TableHead className="text-xs text-right">Follow-ups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesExecutives.map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell>
                      <ExecutiveAvatar name={exec.name} />
                      <p className="text-[10px] text-muted-foreground pl-9">{exec.email}</p>
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {exec.role.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {exec.dealsClosed}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">
                      {formatCompactCurrency(exec.revenue)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground tabular-nums">
                      {formatCompactCurrency(exec.target)}
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
    </PortalPageShell>
  );
}
