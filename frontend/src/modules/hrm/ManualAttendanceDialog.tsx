import { useEffect, useMemo, useState } from "react";
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

function parseTimeToMinutes(t: string): number | null {
  const parts = t.split(":").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return parts[0] * 60 + parts[1];
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
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState(format(new Date(), "HH:mm"));
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setClockOut(format(new Date(), "HH:mm"));
    }
  }, [open, defaultMode]);

  const activeMinutes = useMemo(() => {
    const inMin = parseTimeToMinutes(clockIn);
    const outMin = parseTimeToMinutes(clockOut);
    if (inMin == null || outMin == null) return 0;
    return Math.max(0, outMin - inMin);
  }, [clockIn, clockOut]);

  const activeHours = Math.round((activeMinutes / 60) * 10) / 10;

  const handleSubmit = async () => {
    const uid = Number(userId);
    if (!uid || !date || !reason.trim()) {
      toast.error("Employee, date, and reason are required");
      return;
    }
    if (activeMinutes <= 0) {
      toast.error("Clock-out time must be after clock-in time");
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
      // mutation hook shows error toast
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
          <div className="grid grid-cols-2 gap-3">
            <HrmField label="Clock-in time">
              <TimePicker12h value={clockIn} onChange={setClockIn} />
            </HrmField>
            <HrmField label="Clock-out time">
              <TimePicker12h value={clockOut} onChange={setClockOut} />
            </HrmField>
          </div>
          {activeMinutes > 0 && (
            <p className="text-xs text-muted-foreground">
              Active duration: <span className="font-medium text-foreground">{activeHours} h</span>
            </p>
          )}
          <HrmField label="Reason (required)">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. employee forgot to clock in" />
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
