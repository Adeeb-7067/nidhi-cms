import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { BankTransaction } from "../types";
import { formatCurrency, PAYMENT_MODE_LABELS, BANK_DIRECTION_LABELS, RECONCILIATION_LABELS } from "../constants";

const reconStyles = {
  matched: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  unmatched: "bg-red-500/10 text-red-600 border-red-500/25",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/25",
};

export function ReconciliationTable({ rows }: { rows: BankTransaction[] }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Direction</TableHead>
            <TableHead className="text-xs">Mode</TableHead>
            <TableHead className="text-xs">Party</TableHead>
            <TableHead className="text-xs">Reference</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead>
            <TableHead className="text-xs">Bank ref</TableHead>
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id} className="hover:bg-muted/30">
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(t.date), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Badge variant={t.direction === "incoming" ? "default" : "secondary"} className="text-[10px]">
                  {BANK_DIRECTION_LABELS[t.direction]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{PAYMENT_MODE_LABELS[t.mode]}</TableCell>
              <TableCell className="text-xs font-medium max-w-[140px] truncate">{t.party}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">{t.reference}</TableCell>
              <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(t.amount)}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate">{t.bankRef}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${reconStyles[t.reconciliationStatus]}`}
                >
                  {RECONCILIATION_LABELS[t.reconciliationStatus]}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
