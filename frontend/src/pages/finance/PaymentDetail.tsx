import { format } from "date-fns";
import { Link, useRoute } from "wouter";
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceStatusBadge,
  FinanceSourceBadge,
  FinanceErrorState,
} from "@/modules/finance/components";
import { useGetPayment, type FinanceLedgerSource } from "@/api/finance";

export default function FinancePaymentDetail() {
  const [, params] = useRoute("/finance/payments/:source/:id");
  const source = (params?.source === "sales" ? "sales" : "finance") as FinanceLedgerSource;
  const id = Number(params?.id);

  const { data: payment, isLoading, isError, refetch } = useGetPayment(source, id, Number.isFinite(id));

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full mt-4" />
      </PortalPageShell>
    );
  }

  if (isError || !payment) {
    return (
      <PortalPageShell>
        <FinanceErrorState message="Could not load payment details." onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const salesHref = payment.salesReceiptHref ?? (source === "sales" ? `/sales/receipts/${payment.id}` : null);

  return (
    <PortalPageShell>
      <FinancePageHeader
        title={payment.receiptNumber || payment.reference}
        description={`${payment.direction === "incoming" ? "Incoming" : "Outgoing"} payment`}
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Payments", href: "/finance/payments" },
          { label: payment.receiptNumber || payment.reference },
        ]}
        actions={
          salesHref ? (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link href={salesHref}>
                <ExternalLink className="h-3.5 w-3.5" />
                View sales receipt
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-xl border bg-card p-5 space-y-4 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <FinanceSourceBadge source={source} />
          <FinanceStatusBadge variant="payment" value={payment.status} />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {payment.direction === "incoming" ? (
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            )}
            {payment.direction}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className={`text-xl font-bold tabular-nums ${payment.direction === "incoming" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              {payment.direction === "incoming" ? "+" : "−"}
              {formatCurrency(payment.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{format(new Date(payment.date), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Party</p>
            <p className="font-medium">{payment.partyName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment mode</p>
            <p className="font-medium">{PAYMENT_MODE_LABELS[payment.mode]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reference</p>
            <p className="font-mono text-xs">{payment.reference}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receipt #</p>
            <p className="font-mono text-xs">{payment.receiptNumber}</p>
          </div>
          {payment.recordedByName ? (
            <div>
              <p className="text-xs text-muted-foreground">Recorded by</p>
              <p className="font-medium">{payment.recordedByName}</p>
            </div>
          ) : null}
        </div>
      </div>
    </PortalPageShell>
  );
}
