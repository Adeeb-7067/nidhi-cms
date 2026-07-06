import type { ComponentType } from "react";
import { Link } from "wouter";
import { ArrowRight, Building2, LogIn, UserCheck, UserMinus, Users, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomersSummary } from "@/api/sales";

type Accent = "violet" | "emerald" | "rose" | "sky" | "amber";

const accentStyles: Record<Accent, { icon: string; value: string; ring: string }> = {
  violet: {
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    value: "text-foreground",
    ring: "ring-violet-500/20",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/25",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    value: "text-rose-700 dark:text-rose-400",
    ring: "ring-rose-500/25",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    value: "text-sky-700 dark:text-sky-400",
    ring: "ring-sky-500/25",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/25",
  },
};

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  accent = "violet",
  highlight,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  accent?: Accent;
  highlight?: boolean;
}) {
  const styles = accentStyles[accent];
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/20 p-3 transition-colors",
        highlight && `ring-1 ${styles.ring}`,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p className={cn("mt-1 text-2xl font-bold tabular-nums leading-none", styles.value)}>
            {value.toLocaleString()}
          </p>
          {hint ? (
            <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{hint}</p>
          ) : null}
        </div>
        <div className={cn("rounded-lg p-2 shrink-0", styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <Skeleton className="h-4 w-40" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomersSummaryBar({
  loading,
  summary,
}: {
  loading?: boolean;
  summary?: CustomersSummary;
}) {
  if (loading) return <SummarySkeleton />;
  if (!summary) return null;

  const activeCustomerPct = summary.totalCustomers
    ? Math.round((summary.activeCustomers / summary.totalCustomers) * 100)
    : 0;
  const teamTotal = summary.activeContacts + summary.inactiveContacts;
  const activeTeamPct = teamTotal
    ? Math.round((summary.activeContacts / teamTotal) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border/60 bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">Portfolio snapshot</p>
          <p className="text-xs text-muted-foreground">
            Customer accounts and their portal team members
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {activeCustomerPct}% accounts active
          </span>
          {summary.contactsLoggedInToday > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
              <LogIn className="h-3 w-3" />
              {summary.contactsLoggedInToday} team login{summary.contactsLoggedInToday === 1 ? "" : "s"} today
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
        <section className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Customer accounts</p>
              <p className="text-[11px] text-muted-foreground">Companies in your sales database</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile
              icon={Users}
              label="Total"
              value={summary.totalCustomers}
              accent="violet"
              highlight
            />
            <StatTile
              icon={UserCheck}
              label="Active"
              value={summary.activeCustomers}
              hint={`${activeCustomerPct}% of total`}
              accent="emerald"
            />
            <StatTile
              icon={UserMinus}
              label="Inactive"
              value={summary.inactiveCustomers}
              accent="rose"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Active share</span>
              <span className="tabular-nums font-medium">{activeCustomerPct}%</span>
            </div>
            <Progress value={activeCustomerPct} className="h-1.5" />
          </div>
        </section>

        <section className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <UsersRound className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Client team</p>
                <p className="text-[11px] text-muted-foreground">Portal collaborators invited per company</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] shrink-0" asChild>
              <Link href="/sales/client-team">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile
              icon={UserCheck}
              label="Active"
              value={summary.activeContacts}
              hint={teamTotal ? `${activeTeamPct}% of team` : "No members yet"}
              accent="sky"
              highlight
            />
            <StatTile
              icon={UserMinus}
              label="Inactive"
              value={summary.inactiveContacts}
              accent="amber"
            />
            <StatTile
              icon={LogIn}
              label="Logged in"
              value={summary.contactsLoggedInToday}
              hint="Today"
              accent="emerald"
            />
          </div>

          {teamTotal > 0 ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Team engagement</span>
                <span className="tabular-nums font-medium">
                  {summary.contactsLoggedInToday} of {teamTotal} today
                </span>
              </div>
              <Progress
                value={teamTotal ? Math.min(100, (summary.contactsLoggedInToday / teamTotal) * 100) : 0}
                className="h-1.5"
              />
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed px-3 py-2 bg-muted/20">
              Invite client team members from a customer profile to collaborate in the portal.
            </p>
          )}
        </section>
      </div>
    </motion.div>
  );
}
