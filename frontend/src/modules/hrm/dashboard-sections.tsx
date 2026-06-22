import { Link } from "wouter";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Home, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCompactCurrency, formatCurrency } from "@/modules/finance/constants";
import type {
  HrmDashboardNeedsAttention,
  HrmDashboardOnLeavePerson,
  HrmDashboardPayrollBanner,
  HrmDashboardActivityItem,
  HrmDashboardTodayAttendanceRow,
  HrmDashboardTopEarner,
} from "./types";
import { HrmAttendanceBadge } from "./components";

export const HRM_DASHBOARD_PANEL_MIN_H = "min-h-[220px]";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function HrmEmployeeAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-8 w-8 border border-border/60", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className="text-[10px] font-semibold">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function HrmPayrollBannerCard({
  banner,
  monthLabel,
}: {
  banner: HrmDashboardPayrollBanner;
  monthLabel: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Monthly payroll · {monthLabel}</CardTitle>
          <CardDescription className="text-xs">
            {banner.employeeCount} active employees · {banner.status.replace(/_/g, " ")}
          </CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0 capitalize">{banner.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Contract pay", value: formatCompactCurrency(banner.totalGross) },
            { label: "Net to pay", value: formatCompactCurrency(banner.totalNet) },
            { label: "Yet to pay", value: formatCompactCurrency(banner.yetToPay) },
            { label: "Paid out", value: formatCompactCurrency(banner.paidOut) },
            { label: "Deductions", value: formatCompactCurrency(banner.totalDeductions) },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-0.5 truncate text-base font-bold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Payroll disbursed</span>
            <span className="font-semibold text-foreground">{banner.payrollProgressPct}%</span>
          </div>
          <Progress value={banner.payrollProgressPct} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function HrmCompactStatStrip({
  items,
}: {
  items: Array<{ title: string; value: string; icon: LucideIcon; accent?: string; href?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <div className="flex h-full min-h-[72px] w-full items-center gap-2 rounded-xl border border-border/60 bg-card px-2.5 py-2 shadow-sm">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.accent ?? "bg-primary/10 text-primary")}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] leading-tight text-muted-foreground">{item.title}</p>
              <p className="truncate text-sm font-bold tabular-nums leading-tight">{item.value}</p>
            </div>
          </div>
        );
        return item.href ? (
          <Link key={item.title} href={item.href} className="min-w-0 transition-opacity hover:opacity-90">
            {inner}
          </Link>
        ) : (
          <div key={item.title} className="min-w-0">{inner}</div>
        );
      })}
    </div>
  );
}

export function HrmPeopleMiniList({
  title,
  people,
  emptyLabel,
  emptyIcon: EmptyIcon = Users,
}: {
  title: string;
  people: HrmDashboardOnLeavePerson[];
  emptyLabel: string;
  emptyIcon?: LucideIcon;
}) {
  return (
    <div className={cn("flex h-full flex-col", HRM_DASHBOARD_PANEL_MIN_H)}>
      {title ? <p className="mb-2 text-xs font-semibold">{title}</p> : null}
      {people.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/15 px-3 py-6 text-center">
          <EmptyIcon className="mb-2 h-7 w-7 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {people.slice(0, 5).map((p) => (
            <li key={p.userId} className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/10 px-2.5 py-2">
              <HrmEmployeeAvatar name={p.userName} avatarUrl={p.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{p.userName}</p>
                <p className="truncate text-[10px] text-muted-foreground">{p.employeeId ?? "—"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HrmMiniRingStat({
  label,
  value,
  sublabel,
  pct,
  color = "#6366f1",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  pct?: number;
  color?: string;
}) {
  const ringPct = pct ?? 0;
  return (
    <div className="flex h-full min-h-[168px] flex-col items-center justify-center py-1 text-center">
      <div
        className="relative mb-1.5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${ringPct * 3.6}deg, hsl(var(--muted)) 0deg)`,
        }}
      >
        <div className="flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
          <span className="text-xs font-bold tabular-nums leading-none">{value}</span>
          {pct != null && <span className="text-[8px] text-muted-foreground">{ringPct}%</span>}
        </div>
      </div>
      <p className="text-[11px] font-medium">{label}</p>
      {sublabel && <p className="max-w-full truncate px-1 text-[10px] text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

export function HrmHorizontalBarList({
  data,
  valueSuffix = "",
}: {
  data: Array<{ name: string; value: number }>;
  valueSuffix?: string;
}) {
  if (!data.length) {
    return (
      <p className={cn("flex items-center justify-center py-6 text-xs text-muted-foreground", HRM_DASHBOARD_PANEL_MIN_H)}>
        No data yet
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3 py-1">
      {data.map((row) => (
        <div key={row.name} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{row.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {row.value}{valueSuffix}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80 transition-all"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HrmNeedsAttentionList({ items }: { items: HrmDashboardNeedsAttention[] }) {
  if (!items.length) {
    return (
      <div className="flex h-full min-h-[120px] flex-col items-center justify-center py-4 text-center">
        <p className="text-xs text-muted-foreground">All clear — nothing needs attention.</p>
      </div>
    );
  }
  const toneClass = {
    info: "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300",
    warning: "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300",
    critical: "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300",
  };
  return (
    <ul className="max-h-[168px] space-y-1.5 overflow-y-auto pr-0.5">
      {items.map((item) => (
        <li key={item.label}>
          <Link
            href={item.href}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-opacity hover:opacity-90",
              toneClass[item.tone],
            )}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HrmTodayAttendanceTable({ rows }: { rows: HrmDashboardTodayAttendanceRow[] }) {
  if (!rows.length) {
    return (
      <p className="flex min-h-[120px] items-center justify-center text-xs text-muted-foreground">
        No attendance records for today yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 text-left font-medium">Employee</th>
            <th className="pb-2 text-left font-medium">Clock in</th>
            <th className="pb-2 text-right font-medium">Hours</th>
            <th className="pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId} className="border-b border-border/40 last:border-0">
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <HrmEmployeeAvatar name={row.userName} avatarUrl={row.avatarUrl} className="h-7 w-7" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.userName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{row.employeeId ?? "—"}</p>
                  </div>
                </div>
              </td>
              <td className="py-2.5 text-muted-foreground">
                {row.clockIn ? format(new Date(row.clockIn), "h:mm a") : "—"}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {(row.activeMinutes / 60).toFixed(1)}h
              </td>
              <td className="py-2.5 text-right">
                <HrmAttendanceBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HrmTopEarnersList({ earners }: { earners: HrmDashboardTopEarner[] }) {
  if (!earners.length) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Salary structures not configured yet.</p>;
  }
  return (
    <div className="flex h-full flex-col overflow-y-auto pr-0.5">
      <ol className="space-y-2.5">
        {earners.map((e) => (
          <li key={e.userId} className="flex items-center gap-2.5">
          <span className="w-4 text-[10px] font-semibold text-muted-foreground">{e.rank}</span>
          <HrmEmployeeAvatar name={e.userName} avatarUrl={e.avatarUrl} className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{e.userName}</p>
            <p className="truncate text-[10px] text-muted-foreground">{e.designation ?? e.employeeId ?? "—"}</p>
          </div>
          <span className="text-xs font-semibold tabular-nums">{formatCurrency(e.net)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HrmRecentActivityList({ items }: { items: HrmDashboardActivityItem[] }) {
  if (!items.length) {
    return <p className="py-8 text-center text-xs text-muted-foreground">HRM activity will appear here.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2 text-xs">
          <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.action.replace(/_/g, " ")}</p>
            <p className="text-[10px] text-muted-foreground">
              {item.actorName ?? "System"} · {item.entityType}
              {item.createdAt ? ` · ${format(new Date(item.createdAt), "MMM d, h:mm a")}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HrmQuickStatsWidget({
  presentToday,
  headcount,
  pendingApprovals,
}: {
  presentToday: number;
  headcount: number;
  pendingApprovals: number;
}) {
  const now = new Date();
  const attendancePct = headcount > 0 ? Math.round((presentToday / headcount) * 100) : 0;
  return (
    <div className={cn("flex h-full flex-col", HRM_DASHBOARD_PANEL_MIN_H)}>
      <p className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
        {format(now, "h:mm a")}
      </p>
      <p className="text-xs text-muted-foreground">{format(now, "EEEE, MMM d")}</p>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <div className="rounded-lg border border-border/50 bg-background/60 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Attendance</p>
          <p className="text-base font-bold tabular-nums sm:text-lg">{attendancePct}%</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-background/60 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Pending</p>
          <p className="text-base font-bold tabular-nums sm:text-lg">{pendingApprovals}</p>
        </div>
      </div>
    </div>
  );
}
