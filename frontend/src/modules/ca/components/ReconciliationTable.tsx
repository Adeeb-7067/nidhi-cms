import { useMemo } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Badge } from "@/components/ui/badge";
import type { BankTransaction } from "../types";
import { formatCurrency, PAYMENT_MODE_LABELS, BANK_DIRECTION_LABELS, RECONCILIATION_LABELS } from "../constants";
import { CaRefLink } from "./CaRefLink";
import { CaRowActions } from "./CaRowActions";
import { financePaymentHref, financePaymentsListHref } from "../routes";

const reconStyles = {
  matched: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  unmatched: "bg-red-500/10 text-red-600 border-red-500/25",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/25",
};

type ReconRow = BankTransaction & { financeSource?: "finance" | "sales" };

export function ReconciliationTable({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: ReconRow[];
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const columns = useMemo((): CmsColumn<ReconRow>[] => [
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
      cell: (t) => (
        <CaRefLink href={financePaymentHref(t.id, t.financeSource ?? "finance")} className="max-w-[140px] truncate block">
          {t.party}
        </CaRefLink>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      cell: (t) => (
        <CaRefLink href={financePaymentHref(t.id, t.financeSource ?? "finance")} mono>
          {t.reference}
        </CaRefLink>
      ),
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
    {
      id: "actions",
      header: "",
      cell: (t) => {
        const href = financePaymentHref(t.id, t.financeSource ?? "finance");
        return (
          <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
            {t.reconciliationStatus === "unmatched" || t.reconciliationStatus === "partial" ? (
              <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                <Link href={href}>Match in Finance</Link>
              </Button>
            ) : null}
            <CaRowActions
              canView
              canEdit
              canDelete={false}
              onView={() => {
                window.location.href = href;
              }}
              onEdit={() => {
                window.location.href = href;
              }}
            />
          </div>
        );
      },
    },
  ], []);

  return (
    <CmsDataTable
      columns={columns}
      rows={rows}
      rowKey={(t) => t.id}
      embedded
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      onRowClick={(t) => {
        window.location.href = financePaymentHref(t.id, t.financeSource ?? "finance");
      }}
      empty={{
        title: "No transactions to reconcile",
        description: "Payments from Finance appear here. Unmatched rows need a party link in Finance.",
        actionLabel: "Open Finance payments",
        onAction: () => {
          window.location.href = financePaymentsListHref();
        },
      }}
    />
  );
}
