import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const employeeFormInputClass = "h-9 text-sm";
export const employeeFormSelectTriggerClass = "h-9 text-sm";

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
        {description ? <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>{children}</div>;
}

export function FormFieldHint({ children }: { children: ReactNode }) {
  return <p className="text-[10px] leading-relaxed text-muted-foreground">{children}</p>;
}

import React from "react";
import { ChevronDown } from "lucide-react";

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, options, placeholder, value, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          value={value ?? ""}
          className={cn(
            "flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 opacity-50" />
      </div>
    );
  }
);
NativeSelect.displayName = "NativeSelect";
