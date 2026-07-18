import { useMemo, useState } from "react";
import { Users, Gauge, AlertTriangle, Trophy } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useMarketingPerformance } from "@/api/marketing";
import {
  MarketingPageHeader,
  MarketingEmptyState,
  MarketingFilterBar,
  DigitalProjectSelect,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { MarketingListPageSkeleton } from "@/components/loading";
import { cn } from "@/lib/utils";

export default function MarketingPerformance() {
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError } = useMarketingPerformance(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const members = data?.members ?? [];

  const kpis = useMemo(() => {
    const n = members.length;
    const avgProductivity =
      n === 0
        ? 0
        : Math.round(members.reduce((sum, m) => sum + (m.productivityPct ?? 0), 0) / n);
    const avgLate =
      n === 0
        ? 0
        : Math.round((members.reduce((sum, m) => sum + (m.lateDeliveryPct ?? 0), 0) / n) * 10) / 10;
    const top = members.reduce<(typeof members)[number] | null>((best, m) => {
      if (!best || m.tasksCompleted > best.tasksCompleted) return m;
      return best;
    }, null);
    return {
      members: n,
      avgProductivity,
      avgLate,
      topPerformer: top?.name ?? "—",
    };
  }, [members]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Team performance"
        description="Tasks completed, delivery time, client ratings, and productivity metrics"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Performance" }]}
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Team members", value: kpis.members, icon: Users, accent: "blue", delay: 0 },
          { title: "Avg productivity", value: `${kpis.avgProductivity}%`, icon: Gauge, accent: "green", delay: 1 },
          { title: "Avg late %", value: `${kpis.avgLate}%`, icon: AlertTriangle, accent: "amber", delay: 2 },
          { title: "Top performer", value: kpis.topPerformer, icon: Trophy, accent: "violet", delay: 3 },
        ]}
      />

      <MarketingFilterBar>
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs={false} />
      ) : isError ? (
        <MarketingEmptyState icon={Users} title="Could not load performance" description="Check your connection and try again." />
      ) : members.length === 0 ? (
        <MarketingEmptyState icon={Users} title="No team metrics yet" description="Assign tasks to team members to see performance." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Team member</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs text-right">Tasks done</TableHead>
                <TableHead className="text-xs text-right">Avg delivery</TableHead>
                <TableHead className="text-xs text-center">Client rating</TableHead>
                <TableHead className="text-xs">Productivity</TableHead>
                <TableHead className="text-xs text-right">Late %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs">{m.role}</TableCell>
                  <TableCell className="text-xs text-right">{m.tasksCompleted}</TableCell>
                  <TableCell className="text-xs text-right">{m.avgDeliveryDays} days</TableCell>
                  <TableCell className="text-xs text-center">
                    <span className="inline-flex items-center gap-0.5">
                      <Users className="h-3 w-3 text-amber-500" />
                      {m.clientRating.toFixed(1)}
                      {m.clientRatingIsEstimated && (
                        <span className="text-[10px] text-muted-foreground">est.</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={m.productivityPct} className="h-1.5 flex-1" />
                      <span className="text-[10px] w-8">{m.productivityPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-xs text-right font-medium",
                      m.lateDeliveryPct > 8 ? "text-red-600" : "text-muted-foreground",
                    )}
                  >
                    {m.lateDeliveryPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
