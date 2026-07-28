import { useMemo, useState } from "react";
import { Users, Gauge, AlertTriangle, Trophy } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
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
import { CmsDataTable, type CmsColumn } from "@/components/cms";

export default function MarketingPerformance() {
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError, refetch } = useMarketingPerformance(
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

  const columns = useMemo<CmsColumn<(typeof members)[number]>[]>(
    () => [
      { id: "member", header: "Team member", cell: (m) => <span className="font-medium">{m.name}</span> },
      { id: "role", header: "Role", cell: (m) => m.role },
      { id: "tasks", header: "Tasks done", align: "right", cell: (m) => m.tasksCompleted },
      { id: "delivery", header: "Avg delivery", align: "right", cell: (m) => `${m.avgDeliveryDays} days` },
      { id: "rating", header: "Client rating", align: "center", cell: (m) => <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3 text-amber-500" />{m.clientRating.toFixed(1)}{m.clientRatingIsEstimated && <span className="text-[10px] text-muted-foreground">est.</span>}</span> },
      { id: "productivity", header: "Productivity", cell: (m) => <div className="flex items-center gap-2 min-w-[120px]"><Progress value={m.productivityPct} className="h-1.5 flex-1" /><span className="text-[10px] w-8">{m.productivityPct}%</span></div> },
      { id: "late", header: "Late %", align: "right", cell: (m) => <span className={cn("font-medium", m.lateDeliveryPct > 8 ? "text-red-600" : "text-muted-foreground")}>{m.lateDeliveryPct}%</span> },
    ],
    [],
  );

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

      <CmsDataTable columns={columns} rows={members} rowKey={(m) => m.id} isLoading={isLoading} error={isError} onRetry={() => refetch()} empty={{ icon: Users, title: "No team metrics yet", description: "Assign tasks to team members to see performance." }} errorMessage="Check your connection and try again." />
    </PortalPageShell>
  );
}
