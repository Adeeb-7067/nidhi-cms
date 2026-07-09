import { cn } from "@/lib/utils";
import type { FinanceLedgerSource } from "@/api/finance";

export function FinanceSourceBadge({ source = "finance" }: { source?: FinanceLedgerSource }) {
  const isSales = source === "sales";
  return (
    <span
      className={cn(
        "inline-flex text-[10px] rounded px-1.5 py-0.5 font-medium shrink-0",
        isSales
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-violet-500/10 text-violet-700 dark:text-violet-400",
      )}
    >
      {isSales ? "Sales" : "Finance"}
    </span>
  );
}
