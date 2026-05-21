import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DataViewMode } from "@/lib/data-view";
import { cn } from "@/lib/utils";

type DataViewToggleProps = {
  value: DataViewMode;
  onChange: (mode: DataViewMode) => void;
  className?: string;
};

const toggleItemClass =
  "h-8 w-8 p-0 shrink-0 border-0 shadow-none " +
  "text-muted-foreground [&_svg]:text-current " +
  "hover:bg-muted hover:text-foreground " +
  "data-[state=on]:!bg-primary data-[state=on]:!text-primary-foreground " +
  "data-[state=on]:hover:!bg-primary/90 data-[state=on]:hover:!text-primary-foreground";

export function DataViewToggle({ value, onChange, className }: DataViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v === "table" || v === "grid") onChange(v);
      }}
      className={cn(
        "border border-border rounded-md p-0.5 bg-muted/50 shadow-sm",
        className,
      )}
    >
      <ToggleGroupItem value="table" aria-label="Table view" className={toggleItemClass}>
        <List className="h-4 w-4" strokeWidth={2} aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="grid" aria-label="Grid view" className={toggleItemClass}>
        <LayoutGrid className="h-4 w-4" strokeWidth={2} aria-hidden />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
