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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSalesTeam, useSalesTeamMember, useMyBdeTarget } from "@/api/sales";
import { formatCompactCurrency, formatCurrency, LEAD_STATUS_LABELS } from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { SalesPageHeader, SalesStatusBadge } from "@/modules/sales/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "blue" | "green" | "amber" | "violet" | "red";
  sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-500/10",
    green: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    violet: "text-violet-600 bg-violet-500/10",
    red: "text-red-600 bg-red-500/10",
  };
  const colorClass = colors[accent ?? "blue"];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
            {sub ? <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p> : null}
          </div>
          <div className={cn("rounded-lg p-2 shrink-0", colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
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

function MonthlyTargetCard({
  target,
  revenue,
  dealsClosed,
  leadCount,
}: {
  target: { month: number; year: number; revenueTarget: number | null; dealsTarget: number | null; leadsTarget: number | null; notes: string | null };
  revenue: number;
  dealsClosed: number;
  leadCount: number;
}) {
  const monthName = MONTH_NAMES[target.month - 1];
  const daysLeft = getDaysLeft();
  const trackedCount = [target.revenueTarget, target.dealsTarget, target.leadsTarget].filter(Boolean).length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {monthName} {target.year} Target
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
          </Badge>
        </div>
        {target.notes ? (
          <p className="text-[10px] text-muted-foreground italic">{target.notes}</p>
        ) : null}
      </CardHeader>
      <CardContent className={cn("grid gap-4", trackedCount > 1 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
        {target.revenueTarget != null ? (
          <TargetMetric
            label="Revenue"
            current={revenue}
            target={target.revenueTarget}
            format={formatCompactCurrency}
            accent="[&>div]:bg-emerald-500"
          />
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
      </CardContent>
    </Card>
  );
}

export default function BdeDashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [activityTab, setActivityTab] = useState("leads");

  const { data: myData, isLoading: myLoading } = useSalesTeamMember(userId, !!userId);
  const { data: teamData, isLoading: teamLoading } = useSalesTeam({ limit: 100, leaderboard: true });
  const { data: targetData } = useMyBdeTarget();

  const stats = myData?.stats;
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

  const recentLeads = myData?.recentLeads ?? [];
  const recentProposals = myData?.recentProposals ?? [];
  const followUps = myData?.followUps ?? [];
  const leadsByStatus = (myData?.leadsByStatus ?? []).filter((r) => r.count > 0);
  const proposalsByStatus = (myData?.proposalsByStatus ?? []).filter((r) => r.count > 0);

  const upcomingFollowUps = useMemo(
    () =>
      [...followUps]
        .filter((f) => f.status === "scheduled" || f.status === "overdue")
        .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime()),
    [followUps],
  );

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

      {/* ── Monthly Target Progress ── */}
      {targetData?.target && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}>
          <MonthlyTargetCard
            target={targetData.target}
            revenue={myRevenue}
            dealsClosed={stats?.dealsClosed ?? 0}
            leadCount={stats?.leadCount ?? 0}
          />
        </motion.div>
      )}

      {/* ── Personal KPIs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {myLoading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
          : (
            <>
              <StatCard label="Revenue" value={formatCompactCurrency(myRevenue)} icon={Trophy} accent="green" sub="Total collected" />
              <StatCard label="Deals closed" value={stats?.dealsClosed ?? 0} icon={Star} accent="blue" sub="Approved proposals" />
              <StatCard label="Leads" value={stats?.leadCount ?? 0} icon={Users} accent="violet" sub="Total assigned" />
              <StatCard label="Proposals" value={stats?.proposalCount ?? 0} icon={Briefcase} accent="amber" sub="All statuses" />
              <StatCard label="Follow-ups due" value={upcomingFollowUps.length} icon={CalendarClock} accent={upcomingFollowUps.some(f => f.status === "overdue") ? "red" : "amber"} sub={upcomingFollowUps.some(f => f.status === "overdue") ? "Some overdue!" : "Scheduled"} />
            </>
          )}
      </motion.div>

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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs w-10">Rank</TableHead>
                      <TableHead className="text-xs">Executive</TableHead>
                      <TableHead className="text-xs text-right">Revenue</TableHead>
                      <TableHead className="text-xs text-right">Deals</TableHead>
                      <TableHead className="text-xs text-right hidden sm:table-cell">Follow-ups</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedTeam.map((m, i) => {
                      const rank = i + 1;
                      const isMe = m.id === userId;
                      const pct = topRevenue > 0 ? Math.round((m.revenue / topRevenue) * 100) : 0;
                      return (
                        <TableRow
                          key={m.id}
                          className={cn(
                            isMe && "bg-primary/5 border-l-2 border-l-primary font-medium",
                          )}
                        >
                          <TableCell className="text-center">
                            <RankMedal rank={rank} />
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">
                            {formatCompactCurrency(m.revenue)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {m.dealsClosed}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums hidden sm:table-cell">
                            <span className={cn(m.pendingFollowUps > 0 && "text-amber-600 font-medium")}>
                              {m.pendingFollowUps}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell w-28">
                            <div className="flex items-center gap-1.5">
                              <Progress
                                value={pct}
                                className={cn("h-1.5 flex-1", isMe && "accent-primary")}
                              />
                              <span className="text-[10px] text-muted-foreground w-7 shrink-0">
                                {pct}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: My progress + Pipeline breakdown */}
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
                  <span className="text-xs text-muted-foreground">My revenue</span>
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

          {/* Lead pipeline */}
          {leadsByStatus.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">My lead pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leadsByStatus.slice(0, 6).map((row) => (
                  <div key={row.status} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">
                      {LEAD_STATUS_LABELS[row.status as keyof typeof LEAD_STATUS_LABELS] ?? row.status}
                    </span>
                    <Badge variant="secondary" className="text-[10px] tabular-nums min-w-[28px] justify-center">
                      {row.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
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
                <TabsList className="h-8">
                  <TabsTrigger value="leads" className="text-xs h-7">
                    Recent leads ({recentLeads.length})
                  </TabsTrigger>
                  <TabsTrigger value="proposals" className="text-xs h-7">
                    Proposals ({recentProposals.length})
                  </TabsTrigger>
                  <TabsTrigger value="followups" className="text-xs h-7">
                    Follow-ups ({upcomingFollowUps.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="leads" className="mt-0">
                {myLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
                  </div>
                ) : recentLeads.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-8">No leads assigned yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Lead</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Expected value</TableHead>
                        <TableHead className="text-xs">Created</TableHead>
                        <TableHead className="text-xs text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="text-xs">
                            <p className="font-medium">{lead.name}</p>
                            {lead.company ? <p className="text-[10px] text-muted-foreground">{lead.company}</p> : null}
                          </TableCell>
                          <TableCell>
                            <SalesStatusBadge variant="lead" value={lead.status} />
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {lead.expectedValue > 0 ? formatCompactCurrency(lead.expectedValue) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatSalesDateTime(lead.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                              <Link href={`/sales/leads/${lead.id}`}>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Created</TableHead>
                        <TableHead className="text-xs text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentProposals.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium max-w-[160px]">
                            <div className="truncate">{p.title}</div>
                          </TableCell>
                          <TableCell>
                            <SalesStatusBadge variant="proposal" value={p.status} />
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">
                            {formatCompactCurrency(p.totalAmount ?? 0)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatSalesDateTime(p.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                              <Link href={`/sales/proposals/${p.id}`}>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Lead</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Scheduled</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingFollowUps.map((fu) => {
                        const scheduled = fu.scheduledAt ? new Date(fu.scheduledAt) : null;
                        const isOverdue = fu.status === "overdue" || (scheduled && isPast(scheduled) && !isToday(scheduled));
                        return (
                          <TableRow key={fu.id} className={cn(isOverdue && "bg-destructive/5")}>
                            <TableCell className="text-xs font-medium">Lead #{fu.leadId}</TableCell>
                            <TableCell className="text-xs capitalize">{fu.type}</TableCell>
                            <TableCell className="text-xs">
                              {scheduled ? (
                                <span className={cn(isOverdue && "text-destructive font-medium")}>
                                  {isToday(scheduled) ? "Today" : format(scheduled, "MMM d")}
                                  {" · "}
                                  {format(scheduled, "h:mm a")}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={isOverdue ? "destructive" : "secondary"}
                                className="text-[10px] capitalize"
                              >
                                {fu.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                <Link href={`/sales/leads/${fu.leadId}`}>
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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

      {/* ── Proposal pipeline breakdown ── */}
      {proposalsByStatus.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">My proposal pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {proposalsByStatus.map((row) => (
                  <div key={row.status} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <SalesStatusBadge variant="proposal" value={row.status} />
                    <span className="text-sm font-bold tabular-nums">{row.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </PortalPageShell>
  );
}
