import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmField,
  portalActionButtonClass,
} from "@/modules/hrm/components";
import { HrmRefRefreshButton } from "@/modules/hrm/hrm-reference-kit";
import {
  HrmCalendarDayPanel,
  HrmCalendarGrid,
  HrmCalendarMonthNav,
  HrmCalendarStatCards,
  shiftCalendarMonth,
} from "@/modules/hrm/HrmCalendarView";
import {
  useCreateHoliday,
  useDeleteHoliday,
  useGenerateSundayHolidays,
  useHrmCalendar,
  useUpdateHoliday,
} from "@/api/hrm";
import type { HrmCalendarEvent, HrmHoliday } from "@/modules/hrm/types";

export default function HrmCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HrmHoliday | null>(null);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<"public" | "optional">("public");

  const { data, isLoading, refetch, isFetching } = useHrmCalendar(year, month);
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const generateSundays = useGenerateSundayHolidays();

  const days = data?.days ?? {};
  const selectedEvents = selectedDate ? (days[selectedDate] ?? []) : [];

  const existingHolidayOnSelected = useMemo(() => {
    if (!selectedDate || !data?.holidays) return null;
    return data.holidays.find((h) => h.date === selectedDate) ?? null;
  }, [selectedDate, data?.holidays]);

  const openAddDialog = () => {
    if (!selectedDate) return;
    if (existingHolidayOnSelected) {
      setEditing(existingHolidayOnSelected);
      setName(existingHolidayOnSelected.name);
      setEventType(existingHolidayOnSelected.type === "optional" ? "optional" : "public");
    } else {
      setEditing(null);
      setName("");
      setEventType("public");
    }
    setDialogOpen(true);
  };

  const saveHoliday = async () => {
    if (!selectedDate || !name.trim()) return;
    try {
      if (editing) {
        await updateHoliday.mutateAsync({
          id: editing.id,
          date: selectedDate,
          name: name.trim(),
          type: eventType,
        });
        toast.success("Calendar entry updated");
      } else {
        await createHoliday.mutateAsync({
          date: selectedDate,
          name: name.trim(),
          type: eventType,
        });
        toast.success("Calendar entry added");
      }
      setDialogOpen(false);
      void refetch();
    } catch {
      // Error toast handled by mutation hook
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    try {
      await deleteHoliday.mutateAsync(id);
      toast.success("Removed from calendar");
      void refetch();
    } catch {
      // Error toast handled by mutation hook
    }
  };

  const handleGenerateYear = async () => {
    try {
      const result = await generateSundays.mutateAsync(year);
      toast.success(`Generated ${result.created} Sunday holidays (${result.skipped} already existed)`);
      void refetch();
    } catch {
      // Error toast handled by mutation hook
    }
  };

  return (
    <HrmGate module="holidays">
      <HrmPageShell className="space-y-4">
        <HrmPageHero
          title="Calendar"
          description="Company calendar · linked to attendance scheduling"
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Calendar" }]}
          actions={
            <div className="flex flex-wrap gap-2">
              <HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />
              <Button
                size="sm"
                className={portalActionButtonClass("bg-primary text-primary-foreground hover:bg-primary/90")}
                onClick={() => void handleGenerateYear()}
                disabled={generateSundays.isPending}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Generate {year}
              </Button>
            </div>
          }
        />

        <HrmCalendarMonthNav
          year={year}
          month={month}
          subtitle="Company calendar · linked to attendance scheduling"
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
          onAddHoliday={openAddDialog}
          onDeleteHoliday={(id) => void handleDeleteHoliday(id)}
        />

        <p className="text-xs text-muted-foreground px-1">
          Click a day to mark holidays or add events. Use &quot;Generate {year}&quot; to seed Sundays as
          holidays for the full year.
        </p>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit calendar entry" : "Add holiday / event"}</DialogTitle>
              <DialogDescription>
                {selectedDate
                  ? `Schedule for ${selectedDate}. Public holidays affect attendance; optional entries are company events.`
                  : "Pick a day on the calendar first."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali / Team outing" />
              </HrmField>
              <HrmField label="Type">
                <Select value={eventType} onValueChange={(v) => setEventType(v as "public" | "optional")}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public holiday</SelectItem>
                    <SelectItem value="optional">Company event</SelectItem>
                  </SelectContent>
                </Select>
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                onClick={() => void saveHoliday()}
                disabled={createHoliday.isPending || updateHoliday.isPending}
              >
                {editing ? "Save changes" : "Add to calendar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
