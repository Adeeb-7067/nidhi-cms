import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Parse "HH:mm" (24h) into 12h parts. */
function parse24h(value: string) {
  const [hRaw, mRaw] = value.split(":");
  const h24 = Number(hRaw);
  const minute = Number(mRaw);
  if (!Number.isFinite(h24) || !Number.isFinite(minute)) {
    return { hour12: 12, minute: 0, period: "AM" as const };
  }
  const period = h24 >= 12 ? ("PM" as const) : ("AM" as const);
  const hour12 = h24 % 12 || 12;
  return { hour12, minute, period };
}

/** Format 12h parts to "HH:mm" (24h). */
function to24h(hour12: number, minute: number, period: "AM" | "PM") {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/**
 * 12-hour time picker. Value/onChange use 24h "HH:mm" strings for API compatibility.
 */
export function TimePicker12h({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const { hour12, minute, period } = useMemo(() => parse24h(value || "09:00"), [value]);

  const update = (next: Partial<{ hour12: number; minute: number; period: "AM" | "PM" }>) => {
    onChange(
      to24h(
        next.hour12 ?? hour12,
        next.minute ?? minute,
        next.period ?? period,
      ),
    );
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={String(hour12)}
        onValueChange={(v) => update({ hour12: Number(v) })}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">:</span>
      <Select
        value={String(minute)}
        onValueChange={(v) => update({ minute: Number(v) })}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        onValueChange={(v) => update({ period: v as "AM" | "PM" })}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[76px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
