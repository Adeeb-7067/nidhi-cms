import { useEffect, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const decimalInputClass =
  "tabular-nums text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const INTEGER_PATTERN = /^-?\d*$/;
const DECIMAL_PATTERN = /^-?\d*\.?\d*$/;

function formatValue(value: number, integer: boolean, hideZero: boolean): string {
  if (hideZero && value === 0) return "";
  if (integer) return String(Math.round(value));
  return String(value);
}

function parseDraft(raw: string, integer: boolean): number | null {
  if (raw === "" || raw === "-" || raw === ".") return null;
  const num = integer ? Number.parseInt(raw, 10) : Number(raw);
  return Number.isFinite(num) ? num : null;
}

function clampValue(value: number, min?: number, max?: number): number {
  let next = value;
  if (min != null) next = Math.max(min, next);
  if (max != null) next = Math.min(max, next);
  return next;
}

export interface DecimalInputProps
  extends Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange" | "inputMode"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  /** Used when the field is cleared on blur. */
  fallback?: number;
  /** Show blank instead of 0 when unfocused. */
  hideZero?: boolean;
}

export function DecimalInput({
  value,
  onChange,
  min,
  max,
  integer = false,
  fallback = 0,
  hideZero = true,
  className,
  placeholder = "0",
  onFocus,
  onBlur,
  ...props
}: DecimalInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatValue(value, integer, hideZero));

  useEffect(() => {
    if (!focused) {
      setDraft(formatValue(value, integer, hideZero));
    }
  }, [value, focused, integer, hideZero]);

  const pattern = integer ? INTEGER_PATTERN : DECIMAL_PATTERN;

  return (
    <Input
      {...props}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      placeholder={placeholder}
      className={cn(decimalInputClass, className)}
      value={focused ? draft : formatValue(value, integer, hideZero)}
      onFocus={(e) => {
        setFocused(true);
        setDraft(formatValue(value, integer, hideZero));
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!pattern.test(raw)) return;
        setDraft(raw);
        const parsed = parseDraft(raw, integer);
        if (parsed != null) {
          onChange(clampValue(parsed, min, max));
        }
      }}
      onBlur={(e) => {
        setFocused(false);
        const parsed = parseDraft(draft, integer);
        const next = clampValue(parsed ?? fallback, min, max);
        onChange(next);
        setDraft(formatValue(next, integer, hideZero));
        onBlur?.(e);
      }}
    />
  );
}
