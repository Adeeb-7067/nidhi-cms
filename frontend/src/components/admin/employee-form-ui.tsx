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
