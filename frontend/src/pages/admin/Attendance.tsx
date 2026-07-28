import { Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useListUsers } from "@/api";
import {
  useAdminWorkSessions,
  useAdminActiveAll,
  useAdminConsentList,
  useDailySessionTotals,
  type WorkSession,
  type ConsentRecord,
  type StopReason,
  type DailySessionTotal,
} from "@/api/work-sessions";
import { LiveActiveDuration } from "@/components/monitoring/LiveActiveDuration";
import { formatActiveDuration, getLiveDailyActiveMs } from "@/lib/work-session-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CmsChipTabs, CmsDataTable, CmsFilterBar, type CmsColumn } from "@/components/cms";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock, Users, ShieldCheck, Activity, MonitorOff,
  CheckCircle2, XCircle, Timer, Laptop, Smartphone, Globe,
} from "lucide-react";
import { format, formatDuration, intervalToDuration, parseISO } from "date-fns";
import { MONITORABLE_STAFF_ROLES } from "@/lib/user-roles";
import { cn } from "@/lib/utils";

// ── helpers ────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function durationLabel(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const dur = intervalToDuration({ start: 0, end: ms });
  return formatDuration(dur, { format: ["hours", "minutes"] }) || "< 1 min";
}

function parseDevice(ua: string | null | undefined): { label: string; Icon: React.ElementType } {
  if (!ua) return { label: "Unknown", Icon: Globe };
  if (ua.includes("Electron")) return { label: "Desktop App", Icon: Laptop };
  if (/iPhone|iPad/i.test(ua)) return { label: "iOS", Icon: Smartphone };
  if (/Android/i.test(ua)) return { label: "Android", Icon: Smartphone };
  if (/Windows/i.test(ua)) return { label: "Windows", Icon: Laptop };
  if (/Mac/i.test(ua)) return { label: "macOS", Icon: Laptop };
  if (/Linux/i.test(ua)) return { label: "Linux", Icon: Laptop };
  return { label: "Browser", Icon: Globe };
}

const REASON_LABELS: Record<StopReason, string> = {
  clock_out: "Clocked out",
  app_quit: "App quit",
  logout: "Logged out",
  session_expired: "24h limit",
  day_ended: "New day",
  shift_ended: "Auto clock out",
  admin_terminated: "Force ended",
  system_sleep: "PC sleep",
  system_shutdown: "PC shutdown",
  network_lost: "Network lost",
  client_disconnected: "Disconnected",
};

const REASON_CLASS: Record<StopReason, string> = {
  clock_out: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  app_quit: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  logout: "text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800",
  session_expired: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  day_ended: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800",
  shift_ended: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  admin_terminated: "text-red-700 bg-red-100 border-red-300 dark:bg-red-950/40 dark:border-red-700",
  system_sleep: "text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  system_shutdown: "text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  network_lost: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  client_disconnected: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
};

// ── EmployeeCell ──────────────────────────────────────────────────────────

function EmployeeCell({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium text-xs">{name}</span>
    </div>
  );
}

// ── Session cells ───────────────────────────────────────────────────────────

function SessionActiveTimeCell({ session }: { session: WorkSession }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Timer className="h-3 w-3 shrink-0" />
      {session.isActive ? (
        <LiveActiveDuration session={session} className="whitespace-nowrap font-medium text-foreground tabular-nums" />
      ) : (
        <span className="whitespace-nowrap tabular-nums">{durationLabel(session.durationMs)}</span>
      )}
    </div>
  );
}

function SessionReasonCell({ session }: { session: WorkSession }) {
  if (session.stopReason) {
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", REASON_CLASS[session.stopReason])}>
        {REASON_LABELS[session.stopReason]}
      </span>
    );
  }
  if (session.isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px]">
        <Activity className="h-3 w-3" /> In progress
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function DeviceCell({ userAgent }: { userAgent: string | null | undefined }) {
  const { label: deviceLabel, Icon: DeviceIcon } = parseDevice(userAgent);
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <DeviceIcon className="h-3.5 w-3.5 shrink-0" />
      <span>{deviceLabel}</span>
    </div>
  );
}

function ActiveEmployeeChip({
  session,
  userName,
  avatarUrl,
  dailyTotalMs,
}: {
  session: WorkSession;
  userName: string;
  avatarUrl?: string | null;
  dailyTotalMs?: number;
}) {
  const [liveDailyMs, setLiveDailyMs] = useState(() =>
    getLiveDailyActiveMs(dailyTotalMs ?? session.durationMs, session),
  );

  useEffect(() => {
    const tick = () =>
      setLiveDailyMs(getLiveDailyActiveMs(dailyTotalMs ?? session.durationMs, session));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dailyTotalMs, session.id, session.durationMs, session.lastHeartbeatAt, session.isActive]);

  return (
    <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
      <Avatar className="h-5 w-5 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={userName} /> : null}
        <AvatarFallback className="text-[8px] font-bold bg-emerald-500/20 text-emerald-700">
          {initials(userName)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{userName}</span>
      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums font-semibold">
        {formatActiveDuration(liveDailyMs)}
      </span>
      <span className="text-[9px] uppercase tracking-wide text-emerald-500/80">active today</span>
    </div>
  );
}

// ── Consent cells ─────────────────────────────────────────────────────────

function ConsentStatusCell({ record }: { record: ConsentRecord }) {
  const consented = !!record.consentGivenAt;
  if (consented) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">Consented</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-red-500">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">Not consented</span>
    </div>
  );
}

// ── Daily total cells ─────────────────────────────────────────────────────

function formatWorkDayLabel(dateKey: string) {
  return format(parseISO(`${dateKey}T12:00:00`), "EEE, MMM d, yyyy");
}

function DailyTotalActiveTimeCell({ row }: { row: DailySessionTotal }) {
  return (
    <div className="flex items-center gap-1 font-semibold tabular-nums">
      <Timer className="h-3 w-3 shrink-0 text-primary" />
      {durationLabel(row.totalMs)}
    </div>
  );
}

function DailyTotalStatusCell({ row }: { row: DailySessionTotal }) {
  if (row.hasActiveSession) {
    return (
      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 border">
        In progress
      </Badge>
    );
  }
  return <span className="text-muted-foreground">Completed</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────

const LIMIT = 30;
const CONSENT_LIMIT = 50;
const DAILY_LIMIT = 40;

export default function AttendancePage() {
  const [section, setSection] = useState<"sessions" | "daily" | "consents">("sessions");
  const [filterUserId, setFilterUserId] = useState<number | undefined>();
  const [sessionsPage, setSessionsPage] = useState(1);
  const [consentsPage, setConsentsPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: usersData } = useListUsers({ staff: "1", limit: 200 });
  const allUsers = usersData?.users ?? [];
  const employees = allUsers.filter((u) => MONITORABLE_STAFF_ROLES.includes(u.role as typeof MONITORABLE_STAFF_ROLES[number]));
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
  const avatarMap = Object.fromEntries(allUsers.map((u) => [u.id, u.avatarUrl ?? null]));

  const { data: activeAll, isLoading: loadingActive } = useAdminActiveAll();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const { data: todayDaily } = useDailySessionTotals(
    { fromDate: todayKey, toDate: todayKey, limit: 200 },
    { refetchInterval: 30_000 },
  );
  const todayDailyByUser = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of todayDaily?.data ?? []) {
      map.set(row.userId, row.totalMs);
    }
    return map;
  }, [todayDaily]);

  const [liveTotalActiveMs, setLiveTotalActiveMs] = useState(0);
  useEffect(() => {
    if (!activeAll?.data.length) {
      setLiveTotalActiveMs(0);
      return;
    }
    const tick = () => {
      setLiveTotalActiveMs(
        activeAll.data.reduce((sum, s) => {
          const daily = todayDailyByUser.get(s.userId);
          return sum + getLiveDailyActiveMs(daily ?? s.durationMs, s);
        }, 0),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeAll, todayDailyByUser]);
  const {
    data: sessions,
    isLoading: loadingSessions,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useAdminWorkSessions({
    userId: filterUserId,
    page: sessionsPage,
    limit: LIMIT,
  });
  const {
    data: consents,
    isLoading: loadingConsents,
    isError: consentsError,
    refetch: refetchConsents,
  } = useAdminConsentList({
    page: consentsPage,
    limit: CONSENT_LIMIT,
  });
  const {
    data: dailyTotals,
    isLoading: loadingDaily,
    isError: dailyError,
    refetch: refetchDaily,
  } = useDailySessionTotals({
    userId: filterUserId,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page: dailyPage,
    limit: DAILY_LIMIT,
  });

  const consentedCount = useMemo(
    () => consents?.data.filter((c) => c.consentGivenAt).length ?? 0,
    [consents],
  );

  const avgDurationMs = useMemo(() => {
    const list = sessions?.data.filter((s) => s.durationMs > 0) ?? [];
    if (!list.length) return 0;
    return list.reduce((sum, s) => sum + s.durationMs, 0) / list.length;
  }, [sessions]);

  const employeeName = (userId: number) => userMap[userId] ?? `Employee #${userId}`;

  const sessionColumns = useMemo<CmsColumn<WorkSession>[]>(() => [
    {
      id: "employee",
      header: "Employee",
      cell: (session) => (
        <EmployeeCell name={employeeName(session.userId)} avatarUrl={avatarMap[session.userId]} />
      ),
    },
    {
      id: "clockIn",
      header: "Clock In",
      className: "tabular-nums text-muted-foreground whitespace-nowrap",
      cell: (session) => format(new Date(session.startedAt), "MMM d, h:mm a"),
    },
    {
      id: "clockOut",
      header: "Clock Out",
      className: "tabular-nums text-muted-foreground whitespace-nowrap",
      cell: (session) => (
        session.endedAt
          ? format(new Date(session.endedAt), "MMM d, h:mm a")
          : <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 border">Active now</Badge>
      ),
    },
    {
      id: "activeTime",
      header: "Active time",
      cell: (session) => <SessionActiveTimeCell session={session} />,
    },
    {
      id: "reason",
      header: "Reason",
      chip: true,
      cell: (session) => <SessionReasonCell session={session} />,
    },
    {
      id: "device",
      header: "Device",
      cell: (session) => <DeviceCell userAgent={session.deviceInfo} />,
    },
  ], [userMap, avatarMap]);

  const dailyColumns = useMemo<CmsColumn<DailySessionTotal>[]>(() => [
    {
      id: "date",
      header: "Date",
      className: "tabular-nums whitespace-nowrap font-medium",
      cell: (row) => formatWorkDayLabel(row.date),
    },
    {
      id: "employee",
      header: "Employee",
      cell: (row) => (
        <EmployeeCell name={employeeName(row.userId)} avatarUrl={avatarMap[row.userId]} />
      ),
    },
    {
      id: "activeTime",
      header: "Active time",
      cell: (row) => <DailyTotalActiveTimeCell row={row} />,
    },
    {
      id: "sessions",
      header: "Sessions",
      className: "text-muted-foreground tabular-nums",
      cell: (row) => row.sessionCount,
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (row) => <DailyTotalStatusCell row={row} />,
    },
  ], [userMap, avatarMap]);

  const consentColumns = useMemo<CmsColumn<ConsentRecord>[]>(() => [
    {
      id: "employee",
      header: "Employee",
      cell: (record) => (
        <EmployeeCell name={employeeName(record.userId)} avatarUrl={avatarMap[record.userId]} />
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (record) => <ConsentStatusCell record={record} />,
    },
    {
      id: "consentedAt",
      header: "Consented At",
      className: "text-muted-foreground whitespace-nowrap",
      cell: (record) => (
        record.consentGivenAt
          ? format(new Date(record.consentGivenAt), "MMM d yyyy, h:mm a")
          : "—"
      ),
    },
    {
      id: "policyVersion",
      header: "Policy Version",
      cell: (record) => (
        record.consentVersion ? (
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{record.consentVersion}</code>
        ) : "—"
      ),
    },
    {
      id: "device",
      header: "Device",
      cell: (record) => <DeviceCell userAgent={record.userAgent} />,
    },
    {
      id: "ipAddress",
      header: "IP Address",
      className: "text-muted-foreground font-mono text-[10px]",
      cell: (record) => record.ipAddress ?? "—",
    },
  ], [userMap, avatarMap]);

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Attendance & Monitoring"
        subtitle="Work sessions, clock-in history, and monitoring consent audit"
        actions={
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href="/hrm/attendance">HR attendance report</Link>
          </Button>
        }
      />

      <PortalKpiGrid
        loading={loadingActive || loadingSessions || loadingConsents}
        columns={6}
        count={5}
        items={[
          {
            title: "Active time today",
            value: liveTotalActiveMs > 0 ? durationLabel(liveTotalActiveMs) : "—",
            hint: "Clocked in now",
            icon: Timer,
            accent: "green",
            delay: 0,
          },
          {
            title: "Currently active",
            value: activeAll?.total ?? 0,
            icon: Activity,
            accent: "green",
            delay: 1,
          },
          {
            title: "Total sessions",
            value: sessions?.total ?? 0,
            icon: Users,
            accent: "blue",
            delay: 2,
          },
          {
            title: "Avg session",
            value: avgDurationMs > 0 ? durationLabel(avgDurationMs) : "—",
            icon: Timer,
            accent: "violet",
            delay: 3,
          },
          {
            title: "Consented",
            value: consents ? `${consentedCount} / ${consents.total}` : "—",
            icon: ShieldCheck,
            accent: "amber",
            delay: 4,
          },
        ]}
      />

      {/* Active employees strip */}
      {(loadingActive || (activeAll?.data.length ?? 0) > 0) && (
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Currently clocked in — active time today
              {activeAll && (
                <Badge className="ml-1 bg-emerald-500/10 text-emerald-600 border-emerald-200 border text-[10px]">
                  {activeAll.total}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            {loadingActive ? (
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-28 rounded-full" />)}
              </div>
            ) : !activeAll?.data.length ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MonitorOff className="h-4 w-4 opacity-40" />
                No employees are currently clocked in
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeAll.data.map((s) => (
                  <ActiveEmployeeChip
                    key={s.id}
                    session={s}
                    userName={userMap[s.userId] ?? `User #${s.userId}`}
                    avatarUrl={avatarMap[s.userId]}
                    dailyTotalMs={todayDailyByUser.get(s.userId)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <CmsChipTabs
        value={section}
        onValueChange={(v) => setSection(v as typeof section)}
        items={[
          { value: "sessions", label: "Sessions", count: sessions?.total },
          { value: "daily", label: "Daily time", count: dailyTotals?.total },
          { value: "consents", label: "Consent audit", count: consents?.total },
        ]}
      />

      {section === "sessions" ? (
        <div className="space-y-3">
          <CmsFilterBar>
            <Select
              value={filterUserId ? String(filterUserId) : "all"}
              onValueChange={(v) => {
                setFilterUserId(v === "all" ? undefined : Number(v));
                setSessionsPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[220px] bg-background text-xs">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CmsFilterBar>
          <CmsDataTable
            columns={sessionColumns}
            rows={sessions?.data ?? []}
            rowKey={(s) => s.id}
            isLoading={loadingSessions}
            error={sessionsError}
            onRetry={() => refetchSessions()}
            viewStorageKey="admin-attendance-sessions"
            empty={{ icon: Clock, title: "No sessions found" }}
            pagination={{
              page: sessionsPage,
              total: sessions?.total ?? 0,
              limit: LIMIT,
              loadedRowCount: sessions?.data.length ?? 0,
              onPageChange: setSessionsPage,
            }}
          />
        </div>
      ) : null}

      {section === "daily" ? (
        <div className="space-y-3">
          <CmsFilterBar>
            <div className="space-y-1">
              <Label htmlFor="daily-from" className="text-[10px] uppercase text-muted-foreground">
                From
              </Label>
              <Input
                id="daily-from"
                type="date"
                className="h-9 w-40 text-xs bg-background"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDailyPage(1);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="daily-to" className="text-[10px] uppercase text-muted-foreground">
                To
              </Label>
              <Input
                id="daily-to"
                type="date"
                className="h-9 w-40 text-xs bg-background"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDailyPage(1);
                }}
              />
            </div>
            <Select
              value={filterUserId ? String(filterUserId) : "all"}
              onValueChange={(v) => {
                setFilterUserId(v === "all" ? undefined : Number(v));
                setDailyPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[220px] bg-background text-xs">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(fromDate || toDate || filterUserId) && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setFilterUserId(undefined);
                  setDailyPage(1);
                }}
              >
                Reset filters
              </button>
            )}
          </CmsFilterBar>
          {dailyTotals?.timezone ? (
            <p className="text-[11px] text-muted-foreground px-1">
              Work days use timezone{" "}
              <code className="font-mono bg-muted px-1 rounded">{dailyTotals.timezone}</code>
              {dailyTotals.from && dailyTotals.to ? (
                <> · showing {dailyTotals.from} to {dailyTotals.to}</>
              ) : null}
            </p>
          ) : null}
          <CmsDataTable
            columns={dailyColumns}
            rows={dailyTotals?.data ?? []}
            rowKey={(row) => `${row.userId}-${row.date}`}
            isLoading={loadingDaily}
            error={dailyError}
            onRetry={() => refetchDaily()}
            viewStorageKey="admin-attendance-daily"
            empty={{ icon: Timer, title: "No session time recorded for this range" }}
            pagination={{
              page: dailyPage,
              total: dailyTotals?.total ?? 0,
              limit: DAILY_LIMIT,
              loadedRowCount: dailyTotals?.data.length ?? 0,
              onPageChange: setDailyPage,
            }}
          />
        </div>
      ) : null}

      {section === "consents" ? (
        <CmsDataTable
          columns={consentColumns}
          rows={consents?.data ?? []}
          rowKey={(c) => c.id}
          isLoading={loadingConsents}
          error={consentsError}
          onRetry={() => refetchConsents()}
          viewStorageKey="admin-attendance-consents"
          empty={{ icon: ShieldCheck, title: "No consent records found" }}
          pagination={{
            page: consentsPage,
            total: consents?.total ?? 0,
            limit: CONSENT_LIMIT,
            loadedRowCount: consents?.data.length ?? 0,
            onPageChange: setConsentsPage,
          }}
        />
      ) : null}
    </PortalPageShell>
  );
}
