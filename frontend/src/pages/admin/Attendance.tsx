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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

// ── KPI card ──────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  loading,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
  accent?: "green" | "blue" | "violet" | "amber";
}) {
  const colors = {
    green: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-sky-500/10 text-sky-500",
    violet: "bg-violet-500/10 text-violet-500",
    amber: "bg-amber-500/10 text-amber-500",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", colors[accent ?? "violet"])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-12 mt-0.5" />
          ) : (
            <p className="text-xl font-bold leading-tight">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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

// ── SessionRow ────────────────────────────────────────────────────────────

function SessionRow({
  session,
  userName,
  avatarUrl,
}: {
  session: WorkSession;
  userName: string;
  avatarUrl?: string | null;
}) {
  const { label: deviceLabel, Icon: DeviceIcon } = parseDevice(session.deviceInfo);

  return (
    <TableRow className="text-xs">
      <TableCell className="py-2.5">
        <EmployeeCell name={userName} avatarUrl={avatarUrl} />
      </TableCell>
      <TableCell className="py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
        {format(new Date(session.startedAt), "MMM d, h:mm a")}
      </TableCell>
      <TableCell className="py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
        {session.endedAt
          ? format(new Date(session.endedAt), "MMM d, h:mm a")
          : <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 border">Active now</Badge>}
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Timer className="h-3 w-3 shrink-0" />
          {session.isActive ? (
            <LiveActiveDuration session={session} className="whitespace-nowrap font-medium text-foreground tabular-nums" />
          ) : (
            <span className="whitespace-nowrap tabular-nums">{durationLabel(session.durationMs)}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        {session.stopReason ? (
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", REASON_CLASS[session.stopReason])}>
            {REASON_LABELS[session.stopReason]}
          </span>
        ) : session.isActive ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px]">
            <Activity className="h-3 w-3" /> In progress
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <DeviceIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{deviceLabel}</span>
        </div>
      </TableCell>
    </TableRow>
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

// ── ConsentRow ────────────────────────────────────────────────────────────

function ConsentRow({
  record,
  userName,
  avatarUrl,
}: {
  record: ConsentRecord;
  userName: string;
  avatarUrl?: string | null;
}) {
  const { label: deviceLabel, Icon: DeviceIcon } = parseDevice(record.userAgent);
  const consented = !!record.consentGivenAt;

  return (
    <TableRow className="text-xs">
      <TableCell className="py-2.5">
        <EmployeeCell name={userName} avatarUrl={avatarUrl} />
      </TableCell>
      <TableCell className="py-2.5">
        {consented ? (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Consented</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-500">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Not consented</span>
          </div>
        )}
      </TableCell>
      <TableCell className="py-2.5 text-muted-foreground whitespace-nowrap">
        {record.consentGivenAt
          ? format(new Date(record.consentGivenAt), "MMM d yyyy, h:mm a")
          : "—"}
      </TableCell>
      <TableCell className="py-2.5">
        {record.consentVersion ? (
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{record.consentVersion}</code>
        ) : "—"}
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <DeviceIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{deviceLabel}</span>
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-muted-foreground font-mono text-[10px]">
        {record.ipAddress ?? "—"}
      </TableCell>
    </TableRow>
  );
}

// ── DailyTotalRow ─────────────────────────────────────────────────────────

function formatWorkDayLabel(dateKey: string) {
  return format(parseISO(`${dateKey}T12:00:00`), "EEE, MMM d, yyyy");
}

function DailyTotalRow({
  row,
  userName,
  avatarUrl,
}: {
  row: DailySessionTotal;
  userName: string;
  avatarUrl?: string | null;
}) {
  return (
    <TableRow className="text-xs">
      <TableCell className="py-2.5 tabular-nums whitespace-nowrap font-medium">
        {formatWorkDayLabel(row.date)}
      </TableCell>
      <TableCell className="py-2.5">
        <EmployeeCell name={userName} avatarUrl={avatarUrl} />
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1 font-semibold tabular-nums">
          <Timer className="h-3 w-3 shrink-0 text-primary" />
          {durationLabel(row.totalMs)}
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-muted-foreground tabular-nums">
        {row.sessionCount}
      </TableCell>
      <TableCell className="py-2.5">
        {row.hasActiveSession ? (
          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 border">
            In progress
          </Badge>
        ) : (
          <span className="text-muted-foreground">Completed</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

const LIMIT = 30;
const CONSENT_LIMIT = 50;
const DAILY_LIMIT = 40;

export default function AttendancePage() {
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
  const { data: sessions, isLoading: loadingSessions } = useAdminWorkSessions({
    userId: filterUserId,
    page: sessionsPage,
    limit: LIMIT,
  });
  const { data: consents, isLoading: loadingConsents } = useAdminConsentList({
    page: consentsPage,
    limit: CONSENT_LIMIT,
  });
  const { data: dailyTotals, isLoading: loadingDaily } = useDailySessionTotals({
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          Attendance & Monitoring
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Work sessions, clock-in history, and monitoring consent audit.{" "}
          <Link href="/hrm/attendance" className="text-primary underline-offset-2 hover:underline">
            View HR attendance report
          </Link>
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Active time today (clocked in)"
          value={liveTotalActiveMs > 0 ? durationLabel(liveTotalActiveMs) : "—"}
          icon={Timer}
          loading={loadingActive}
          accent="green"
        />
        <KpiCard
          label="Currently active"
          value={activeAll?.total ?? 0}
          icon={Activity}
          loading={loadingActive}
          accent="green"
        />
        <KpiCard
          label="Total sessions"
          value={sessions?.total ?? 0}
          icon={Users}
          loading={loadingSessions}
          accent="blue"
        />
        <KpiCard
          label="Avg session length"
          value={avgDurationMs > 0 ? durationLabel(avgDurationMs) : "—"}
          icon={Timer}
          loading={loadingSessions}
          accent="violet"
        />
        <KpiCard
          label="Consented employees"
          value={consents ? `${consentedCount} / ${consents.total}` : "—"}
          icon={ShieldCheck}
          loading={loadingConsents}
          accent="amber"
        />
      </div>

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

      {/* Tabs */}
      <Tabs defaultValue="sessions">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sessions" className="gap-1.5 flex-1 sm:flex-none">
            <Users className="h-3.5 w-3.5" />
            Sessions
            {sessions && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                {sessions.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5 flex-1 sm:flex-none">
            <Timer className="h-3.5 w-3.5" />
            Daily time
            {dailyTotals && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                {dailyTotals.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="consents" className="gap-1.5 flex-1 sm:flex-none">
            <ShieldCheck className="h-3.5 w-3.5" />
            Consent Audit
            {consents && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                {consents.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── SESSIONS TAB ── */}
        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <Select
                  value={filterUserId ? String(filterUserId) : "all"}
                  onValueChange={(v) => {
                    setFilterUserId(v === "all" ? undefined : Number(v));
                    setSessionsPage(1);
                  }}
                >
                  <SelectTrigger className="w-52 h-8 text-xs">
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
                {filterUserId && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    onClick={() => { setFilterUserId(undefined); setSessionsPage(1); }}
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSessions ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : !sessions?.data.length ? (
                <div className="py-16 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No sessions found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase">Employee</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Clock In</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Clock Out</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Active time</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Reason</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Device</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.data.map((s) => (
                          <SessionRow
                            key={s.id}
                            session={s}
                            userName={userMap[s.userId] ?? `Employee #${s.userId}`}
                            avatarUrl={avatarMap[s.userId]}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <DataPagination
                      page={sessionsPage}
                      total={sessions.total}
                      limit={LIMIT}
                      loadedRowCount={sessions.data.length}
                      onPageChange={setSessionsPage}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DAILY TIME TAB ── */}
        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border/60 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="daily-from" className="text-[10px] uppercase text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="daily-from"
                    type="date"
                    className="h-8 w-40 text-xs"
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
                    className="h-8 w-40 text-xs"
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
                  <SelectTrigger className="w-52 h-8 text-xs">
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
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 pb-1"
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
              </div>
              {dailyTotals?.timezone && (
                <p className="text-[11px] text-muted-foreground">
                  Work days use timezone{" "}
                  <code className="font-mono bg-muted px-1 rounded">{dailyTotals.timezone}</code>
                  {dailyTotals.from && dailyTotals.to && (
                    <>
                      {" "}
                      · showing {dailyTotals.from} to {dailyTotals.to}
                    </>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loadingDaily ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : !dailyTotals?.data.length ? (
                <div className="py-16 text-center">
                  <Timer className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No session time recorded for this range</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase">Date</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Employee</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Active time</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Sessions</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyTotals.data.map((row) => (
                          <DailyTotalRow
                            key={`${row.userId}-${row.date}`}
                            row={row}
                            userName={userMap[row.userId] ?? `Employee #${row.userId}`}
                            avatarUrl={avatarMap[row.userId]}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <DataPagination
                      page={dailyPage}
                      total={dailyTotals.total}
                      limit={DAILY_LIMIT}
                      loadedRowCount={dailyTotals.data.length}
                      onPageChange={setDailyPage}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CONSENT AUDIT TAB ── */}
        <TabsContent value="consents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingConsents ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : !consents?.data.length ? (
                <div className="py-16 text-center">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No consent records found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase">Employee</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Status</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Consented At</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Policy Version</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">Device</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase">IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consents.data.map((c) => (
                          <ConsentRow
                            key={c.id}
                            record={c}
                            userName={userMap[c.userId] ?? `Employee #${c.userId}`}
                            avatarUrl={avatarMap[c.userId]}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <DataPagination
                      page={consentsPage}
                      total={consents.total}
                      limit={CONSENT_LIMIT}
                      loadedRowCount={consents.data.length}
                      onPageChange={setConsentsPage}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
