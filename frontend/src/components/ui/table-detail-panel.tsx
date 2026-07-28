import type { Column } from "./advanced-table";
import { cn } from "@/lib/utils";

function formatDetailValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function getColumnDetailContent<T>(col: Column<T>, item: T): React.ReactNode {
  if (col.detailCell) return col.detailCell(item);
  if (col.cell) return col.cell(item);
  if (col.accessorKey) {
    return (
      <span className="whitespace-pre-wrap break-words">
        {formatDetailValue(item[col.accessorKey])}
      </span>
    );
  }
  return "—";
}

type TableDetailPanelProps<T> = {
  item: T;
  columns: Column<T>[];
  className?: string;
};

/** Full-field detail strip for table expand rows */
export function TableDetailPanel<T>({ item, columns, className }: TableDetailPanelProps<T>) {
  const detailCols = columns.filter((c) => c.id !== "actions" && !c.hideInDetail);

  if (detailCols.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-2.5 px-3 py-2.5 sm:grid-cols-2 xl:grid-cols-3",
        "border-t border-border/50 bg-muted/20",
        className,
      )}
    >
      {detailCols.map((col) => (
        <div key={col.id} className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {col.header}
          </p>
          <div className="text-xs leading-snug text-foreground">
            {getColumnDetailContent(col, item)}
          </div>
        </div>
      ))}
    </div>
  );
}
