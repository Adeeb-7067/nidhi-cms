import { useState } from "react";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageHero, HrmPageShell } from "@/modules/hrm/components";
import {
  HrmCalendarDayPanel,
  HrmCalendarGrid,
  HrmCalendarMonthNav,
  HrmCalendarStatCards,
  shiftCalendarMonth,
} from "@/modules/hrm/HrmCalendarView";
import { useHrmCalendar } from "@/api/hrm";
import type { HrmCalendarEvent } from "@/modules/hrm/types";

export default function HrmMyHolidaysPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data, isLoading } = useHrmCalendar(year, month);
  const days = data?.days ?? {};
  const selectedEvents = selectedDate ? (days[selectedDate] ?? []) : [];

  return (
    <HrmGate module="my_holidays">
      <HrmPageShell className="space-y-4">
        <HrmPageHero
          title="Calendar"
          description="Company holidays, birthdays, and events"
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Holiday calendar" }]}
        />

        <HrmCalendarMonthNav
          year={year}
          month={month}
          subtitle="View-only company calendar"
          onPrev={() => {
            const next = shiftCalendarMonth(year, month, -1);
            setYear(next.year);
            setMonth(next.month);
            setSelectedDate(null);
          }}
          onNext={() => {
            const next = shiftCalendarMonth(year, month, 1);
            setYear(next.year);
            setMonth(next.month);
            setSelectedDate(null);
          }}
        />

        <HrmCalendarStatCards stats={data?.stats} loading={isLoading} />

        <HrmCalendarGrid
          year={year}
          month={month}
          days={days}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          loading={isLoading}
        />

        <HrmCalendarDayPanel
          dateKey={selectedDate}
          events={selectedEvents as HrmCalendarEvent[]}
          readOnly
        />
      </HrmPageShell>
    </HrmGate>
  );
}
