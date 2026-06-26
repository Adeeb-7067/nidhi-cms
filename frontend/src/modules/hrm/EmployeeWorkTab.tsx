import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Clock,
  Camera,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { customFetch } from "@/api/custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { useListScreenshots } from "@/api/monitoring";
import { useDailySessionTotals } from "@/api/work-sessions";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { HrmChartCard, HrmTabsList, HrmTabsTrigger } from "@/modules/hrm/components";
import type { DailyLog, LogComplianceCalendar } from "@/api/generated/api.schemas";
import type { DailySessionTotal } from "@/api/work-sessions";
import type { ScreenshotItem } from "@/api/monitoring";

// ─── helpers ────────────────────────────────────────────────────────────────

function msToHours(ms: number) {
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

function categoryBadge(cat: string) {
  return (
    <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">
      {cat}
    </Badge>
  );
}

// ─── sub-hooks ──────────────────────────────────────────────────────────────

function useEmployeeLogs(employeeId: number, month: number, year: number, enabled: boolean) {
  return useQuery({
    queryKey: ["employee-logs", employeeId, month, year],
    queryFn: () =>
      customFetch<{ logs: DailyLog[]; total: number; page: number; limit: number }>(
        apiUrl(`/api/logs?developerId=${employeeId}&month=${month}&year=${year}&limit=200`),
      ),
    enabled: enabled && !!employeeId,
  });
}

function useEmployeeComplianceCalendar(
  employeeId: number,
  month: number,
  year: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["employee-compliance", employeeId, month, year],
    queryFn: () =>
      customFetch<LogComplianceCalendar>(
        apiUrl(
          `/api/logs/compliance-calendar?developerId=${employeeId}&month=${month}&year=${year}`,
        ),
      ),
    enabled: enabled && !!employeeId,
  });
}

// ─── MonthPicker ─────────────────────────────────────────────────────────────

function MonthPicker({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  const prev = () => {
    const d = new Date(year, month - 2, 1);
    onChange(d.getMonth() + 1, d.getFullYear());
  };
  const next = () => {
    const d = new Date(year, month, 1);
    onChange(d.getMonth() + 1, d.getFullYear());
  };
  const now = new Date();
  const isCurrentOrFuture =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={prev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium w-32 text-center">{monthLabel(year, month)}</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={next}
        disabled={isCurrentOrFuture}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Logs sub-tab ────────────────────────────────────────────────────────────

const logColumns: Column<DailyLog>[] = [
  {
    id: "date",
    header: "Date",
    cell: (r) => format(new Date(`${r.logDate}T12:00:00`), "EEE, MMM d"),
    exportValue: (r) => r.logDate,
  },
  {
    id: "project",
    header: "Project",
    cell: (r) => <span className="text-xs">{r.projectName}</span>,
    exportValue: (r) => r.projectName,
  },
  {
    id: "task",
    header: "Task",
    cell: (r) => (
      <div className="max-w-[260px]">
        <p className="text-xs font-medium truncate">{r.taskTitle}</p>
        {r.taskDescription && (
          <p className="text-[10px] text-muted-foreground truncate">{r.taskDescription}</p>
        )}
      </div>
    ),
    exportValue: (r) => r.taskTitle,
  },
  {
    id: "hours",
    header: "Hours",
    cell: (r) => (
      <span className="tabular-nums font-semibold text-sm">{r.hoursSpent}h</span>
    ),
    exportValue: (r) => String(r.hoursSpent),
  },
  {
    id: "categories",
    header: "Categories",
    cell: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.workCategories.map(categoryBadge)}
      </div>
    ),
    exportValue: (r) => r.workCategories.join(", "),
  },
  {
    id: "completion",
    header: "Done %",
    cell: (r) => <span className="tabular-nums text-xs">{r.completionPct}%</span>,
    exportValue: (r) => String(r.completionPct),
  },
  {
    id: "blockers",
    header: "Blockers",
    cell: (r) =>
      r.blockers ? (
        <span className="text-[10px] text-rose-500 max-w-[180px] truncate block">{r.blockers}</span>
      ) : (
        <span className="text-[10px] text-muted-foreground">—</span>
      ),
    exportValue: (r) => r.blockers ?? "",
  },
];

function LogsSubTab({ employeeId }: { employeeId: number }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useEmployeeLogs(employeeId, month, year, true);
  const logs = data?.logs ?? [];
  const totalHours = useMemo(
    () => Math.round(logs.reduce((s, l) => s + Number(l.hoursSpent || 0), 0) * 10) / 10,
    [logs],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        {logs.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{logs.length}</span> entries
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{totalHours}h</span> logged
            </span>
          </div>
        )}
      </div>
      <PortalTablePanel isLoading={isLoading}>
        <AdvancedTable
          data={logs}
          columns={logColumns}
          filename={`Logs_${monthLabel(year, month)}`}
          viewStorageKey={`emp-work-logs-${employeeId}`}
        />
      </PortalTablePanel>
    </div>
  );
}

// ─── Sessions sub-tab ─────────────────────────────────────────────────────────

const sessionColumns: Column<DailySessionTotal>[] = [
  {
    id: "date",
    header: "Date",
    cell: (r) => format(new Date(`${r.date}T12:00:00`), "EEE, MMM d yyyy"),
    exportValue: (r) => r.date,
  },
  {
    id: "active",
    header: "Active time",
    cell: (r) => (
      <span className="tabular-nums font-semibold">{msToHours(r.totalMs)}h</span>
    ),
    exportValue: (r) => String(msToHours(r.totalMs)),
  },
  {
    id: "sessions",
    header: "Sessions",
    cell: (r) => <span className="tabular-nums text-xs">{r.sessionCount}</span>,
    exportValue: (r) => String(r.sessionCount),
  },
  {
    id: "status",
    header: "Status",
    cell: (r) =>
      r.hasActiveSession ? (
        <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]">Active now</Badge>
      ) : (
        <span className="text-[10px] text-muted-foreground">Clocked out</span>
      ),
    exportValue: (r) => (r.hasActiveSession ? "Active" : "Clocked out"),
  },
];

function SessionsSubTab({ employeeId }: { employeeId: number }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fromDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const toDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const { data, isLoading } = useDailySessionTotals({
    userId: employeeId,
    fromDate,
    toDate,
    limit: 31,
  });

  const rows = data?.data ?? [];
  const totalHours = useMemo(
    () => Math.round(rows.reduce((s, r) => s + msToHours(r.totalMs), 0) * 10) / 10,
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        {rows.length > 0 && (
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{totalHours}h</span> active this month
          </span>
        )}
      </div>
      <PortalTablePanel isLoading={isLoading}>
        <AdvancedTable
          data={rows}
          columns={sessionColumns}
          filename={`Sessions_${monthLabel(year, month)}`}
          viewStorageKey={`emp-work-sessions-${employeeId}`}
        />
      </PortalTablePanel>
    </div>
  );
}

// ─── Screenshots sub-tab ──────────────────────────────────────────────────────

function ScreenshotsSubTab({ employeeId }: { employeeId: number }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  const startDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const { data, isLoading } = useListScreenshots(
    { userId: employeeId, startDate, endDate, page, limit: PAGE_SIZE },
    true,
  );

  const screenshots = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
            setPage(1);
          }}
        />
        <span className="text-sm text-muted-foreground tabular-nums">
          {total} screenshot{total !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      ) : screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Camera className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No screenshots for {monthLabel(year, month)}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {screenshots.map((s) => (
              <ScreenshotCard key={s.id} screenshot={s} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScreenshotCard({ screenshot }: { screenshot: ScreenshotItem }) {
  return (
    <a
      href={screenshot.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-video rounded-lg overflow-hidden border bg-muted/30 hover:border-primary/50 transition-colors"
    >
      <img
        src={screenshot.fileUrl}
        alt={`Screenshot ${screenshot.id}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white tabular-nums">
          {format(new Date(screenshot.takenAt), "MMM d, HH:mm")}
        </p>
      </div>
    </a>
  );
}

// ─── Monthly Report sub-tab ──────────────────────────────────────────────────

const COMPLIANCE_STATUS_COLORS: Record<string, string> = {
  complete: "bg-emerald-500/20 text-emerald-700 border-emerald-200",
  incomplete: "bg-amber-500/20 text-amber-700 border-amber-200",
  absent: "bg-rose-500/20 text-rose-700 border-rose-200",
  weekend: "bg-muted/40 text-muted-foreground",
  future: "bg-muted/20 text-muted-foreground/50",
};

function ReportSubTab({ employeeId }: { employeeId: number }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useEmployeeComplianceCalendar(employeeId, month, year, true);

  // Build last 6 months summary by fetching each month
  const last6 = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), i);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }).reverse();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Complete days", value: data.completeDays, color: "text-emerald-600" },
              { label: "Incomplete days", value: data.incompleteDays, color: "text-amber-600" },
              { label: "Tracked weekdays", value: data.trackedWeekdays, color: "text-blue-600" },
              {
                label: "Total hours",
                value: `${Math.round(data.days.reduce((s, d) => s + d.loggedHours, 0) * 10) / 10}h`,
                color: "text-foreground",
              },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border bg-muted/20 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <p className={`mt-0.5 text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <HrmChartCard title="Daily breakdown" description={monthLabel(year, month)}>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground mb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <CalendarGrid days={data.days} month={month} year={year} />
          </HrmChartCard>
        </>
      ) : null}

      {/* 6-month trend summary */}
      <HrmChartCard title="Monthly log trend" description="Last 6 months">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {last6.map((m) => (
            <MonthSummaryCell
              key={`${m.year}-${m.month}`}
              employeeId={employeeId}
              month={m.month}
              year={m.year}
              active={m.month === month && m.year === year}
              onClick={() => { setMonth(m.month); setYear(m.year); }}
            />
          ))}
        </div>
      </HrmChartCard>
    </div>
  );
}

function CalendarGrid({
  days,
  month,
  year,
}: {
  days: LogComplianceCalendar["days"];
  month: number;
  year: number;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const offset = firstDay === 0 ? 6 : firstDay - 1; // convert to Mon-start
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (null | { date: string; day: number })[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { date: dateStr, day: d };
    }),
  ];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((cell, i) => {
        if (!cell) return <div key={`empty-${i}`} />;
        const info = dayMap.get(cell.date);
        const colorClass =
          COMPLIANCE_STATUS_COLORS[info?.status ?? "future"] ?? COMPLIANCE_STATUS_COLORS.future;
        return (
          <div
            key={cell.date}
            className={`rounded-md border px-1 py-2 text-center ${colorClass}`}
          >
            <p className="text-[10px] font-medium">{cell.day}</p>
            {info && info.loggedHours > 0 && (
              <p className="text-[9px] tabular-nums mt-0.5">{info.loggedHours}h</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthSummaryCell({
  employeeId,
  month,
  year,
  active,
  onClick,
}: {
  employeeId: number;
  month: number;
  year: number;
  active: boolean;
  onClick: () => void;
}) {
  const { data } = useEmployeeComplianceCalendar(employeeId, month, year, true);
  const hours = data
    ? Math.round(data.days.reduce((s, d) => s + d.loggedHours, 0) * 10) / 10
    : null;

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2 py-3 text-center transition-colors hover:border-primary/50 ${
        active ? "border-primary bg-primary/5" : "bg-muted/20"
      }`}
    >
      <p className="text-[10px] text-muted-foreground">{format(new Date(year, month - 1), "MMM")}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5">
        {hours != null ? `${hours}h` : "—"}
      </p>
      {data && (
        <p className="text-[9px] text-muted-foreground mt-0.5">{data.completeDays} days</p>
      )}
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function EmployeeWorkTab({ employeeId }: { employeeId: number }) {
  const [subTab, setSubTab] = useState("logs");

  return (
    <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
      <HrmTabsList>
        <HrmTabsTrigger value="logs">
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Daily logs
        </HrmTabsTrigger>
        <HrmTabsTrigger value="sessions">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Work sessions
        </HrmTabsTrigger>
        <HrmTabsTrigger value="screenshots">
          <Camera className="h-3.5 w-3.5 mr-1.5" />
          Screenshots
        </HrmTabsTrigger>
        <HrmTabsTrigger value="report">
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          Monthly report
        </HrmTabsTrigger>
      </HrmTabsList>

      <TabsContent value="logs" className="mt-0">
        <LogsSubTab employeeId={employeeId} />
      </TabsContent>

      <TabsContent value="sessions" className="mt-0">
        <SessionsSubTab employeeId={employeeId} />
      </TabsContent>

      <TabsContent value="screenshots" className="mt-0">
        <ScreenshotsSubTab employeeId={employeeId} />
      </TabsContent>

      <TabsContent value="report" className="mt-0">
        <ReportSubTab employeeId={employeeId} />
      </TabsContent>
    </Tabs>
  );
}
