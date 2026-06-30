import * as React from "react";
import { Input } from "@/components/ui/input";
import { PHONE_NUMBER_LENGTH, sanitizePhoneDigits } from "@/lib/phone-input";
import { cn } from "@/lib/utils";

export type PhoneInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "inputMode" | "maxLength">;

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, placeholder = "9876543210", ...props }, ref) => {
    const displayValue =
      typeof value === "string" || typeof value === "number"
        ? sanitizePhoneDigits(String(value))
        : "";

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={PHONE_NUMBER_LENGTH}
        placeholder={placeholder}
        className={cn(className)}
        value={displayValue}
        onChange={(e) => {
          const next = sanitizePhoneDigits(e.target.value);
          e.target.value = next;
          onChange?.(e);
        }}
        {...props}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";
