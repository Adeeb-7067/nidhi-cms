import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalContentCard } from "@/components/layout/portal-page-kit";
import type { HrmCalendarEvent, HrmCalendarMonth } from "./types";

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const DOT_CLASS: Record<HrmCalendarEvent["kind"], string> = {
  holiday: "bg-red-500",
  birthday: "bg-violet-500",
  company_event: "bg-orange-500",
};

function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function HrmCalendarStatCards({
  stats,
  loading,
}: {
  stats?: HrmCalendarMonth["stats"];
  loading?: boolean;
}) {
  const items = [
    { label: "Events this month", value: stats?.eventsThisMonth ?? 0, valueClass: "text-foreground" },
    { label: "Holidays", value: stats?.holidays ?? 0, valueClass: "text-red-500" },
    { label: "Birthdays", value: stats?.birthdays ?? 0, valueClass: "text-violet-500" },
    { label: "Company events", value: stats?.companyEvents ?? 0, valueClass: "text-pink-500" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <PortalContentCard key={item.label} contentClassName="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
          <p className={cn("mt-2 text-3xl font-bold tabular-nums", item.valueClass)}>
            {loading ? "—" : item.value}
          </p>
        </PortalContentCard>
      ))}
    </div>
  );
}

export function HrmCalendarGrid({
  year,
  month,
  days,
  selectedDate,
  onSelectDate,
  loading,
}: {
  year: number;
  month: number;
  days: Record<string, HrmCalendarEvent[]>;
  selectedDate?: string | null;
  onSelectDate?: (dateKey: string) => void;
  loading?: boolean;
}) {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <PortalContentCard contentClassName="p-4 sm:p-5">
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {cells.map((date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const inMonth = isSameMonth(date, monthStart);
          const isSunday = date.getDay() === 0;
          const isSelected = selectedDate === dateKey;
          const isToday = isSameDay(date, today);
          const events = days[dateKey] ?? [];

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!inMonth || loading}
              onClick={() => inMonth && onSelectDate?.(dateKey)}
              className={cn(
                "relative flex min-h-[4.5rem] flex-col items-center rounded-xl border border-transparent p-2 transition-colors",
                inMonth ? "hover:border-border/60 hover:bg-muted/30" : "opacity-30 cursor-default",
                isSelected && "border-primary/50 bg-primary/5 ring-1 ring-primary/30",
                !isSelected && isToday && inMonth && "border-border/60 bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                  !inMonth && "text-muted-foreground",
                  inMonth && isSunday && "text-red-500",
                  inMonth && !isSunday && "text-foreground",
                  isSelected && "bg-primary text-primary-foreground",
                )}
              >
                {format(date, "d")}
              </span>
              {inMonth && events.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                  {events.slice(0, 4).map((ev, i) => (
                    <span
                      key={`${ev.kind}-${ev.id ?? ev.userId ?? i}-${ev.label}`}
                      className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[ev.kind])}
                      title={ev.label}
                    />
                  ))}
                  {events.length > 4 && (
                    <span className="text-[9px] text-muted-foreground">+{events.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Holiday
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500" /> Birthday
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> Company event
        </span>
      </div>
    </PortalContentCard>
  );
}

export function HrmCalendarMonthNav({
  year,
  month,
  onPrev,
  onNext,
  subtitle,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{monthLabel(year, month)}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function HrmCalendarDayPanel({
  dateKey,
  events,
  readOnly,
  onAddHoliday,
  onDeleteHoliday,
}: {
  dateKey: string | null;
  events: HrmCalendarEvent[];
  readOnly?: boolean;
  onAddHoliday?: () => void;
  onDeleteHoliday?: (id: number) => void;
}) {
  if (!dateKey) return null;
  const label = format(parseISO(dateKey), "EEEE, MMMM d, yyyy");

  return (
    <PortalContentCard contentClassName="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {events.length ? `${events.length} event(s) on this day` : "No events scheduled"}
          </p>
        </div>
        {!readOnly && onAddHoliday && (
          <button
            type="button"
            onClick={onAddHoliday}
            className="text-xs font-medium text-primary hover:underline"
          >
            + Add holiday / event
          </button>
        )}
      </div>
      {events.length > 0 && (
        <ul className="mt-3 space-y-2">
          {events.map((ev, i) => (
            <li
              key={`${ev.kind}-${ev.id ?? ev.userId ?? i}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_CLASS[ev.kind])} />
                <span className="truncate">{ev.label}</span>
              </div>
              {!readOnly && ev.kind !== "birthday" && ev.id && onDeleteHoliday && (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline shrink-0"
                  onClick={() => onDeleteHoliday(ev.id!)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </PortalContentCard>
  );
}

export function shiftCalendarMonth(year: number, month: number, delta: number) {
  const next = addMonths(new Date(year, month - 1, 1), delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}
