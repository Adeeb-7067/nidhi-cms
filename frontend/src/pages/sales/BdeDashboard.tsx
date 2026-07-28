import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, isToday, isPast } from "date-fns";
import {
  Trophy,
  Target,
  Users,
  Briefcase,
  CalendarClock,
  TrendingUp,
  Star,
  Medal,
  Flame,
  ArrowRight,
  Crown,
  ShoppingBag,
  IndianRupee,
  Sparkles,
  History,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSalesTeam, useSalesTeamMember, useMyBdeTarget, useSalesRevenueTrend, type SalesOverdueCustomer } from "@/api/sales";
import { formatCompactCurrency, formatCurrency, LEAD_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { SalesPageHeader, SalesStatusBadge } from "@/modules/sales/components";
import { ChartPanel, DashboardTrendChart, DashboardPipelineChart } from "@/components/dashboard/admin-dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs font-bold text-muted-foreground tabular-nums">#{rank}</span>;
}

function RankBadgeCard({
  rank,
  total,
  name,
}: {
  rank: number;
  total: number;
  name: string;
}) {
  const isTop = rank === 1;
  const isPodium = rank <= 3;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 flex items-center gap-4",
        isTop && "border-yellow-400/50 bg-gradient-to-br from-yellow-50/80 to-amber-50/60 dark:from-yellow-950/30 dark:to-amber-950/20",
        rank === 2 && "border-slate-300/60 bg-gradient-to-br from-slate-50/80 to-zinc-50/60 dark:from-slate-950/30",
        rank === 3 && "border-amber-500/40 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20",
        !isPodium && "border-border bg-muted/10",
      )}
    >
      {/* Rank number large bg */}
      <div
        className={cn(
          "absolute right-4 top-2 text-7xl font-black leading-none select-none pointer-events-none",
          isTop ? "text-yellow-400/10" : "text-foreground/5",
        )}
      >
        {rank}
      </div>

      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-black",
          isTop && "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600",
          rank === 2 && "bg-slate-100 dark:bg-slate-800 text-slate-500",
          rank === 3 && "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
          !isPodium && "bg-muted text-muted-foreground",
        )}
      >
        {isTop ? <Crown className="h-7 w-7" /> : rank <= 3 ? <Medal className="h-7 w-7" /> : rank}
      </div>

      <div className="relative z-10">
        <p className={cn("text-xs font-semibold uppercase tracking-widest", isTop ? "text-yellow-600" : "text-muted-foreground")}>
          {isTop ? "You're #1!" : `Rank #${rank} of ${total}`}
        </p>
        <p className="text-xl font-bold mt-0.5">{name.split(" ")[0]}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isTop
            ? "Leading the team · Keep it up!"
            : `${rank - 1} ahead · ${total - rank} behind`}
        </p>
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysLeft() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return end.getDate() - now.getDate();
}

function TargetMetric({
  label,
  current,
  target,
  format,
  accent,
}: {
  label: string;
  current: number;
  target: number;
  format: (v: number) => string;
  accent: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const onTrack = pct >= 50;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">
          {format(current)} <span className="text-muted-foreground font-normal">/ {format(target)}</span>
        </span>
      </div>
      <Progress value={pct} className={cn("h-2", accent)} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{pct}% achieved</span>
        <Badge
          variant={onTrack ? "secondary" : "outline"}
          className={cn("text-[9px] py-0 px-1.5", !onTrack && "border-red-400/40 text-red-500")}
        >
          {onTrack ? "On track" : "Behind"}
        </Badge>
      </div>
    </div>
  );
}

function TargetProgressContent({
  target,
  closedProjectValue,
  moneyReceived,
  dealsClosed,
  leadCount,
}: {
  target: { month: number; year: number; revenueTarget: number | null; dealsTarget: number | null; leadsTarget: number | null; notes: string | null };
  closedProjectValue: number;
  moneyReceived: number;
  dealsClosed: number;
  leadCount: number;
}) {
  const daysLeft = getDaysLeft();
  const trackedCount = [target.revenueTarget, target.dealsTarget, target.leadsTarget].filter((v) => v != null).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left this month
        </Badge>
      </div>
      {target.notes ? (
        <p className="text-[10px] text-muted-foreground italic">{target.notes}</p>
      ) : null}
      <div className={cn("grid gap-4", trackedCount > 1 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1")}>
        {target.revenueTarget != null ? (
          <div className="space-y-2">
            <TargetMetric
              label="Closed project value"
              current={closedProjectValue}
              target={target.revenueTarget}
              format={formatCompactCurrency}
              accent="[&>div]:bg-emerald-500"
            />
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground">Money received this month</span>
              <span className="text-[11px] font-semibold tabular-nums text-foreground">
                {formatCompactCurrency(moneyReceived)}
              </span>
            </div>
          </div>
        ) : null}
        {target.dealsTarget != null ? (
          <TargetMetric
            label="Deals closed"
            current={dealsClosed}
            target={target.dealsTarget}
            format={(v) => String(v)}
            accent="[&>div]:bg-blue-500"
          />
        ) : null}
        {target.leadsTarget != null ? (
          <TargetMetric
            label="Leads"
            current={leadCount}
            target={target.leadsTarget}
            format={(v) => String(v)}
            accent="[&>div]:bg-violet-500"
          />
        ) : null}
      </div>
      {target.revenueTarget == null ? (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
          <span className="text-[10px] text-muted-foreground">Money received this month</span>
          <span className="text-[11px] font-semibold tabular-nums text-foreground">
            {formatCompactCurrency(moneyReceived)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function OverdueClientsList({ rows }: { rows: SalesOverdueCustomer[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-center text-muted-foreground py-6">No overdue balances — nice work!</p>;
  }
  return (
    <div className="space-y-2">
      {rows.slice(0, 6).map((row) => (
        <Link key={row.customerId} href={`/sales/customers/${row.customerId}`}>
          <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/40 transition-colors">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{row.companyName}</p>
              {row.contactPerson ? <p className="text-[10px] text-muted-foreground truncate">{row.contactPerson}</p> : null}
            </div>
            <span className="text-xs font-semibold text-destructive tabular-nums shrink-0">
              {formatCompactCurrency(row.overdueAmount)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function BdeDashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [activityTab, setActivityTab] = useState("leads");
  const now = new Date();

  const { data: targetData } = useMyBdeTarget();
  const { data: myData, isLoading: myLoading, isError: myError } = useSalesTeamMember(
    userId,
    !!userId,
    targetData?.target?.month ?? now.getMonth() + 1,
    targetData?.target?.year ?? now.getFullYear(),
  );
  const { data: teamData, isLoading: teamLoading } = useSalesTeam({ limit: 100, leaderboard: true });
  const { data: trendData, isLoading: trendLoading } = useSalesRevenueTrend("month");

  const stats = myData?.stats;
  const periodStats = myData?.periodStats;
  const member = myData?.member;

  const rankedTeam = useMemo(
    () => [...(teamData?.team ?? [])].sort((a, b) => b.revenue - a.revenue),
    [teamData?.team],
  );

  const myRank = useMemo(
    () => rankedTeam.findIndex((m) => m.id === userId) + 1,
    [rankedTeam, userId],
  );

  const topRevenue = rankedTeam[0]?.revenue ?? 0;
  const myRevenue = stats?.revenue ?? 0;
  const revenueProgress = topRevenue > 0 ? Math.round((myRevenue / topRevenue) * 100) : 100;
  const overdueTotal = myData?.overdueTotal ?? 0;

  const recentLeads = myData?.recentLeads ?? [];
  const recentProposals = myData?.recentProposals ?? [];
  const followUps = myData?.followUps ?? [];
  const leadsByStatus = (myData?.leadsByStatus ?? []).filter((r) => r.count > 0);
  const proposalsByStatus = (myData?.proposalsByStatus ?? []).filter((r) => r.count > 0);

  const leadPipelineData = useMemo(
    () => leadsByStatus.map((r) => ({ name: LEAD_STATUS_LABELS[r.status as keyof typeof LEAD_STATUS_LABELS] ?? r.status, value: r.count })),
    [leadsByStatus],
  );
  const proposalPipelineData = useMemo(
    () => proposalsByStatus.map((r) => ({ name: PROPOSAL_STATUS_LABELS[r.status as keyof typeof PROPOSAL_STATUS_LABELS] ?? r.status, value: r.count })),
    [proposalsByStatus],
  );

  const trendChartData = useMemo(
    () => (trendData?.trend ?? []).map((t) => ({ month: format(new Date(t.date), "MMM d"), count: t.collected })),
    [trendData?.trend],
  );

  const moneySplitData = useMemo(
    () => periodStats
      ? [
          { name: "New project money", value: periodStats.newProjectMoney },
          { name: "Old project money", value: periodStats.oldProjectMoney },
        ].filter((d) => d.value > 0)
      : [],
    [periodStats],
  );

  const upcomingFollowUps = useMemo(
    () =>
      [...followUps]
        .filter((f) => f.status === "scheduled" || f.status === "overdue")
        .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime()),
    [followUps],
  );

  const monthLabel = periodStats ? MONTH_NAMES[periodStats.month - 1] : MONTH_NAMES[now.getMonth()];


  type LeaderboardRow = (typeof rankedTeam)[number] & { rank: number; pct: number };

  const leaderboardColumns: CmsColumn<LeaderboardRow>[] = [
    {
      id: "rank",
      header: "Rank",
      headerClassName: "w-10",
      align: "center",
      cell: (m) => <RankMedal rank={m.rank} />,
    },
    {
      id: "executive",
      header: "Executive",
      cell: (m) => {
        const isMe = m.id === userId;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className={cn("text-[10px] font-bold", isMe && "bg-primary/20 text-primary")}>
                {String(m.name).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={cn("text-xs truncate", isMe && "text-primary font-semibold")}>
                {String(m.name)}{isMe ? " (You)" : ""}
              </p>
              {m.designation ? (
                <p className="text-[10px] text-muted-foreground">{m.designation}</p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: "revenue",
      header: "Revenue",
      align: "right",
      cell: (m) => <span className="tabular-nums font-medium">{formatCompactCurrency(m.revenue)}</span>,
    },
    {
      id: "deals",
      header: "Deals",
      align: "right",
      cell: (m) => <span className="tabular-nums">{m.dealsClosed}</span>,
    },
    {
      id: "followups",
      header: "Follow-ups",
      align: "right",
      headerClassName: "hidden sm:table-cell",
      className: "hidden sm:table-cell",
      cell: (m) => (
        <span className={cn("tabular-nums", m.pendingFollowUps > 0 && "text-amber-600 font-medium")}>
          {m.pendingFollowUps}
        </span>
      ),
    },
    {
      id: "progress",
      header: "Progress",
      headerClassName: "hidden sm:table-cell w-28",
      className: "hidden sm:table-cell w-28",
      cell: (m) => {
        const isMe = m.id === userId;
        return (
          <div className="flex items-center gap-1.5">
            <Progress value={m.pct} className={cn("h-1.5 flex-1", isMe && "accent-primary")} />
            <span className="text-[10px] text-muted-foreground w-7 shrink-0">{m.pct}%</span>
          </div>
        );
      },
    },
  ];

  const recentLeadColumns: CmsColumn<(typeof recentLeads)[number]>[] = [
    {
      id: "lead",
      header: "Lead",
      cell: (lead) => (
        <>
          <p className="font-medium">{lead.name}</p>
          {lead.company ? <p className="text-[10px] text-muted-foreground">{lead.company}</p> : null}
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (lead) => <SalesStatusBadge variant="lead" value={lead.status} />,
    },
    {
      id: "value",
      header: "Expected value",
      align: "right",
      cell: (lead) => (
        <span className="tabular-nums">
          {lead.expectedValue > 0 ? formatCompactCurrency(lead.expectedValue) : "—"}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (lead) => <span className="text-muted-foreground">{formatSalesDateTime(lead.createdAt)}</span>,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (lead) => (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
          <Link href={`/sales/leads/${lead.id}`}>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      ),
    },
  ];

  const recentProposalColumns: CmsColumn<(typeof recentProposals)[number]>[] = [
    {
      id: "title",
      header: "Title",
      cell: (p) => <div className="max-w-[160px] truncate font-medium">{p.title}</div>,
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (p) => <SalesStatusBadge variant="proposal" value={p.status} />,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (p) => (
        <span className="tabular-nums font-medium">{formatCompactCurrency(p.totalAmount ?? 0)}</span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (p) => <span className="text-muted-foreground">{formatSalesDateTime(p.createdAt)}</span>,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (p) => (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
          <Link href={`/sales/proposals/${p.id}`}>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      ),
    },
  ];

  const followUpColumns: CmsColumn<(typeof upcomingFollowUps)[number]>[] = [
    {
      id: "lead",
      header: "Lead",
      cell: (fu) => <span className="font-medium">{fu.leadName ?? `Lead #${fu.leadId}`}</span>,
    },
    {
      id: "type",
      header: "Type",
      cell: (fu) => <span className="capitalize">{fu.type}</span>,
    },
    {
      id: "scheduled",
      header: "Scheduled",
      cell: (fu) => {
        const scheduled = fu.scheduledAt ? new Date(fu.scheduledAt) : null;
        const isOverdue = fu.status === "overdue" || (scheduled && isPast(scheduled) && !isToday(scheduled));
        if (!scheduled) return "—";
        return (
          <span className={cn(isOverdue && "text-destructive font-medium")}>
            {isToday(scheduled) ? "Today" : format(scheduled, "MMM d")}
            {" · "}
            {format(scheduled, "h:mm a")}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (fu) => {
        const scheduled = fu.scheduledAt ? new Date(fu.scheduledAt) : null;
        const isOverdue = fu.status === "overdue" || (scheduled && isPast(scheduled) && !isToday(scheduled));
        return (
          <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px] capitalize">
            {fu.status}
          </Badge>
        );
      },
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (fu) => (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
          <Link href={`/sales/leads/${fu.leadId}`}>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={`${getGreeting()}, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Your personal performance board — compete, track, and win"
        breadcrumbs={[{ label: "Sales", href: "/sales/bde" }, { label: "My Dashboard" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/sales/leads">
                <Target className="h-3.5 w-3.5 mr-1.5" />
                My leads
              </Link>
            </Button>
            <Button size="sm" className="h-8" asChild>
              <Link href="/sales/proposals">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Proposals
              </Link>
            </Button>
          </div>
        }
      />

      {myError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mb-4">
          <p className="text-sm text-destructive">Could not load your performance data. Try refreshing the page.</p>
        </div>
      ) : null}

      {/* ── Rank Hero ── */}
      {myLoading ? (
        <Skeleton className="h-[100px] w-full rounded-2xl" />
      ) : myRank > 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <RankBadgeCard
            rank={myRank}
            total={rankedTeam.length}
            name={String(member?.name ?? user?.name ?? "")}
          />
        </motion.div>
      ) : null}

      {/* ── This month: sales & collections ── */}
      <motion.div className="space-y-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{monthLabel} at a glance</p>
        {myLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <PortalKpiGrid
            columns={4}
            count={4}
            items={[
              { title: "Total sales", value: formatCompactCurrency(periodStats?.salesValue ?? 0), hint: `${periodStats?.salesCount ?? 0} deal${periodStats?.salesCount === 1 ? "" : "s"}`, icon: ShoppingBag, accent: "blue", delay: 0 },
              { title: "Total collected", value: formatCompactCurrency(periodStats?.totalCollected ?? 0), hint: "Via invoices", icon: IndianRupee, accent: "green", delay: 1 },
              { title: "New project money", value: formatCompactCurrency(periodStats?.newProjectMoney ?? 0), hint: "From deals closed this month", icon: Sparkles, accent: "sky", delay: 2 },
              { title: "Old project money", value: formatCompactCurrency(periodStats?.oldProjectMoney ?? 0), hint: "Collected on earlier deals", icon: History, accent: "violet", delay: 3 },
            ]}
          />
        )}
      </motion.div>

      {/* ── Bento row: Target progress + New/Old split ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8 flex min-h-0 flex-col h-full">
          <ChartPanel title="Monthly target progress" description={targetData?.target ? `${monthLabel} ${targetData.target.year}` : "No target set yet"} icon={Target} accent="blue">
            {targetData?.target ? (
              <TargetProgressContent
                target={targetData.target}
                closedProjectValue={periodStats?.salesValue ?? periodStats?.closedProjectValue ?? 0}
                moneyReceived={periodStats?.totalCollected ?? 0}
                dealsClosed={periodStats?.dealsClosed ?? 0}
                leadCount={periodStats?.leadCount ?? 0}
              />
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">Your admin hasn't set a target for this month yet.</p>
            )}
          </ChartPanel>
        </div>
        <div className="lg:col-span-4 flex min-h-0 flex-col h-full">
          <ChartPanel title="New vs old money" description="Where this month's collections came from" icon={Sparkles} accent="violet">
            {moneySplitData.length > 0 ? (
              <DashboardPipelineChart data={moneySplitData} />
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">No collections recorded yet this month.</p>
            )}
          </ChartPanel>
        </div>
      </div>

      {/* ── Bento row: Collections trend + Overdue by client ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8 flex min-h-0 flex-col h-full">
          <ChartPanel title="Collections trend" description="Money collected day by day this month" icon={TrendingUp} accent="emerald">
            {trendLoading ? (
              <Skeleton className="h-[180px] w-full rounded-lg" />
            ) : trendChartData.length > 0 ? (
              <DashboardTrendChart data={trendChartData} stroke="#22c55e" gradientId="bdeCollectionsTrend" summaryLabel="Collected this month" />
            ) : (
              <p className="text-xs text-muted-foreground py-10 text-center">No collections yet this month.</p>
            )}
          </ChartPanel>
        </div>
        <div className="lg:col-span-4 flex min-h-0 flex-col h-full">
          <ChartPanel
            title="Overdue by client"
            description="Needs follow-up right now"
            icon={AlertCircle}
            accent="rose"
            badge={overdueTotal > 0 ? formatCompactCurrency(overdueTotal) : undefined}
          >
            <OverdueClientsList rows={myData?.overdueByCustomer ?? []} />
          </ChartPanel>
        </div>
      </div>

      {/* ── Main Grid: Leaderboard + Revenue Progress ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid gap-3 lg:grid-cols-12"
      >
        {/* Leaderboard */}
        <div className="lg:col-span-8">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Team Leaderboard
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {rankedTeam.length} BDEs
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Ranked by revenue collected · Your row is highlighted</p>
            </CardHeader>
            <CardContent className="p-0">
              {teamLoading ? (
                <div className="space-y-2 p-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : rankedTeam.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-8">No team data available</p>
              ) : (
                <CmsDataTable
                  embedded
                  columns={leaderboardColumns}
                  rows={rankedTeam.map((m, i) => ({
                    ...m,
                    rank: i + 1,
                    pct: topRevenue > 0 ? Math.round((m.revenue / topRevenue) * 100) : 0,
                  }))}
                  rowKey={(m) => m.id}
                  getRowClassName={(m) =>
                    m.id === userId ? "bg-primary/5 border-l-2 border-l-primary font-medium" : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: My progress */}
        <div className="lg:col-span-4 space-y-3">
          {/* Revenue vs #1 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">My revenue (all time)</span>
                  <span className="text-xs font-semibold tabular-nums">{formatCompactCurrency(myRevenue)}</span>
                </div>
                <Progress value={revenueProgress} className="h-2.5" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">₹0</span>
                  <span className="text-[10px] text-muted-foreground">Top: {formatCompactCurrency(topRevenue)}</span>
                </div>
              </div>
              {myRank > 1 && rankedTeam[myRank - 2] ? (
                <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1">
                  <p className="text-muted-foreground">To reach #{myRank - 1}</p>
                  <p className="font-semibold text-primary">
                    +{formatCurrency(rankedTeam[myRank - 2].revenue - myRevenue)} more needed
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Beat {String(rankedTeam[myRank - 2].name).split(" ")[0]}&apos;s {formatCompactCurrency(rankedTeam[myRank - 2].revenue)}
                  </p>
                </div>
              ) : myRank === 1 ? (
                <div className="rounded-lg border border-yellow-400/40 bg-yellow-50/50 dark:bg-yellow-950/20 p-3 text-xs text-center">
                  <Crown className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">You&apos;re leading the team!</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">My activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            <Tabs value={activityTab} onValueChange={setActivityTab}>
              <div className="px-4">
                <CmsChipTabs
                  value={activityTab}
                  onValueChange={setActivityTab}
                  items={[
                    { value: "leads", label: "Recent leads", count: recentLeads.length || undefined },
                    { value: "proposals", label: "Proposals", count: recentProposals.length || undefined },
                    { value: "followups", label: "Follow-ups", count: upcomingFollowUps.length || undefined },
                  ]}
                />
              </div>

              <TabsContent value="leads" className="mt-0">
                {myLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                  </div>
                ) : recentLeads.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-8">No leads assigned yet.</p>
                ) : (
                  <CmsDataTable embedded columns={recentLeadColumns} rows={recentLeads} rowKey={(lead) => lead.id} />
                )}
                <div className="px-4 py-2 border-t">
                  <Button variant="ghost" size="sm" className="h-7 text-xs w-full" asChild>
                    <Link href="/sales/leads">View all leads <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="proposals" className="mt-0">
                {myLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                  </div>
                ) : recentProposals.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-8">No proposals yet.</p>
                ) : (
                  <CmsDataTable embedded columns={recentProposalColumns} rows={recentProposals} rowKey={(p) => p.id} />
                )}
                <div className="px-4 py-2 border-t">
                  <Button variant="ghost" size="sm" className="h-7 text-xs w-full" asChild>
                    <Link href="/sales/proposals">View all proposals <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="followups" className="mt-0">
                {myLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                  </div>
                ) : upcomingFollowUps.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-8">No pending follow-ups.</p>
                ) : (
                  <CmsDataTable
                    embedded
                    columns={followUpColumns}
                    rows={upcomingFollowUps}
                    rowKey={(fu) => fu.id}
                    getRowClassName={(fu) => {
                      const scheduled = fu.scheduledAt ? new Date(fu.scheduledAt) : null;
                      const isOverdue = fu.status === "overdue" || (scheduled && isPast(scheduled) && !isToday(scheduled));
                      return isOverdue ? "bg-destructive/5" : undefined;
                    }}
                  />
                )}
                <div className="px-4 py-2 border-t">
                  <Button variant="ghost" size="sm" className="h-7 text-xs w-full" asChild>
                    <Link href="/sales/follow-ups">View all follow-ups <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Pipeline breakdown: leads + proposals ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-6 flex min-h-0 flex-col h-full">
          <ChartPanel title="My lead pipeline" description={`${leadPipelineData.reduce((s, d) => s + d.value, 0)} leads by status`} icon={Users} accent="blue">
            {leadPipelineData.length > 0 ? (
              <DashboardPipelineChart data={leadPipelineData} />
            ) : (
              <p className="text-xs text-muted-foreground py-10 text-center">No leads assigned yet.</p>
            )}
          </ChartPanel>
        </div>
        <div className="lg:col-span-6 flex min-h-0 flex-col h-full">
          <ChartPanel title="My proposal pipeline" description={`${proposalPipelineData.reduce((s, d) => s + d.value, 0)} proposals by status`} icon={Briefcase} accent="amber">
            {proposalPipelineData.length > 0 ? (
              <DashboardPipelineChart data={proposalPipelineData} />
            ) : (
              <p className="text-xs text-muted-foreground py-10 text-center">No proposals yet.</p>
            )}
          </ChartPanel>
        </div>
      </div>
    </PortalPageShell>
  );
}
