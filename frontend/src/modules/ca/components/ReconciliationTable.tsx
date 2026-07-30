import { useMemo } from "react";
import { format } from "date-fns";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Badge } from "@/components/ui/badge";
import {
  FinanceSourceBadge,
  FinanceStatusBadge,
  GstClassificationBadge,
} from "@/modules/finance/components";
import { formatCurrency, BANK_DIRECTION_LABELS, RECONCILIATION_LABELS } from "../constants";
import type { CaBankTxn } from "../adapters/finance";
import { PARTY_TYPE_LABELS } from "../adapters/finance";
import { CaRefLink } from "./CaRefLink";
import { CaRowActions } from "./CaRowActions";
import { financePaymentHref, financePaymentsListHref } from "../routes";

const reconStyles = {
  matched: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  unmatched: "bg-red-500/10 text-red-600 border-red-500/25",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/25",
};

export function ReconciliationTable({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: CaBankTxn[];
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const columns = useMemo((): CmsColumn<CaBankTxn>[] => [
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
      id: "source",
      header: "Source",
      chip: true,
      cell: (t) => <FinanceSourceBadge source={t.financeSource} />,
    },
    {
      id: "mode",
      header: "Mode",
      cell: (t) => t.modeLabel ?? t.mode,
    },
    {
      id: "party",
      header: "Party",
      cell: (t) => (
        <div className="max-w-[150px]">
          <CaRefLink href={financePaymentHref(t.id, t.financeSource ?? "finance")} className="truncate block font-medium">
            {t.party}
          </CaRefLink>
          {t.partyType ? (
            <div className="text-[10px] text-muted-foreground">
              {PARTY_TYPE_LABELS[t.partyType] ?? t.partyType}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      cell: (t) => (
        <div className="space-y-0.5">
          <CaRefLink href={financePaymentHref(t.id, t.financeSource ?? "finance")} mono>
            {t.reference}
          </CaRefLink>
          {t.receiptNumber && t.receiptNumber !== t.reference ? (
            <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
              {t.receiptNumber}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "linked",
      header: "Linked to",
      className: "max-w-[140px]",
      cell: (t) => {
        const links = t.linkedDocs ?? [];
        if (!links.length) return <span className="text-muted-foreground text-xs">—</span>;
        const first = links[0];
        return first.href ? (
          <CaRefLink href={first.href} className="text-xs truncate block">
            {first.label}
          </CaRefLink>
        ) : (
          <span className="text-xs">{first.label}</span>
        );
      },
    },
    {
      id: "gst",
      header: "GST",
      chip: true,
      cell: (t) =>
        t.direction === "incoming" ? (
          <GstClassificationBadge gstEnabled={t.gstEnabled} />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (t) => (
        <span
          className={`font-medium tabular-nums ${
            t.direction === "incoming"
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-700 dark:text-red-400"
          }`}
        >
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      id: "payStatus",
      header: "Pay status",
      chip: true,
      cell: (t) =>
        t.status ? (
          <FinanceStatusBadge variant="payment" value={t.status} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: "Recon",
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
        const needsReview =
          t.reconciliationStatus === "unmatched" || t.reconciliationStatus === "partial";
        return (
          <CaRowActions
            label="Payment actions"
            viewHref={href}
            items={[
              {
                label: "Review in Finance",
                href,
                hidden: !needsReview,
              },
            ]}
          />
        );
      },
    },
  ], []);

  return (
    <CmsDataTable
      columns={columns}
      rows={rows}
      rowKey={(t) => `${t.financeSource ?? "finance"}-${t.id}`}
      embedded
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      onRowClick={(t) => {
        window.location.href = financePaymentHref(t.id, t.financeSource ?? "finance");
      }}
      empty={{
        title: "No transactions to reconcile",
        description: "Payments from Finance appear here. Unmatched rows need a party or document link in Finance.",
        actionLabel: "Open Finance payments",
        onAction: () => {
          window.location.href = financePaymentsListHref();
        },
      }}
    />
  );
}
