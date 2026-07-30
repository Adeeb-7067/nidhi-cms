import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrmEmployees, useHrmLeaveBalances, useHrmLeaveTypes } from "@/api/hrm";
import { HrmField, hrmActionButtonClass } from "@/modules/hrm/components";
import { LEGACY_LEAVE_LABELS as L } from "@/modules/hrm/hrm-legacy-labels";
import {
  formatLeaveDayCount,
  getTodayDateKey,
  isLeaveDateInPast,
  resolveLeaveDayPart,
  type HalfDayPartUi,
  type LeaveDurationUi,
} from "@/modules/hrm/leave-form-utils";
import { getLeaveBalanceAvailable } from "@/modules/hrm/employee-profile-types";
import type { HrmLeaveBalance } from "@/modules/hrm/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Employee self-service vs HR/manager applying for someone else. */
  mode: "self" | "admin";
  currentUserId?: number;
  submitting?: boolean;
  onSubmit: (payload: {
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    dayPart: string;
    reason: string;
    userId?: number;
  }) => Promise<void>;
};

function LeaveBalanceSnapshot({
  balances,
  loading,
}: {
  balances: HrmLeaveBalance[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  if (!balances.length) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/60 px-3 py-2">
        No leave balance on file for this year yet — accrual may still be pending.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available balance</p>
      <div className="flex flex-wrap gap-2">
        {balances.map((b) => (
          <span
            key={b.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background px-2.5 py-1 text-xs"
          >
            <span className="text-muted-foreground">{b.leaveType?.name ?? `Type #${b.leaveTypeId}`}</span>
            <span className="font-semibold tabular-nums">{formatLeaveDayCount(getLeaveBalanceAvailable(b))}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ApplyLeaveDialog({
  open,
  onOpenChange,
  mode,
  currentUserId,
  submitting,
  onSubmit,
}: Props) {
  const isAdminMode = mode === "admin";
  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const leaveYear = new Date().getFullYear();

  const { data: typesData } = useHrmLeaveTypes();
  const { data: employeesData, isLoading: employeesLoading } = useHrmEmployees(
    { status: "active", limit: 300 },
    { enabled: open && isAdminMode },
  );

  const [targetUserId, setTargetUserId] = useState("");
  const balanceUserId = isAdminMode
    ? targetUserId
      ? Number(targetUserId)
      : undefined
    : currentUserId;

  const { data: balancesData, isLoading: balancesLoading } = useHrmLeaveBalances(balanceUserId, leaveYear, {
    enabled: open && balanceUserId != null && balanceUserId > 0,
  });

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leaveDuration, setLeaveDuration] = useState<LeaveDurationUi>("full");
  const [halfDayPart, setHalfDayPart] = useState<HalfDayPartUi>("first_half");
  const [startDate, setStartDate] = useState(() => getTodayDateKey());
  const [endDate, setEndDate] = useState(() => getTodayDateKey());
  const [reason, setReason] = useState("");

  const employees = employeesData?.employees ?? [];
  const leaveTypes = typesData?.types ?? [];
  const selectedEmployee = employees.find((e) => String(e.id) === targetUserId);

  const leaveStartInPast = isLeaveDateInPast(startDate);
  const leaveEndInPast =
    leaveDuration === "half" || leaveDuration === "short"
      ? leaveStartInPast
      : isLeaveDateInPast(endDate);

  useEffect(() => {
    if (!open) return;
    const today = getTodayDateKey();
    setStartDate(today);
    setEndDate(today);
    setLeaveTypeId("");
    setLeaveDuration("full");
    setHalfDayPart("first_half");
    setReason("");
    setTargetUserId(isAdminMode ? "" : String(currentUserId ?? ""));
  }, [open, isAdminMode, currentUserId]);

  const handleSubmit = async () => {
    if (isAdminMode && !targetUserId) {
      toast.error("Select an employee");
      return;
    }
    if (!leaveTypeId) {
      toast.error("Please select a leave type");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const isHalfOrShort = leaveDuration === "half" || leaveDuration === "short";
    const effectiveEnd = isHalfOrShort ? startDate : endDate;
    if (isLeaveDateInPast(startDate) || isLeaveDateInPast(effectiveEnd)) {
      toast.error("Leave cannot be applied for past dates");
      return;
    }
    if (effectiveEnd < startDate) {
      toast.error("End date must be on or after start date");
      return;
    }

    const payload = {
      leaveTypeId: Number(leaveTypeId),
      startDate,
      endDate: effectiveEnd,
      dayPart: resolveLeaveDayPart(leaveDuration, halfDayPart),
      reason: reason.trim(),
    };

    if (isAdminMode) {
      await onSubmit({ ...payload, userId: Number(targetUserId) });
      return;
    }
    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isAdminMode ? L.adminDialogTitle : L.dialogTitle}</DialogTitle>
          <DialogDescription>
            {isAdminMode ? L.adminDialogDescription : L.dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isAdminMode ? (
            <HrmField label={L.employee}>
              <Select value={targetUserId || undefined} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={employeesLoading ? "Loading employees…" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                      {e.employeeId ? ` · ${e.employeeId}` : ""}
                      {e.id === currentUserId ? " (you)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrmField>
          ) : null}

          {isAdminMode && selectedEmployee ? (
            <p className="text-xs text-muted-foreground -mt-2">
              Applying for{" "}
              <span className="font-medium text-foreground">{selectedEmployee.name}</span>
              {selectedEmployee.designation ? ` · ${selectedEmployee.designation}` : ""}
            </p>
          ) : null}

          <LeaveBalanceSnapshot
            balances={balancesData?.balances ?? []}
            loading={balancesLoading && (isAdminMode ? !!targetUserId : true)}
          />

          <HrmField label={L.leaveType}>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrmField>
          <HrmField label={L.duration}>
            <Select
              value={leaveDuration}
              onValueChange={(v) => {
                const next = v as LeaveDurationUi;
                setLeaveDuration(next);
                if (next === "half" || next === "short") {
                  setEndDate(startDate);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{L.durationFull}</SelectItem>
                <SelectItem value="half">{L.durationHalf}</SelectItem>
                <SelectItem value="short">{L.durationShort}</SelectItem>
              </SelectContent>
            </Select>
          </HrmField>
          {leaveDuration === "half" && (
            <HrmField label={L.halfDayPart}>
              <Select value={halfDayPart} onValueChange={(v) => setHalfDayPart(v as HalfDayPartUi)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_half">{L.halfFirst}</SelectItem>
                  <SelectItem value="second_half">{L.halfSecond}</SelectItem>
                </SelectContent>
              </Select>
            </HrmField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <HrmField label={L.startDate}>
              <Input
                type="date"
                min={todayDateKey}
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next && isLeaveDateInPast(next)) {
                    toast.error("Leave cannot be applied for past dates");
                    return;
                  }
                  setStartDate(next);
                  if (leaveDuration === "half" || leaveDuration === "short") {
                    setEndDate(next);
                  } else if (endDate < next) {
                    setEndDate(next);
                  }
                }}
              />
            </HrmField>
            <HrmField label={L.endDate}>
              <Input
                type="date"
                min={todayDateKey}
                value={leaveDuration === "half" || leaveDuration === "short" ? startDate : endDate}
                disabled={leaveDuration === "half" || leaveDuration === "short"}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next && isLeaveDateInPast(next)) {
                    toast.error("Leave cannot be applied for past dates");
                    return;
                  }
                  setEndDate(next);
                }}
              />
            </HrmField>
          </div>
          <HrmField label={L.reason}>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAdminMode ? "Reason noted on the employee record" : "Brief reason for your leave"}
              rows={3}
            />
          </HrmField>
        </div>
        <DialogFooter>
          <Button
            className={hrmActionButtonClass()}
            onClick={() => void handleSubmit()}
            disabled={
              (isAdminMode && !targetUserId) ||
              !leaveTypeId ||
              !reason.trim() ||
              leaveStartInPast ||
              leaveEndInPast ||
              submitting
            }
          >
            {isAdminMode ? L.adminSubmit : L.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
