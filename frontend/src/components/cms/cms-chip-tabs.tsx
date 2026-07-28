import { cn } from "@/lib/utils";

export type CmsChipTab = {
  value: string;
  label: string;
  count?: number;
};

/**
 * Status / stage filter chips used across CMS list pages.
 * Presentational only (no Tabs root) so it can sit beside a content Tabs
 * without nesting Radix tab trees.
 */
export function CmsChipTabs({
  value,
  onValueChange,
  items,
  className,
  "aria-label": ariaLabel = "Filters",
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: CmsChipTab[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center justify-start gap-1.5", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "group inline-flex h-9 min-h-9 items-center rounded-full border border-transparent px-3 text-xs font-medium text-muted-foreground transition-colors",
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active &&
                "border-primary/25 bg-primary/10 text-primary shadow-none",
            )}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  "ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-muted/80 px-1.5 py-0 text-[11px] font-semibold tabular-nums text-foreground/80",
                  active && "bg-primary/15",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
