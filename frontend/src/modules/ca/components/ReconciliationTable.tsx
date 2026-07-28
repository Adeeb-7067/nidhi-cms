import { useMemo } from "react";
import { format } from "date-fns";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Badge } from "@/components/ui/badge";
import type { BankTransaction } from "../types";
import { formatCurrency, PAYMENT_MODE_LABELS, BANK_DIRECTION_LABELS, RECONCILIATION_LABELS } from "../constants";

const reconStyles = {
  matched: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  unmatched: "bg-red-500/10 text-red-600 border-red-500/25",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/25",
};

export function ReconciliationTable({ rows }: { rows: BankTransaction[] }) {
  const columns = useMemo((): CmsColumn<BankTransaction>[] => [
    {
      id: "date",
      header: "Date",
      cell: (t) => (
        <span className="text-muted-foreground">{format(new Date(t.date), "MMM d, yyyy")}</span>
      ),
    },
    {
      id: "direction",
      header: "Direction",
      chip: true,
      cell: (t) => (
        <Badge variant={t.direction === "incoming" ? "default" : "secondary"} className="text-[10px]">
          {BANK_DIRECTION_LABELS[t.direction]}
        </Badge>
      ),
    },
    {
      id: "mode",
      header: "Mode",
      cell: (t) => PAYMENT_MODE_LABELS[t.mode],
    },
    {
      id: "party",
      header: "Party",
      cell: (t) => <span className="font-medium max-w-[140px] truncate block">{t.party}</span>,
    },
    {
      id: "reference",
      header: "Reference",
      cell: (t) => <span className="font-mono text-muted-foreground">{t.reference}</span>,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (t) => <span className="font-medium tabular-nums">{formatCurrency(t.amount)}</span>,
    },
    {
      id: "bankRef",
      header: "Bank ref",
      cell: (t) => (
        <span className="font-mono text-muted-foreground max-w-[120px] truncate block">{t.bankRef}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (t) => (
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${reconStyles[t.reconciliationStatus]}`}
        >
          {RECONCILIATION_LABELS[t.reconciliationStatus]}
        </span>
      ),
    },
  ], []);

  return (
    <CmsDataTable
      columns={columns}
      rows={rows}
      rowKey={(t) => t.id}
      embedded
      empty={{ title: "No transactions to reconcile" }}
    />
  );
}
