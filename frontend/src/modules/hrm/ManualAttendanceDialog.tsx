import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { TimePicker12h } from "@/components/ui/time-picker-12h";
import { HrmField } from "@/modules/hrm/components";
import { portalActionButtonClass } from "@/modules/hrm/components";
import { useAdminOverrideAttendance } from "@/api/hrm";

type EmployeeOption = { id: number; name: string; employeeId?: string | null };

function minutesFromTimeToNow(time24: string, dateKey: string) {
  const now = new Date();
  const todayKey = format(now, "yyyy-MM-dd");
  const [h, m] = time24.split(":").map(Number);
  const base = new Date(`${dateKey}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  if (dateKey < todayKey) return 480;
  if (dateKey > todayKey) return 0;
  const diff = Math.floor((now.getTime() - base.getTime()) / 60000);
  return Math.max(15, Math.min(diff, 720));
}

export function ManualAttendanceDialog({
  open,
  onOpenChange,
  employees,
  defaultMode = "clock_in",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: EmployeeOption[];
  defaultMode?: "clock_in" | "clock_out";
}) {
  const adminOverride = useAdminOverrideAttendance();
  const [mode, setMode] = useState<"clock_in" | "clock_out">(defaultMode);
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState("8");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  const handleSubmit = async () => {
    const uid = Number(userId);
    if (!uid || !date || !reason.trim()) {
      toast.error("Employee, date, and reason are required");
      return;
    }
    const activeMinutes =
      mode === "clock_in"
        ? minutesFromTimeToNow(time, date)
        : Math.round(Number(hours) * 60);
    if (mode === "clock_out" && (!Number.isFinite(activeMinutes) || activeMinutes <= 0)) {
      toast.error("Enter valid active hours for clock-out");
      return;
    }
    try {
      await adminOverride.mutateAsync({
        userId: uid,
        date,
        status: "present",
        activeMinutes,
        reason: `${mode === "clock_in" ? "Manual clock-in" : "Manual clock-out"}: ${reason.trim()}`,
      });
      toast.success(mode === "clock_in" ? "Clock-in recorded" : "Clock-out recorded");
      onOpenChange(false);
      setReason("");
    } catch {
      // mutation hook shows error
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "clock_in" ? "Manual clock in" : "Manual clock out"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <HrmField label="Employee">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                    {u.employeeId ? ` (${u.employeeId})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrmField>
          <HrmField label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </HrmField>
          {mode === "clock_in" ? (
            <HrmField label="Clock-in time" hint="Active hours are calculated from this time until now.">
              <TimePicker12h value={time} onChange={setTime} />
            </HrmField>
          ) : (
            <HrmField label="Total active hours">
              <Input
                type="number"
                min={0}
                step={0.1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </HrmField>
          )}
          <HrmField label="Reason (required)">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </HrmField>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode(mode === "clock_in" ? "clock_out" : "clock_in")}
          >
            Switch to {mode === "clock_in" ? "clock out" : "clock in"}
          </Button>
          <Button
            className={portalActionButtonClass()}
            onClick={() => void handleSubmit()}
            disabled={adminOverride.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
