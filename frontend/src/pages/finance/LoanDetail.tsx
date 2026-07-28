import { useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  HandCoins,
  Percent,
  Wallet,
  PiggyBank,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { formatCurrency, PAYMENT_MODE_LABELS, LOAN_SOURCE_LABELS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  FinanceStatusBadge,
  PayLoanInstallmentModal,
} from "@/modules/finance/components";
import { FinanceDetailPageSkeleton } from "@/components/loading";
import { useGetLoan } from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { cn } from "@/lib/utils";

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

export default function LoanDetailPage() {
  const [, params] = useRoute("/finance/loans/:id");
  const loanId = Number(params?.id);
  const { data: loan, isLoading, isError, refetch } = useGetLoan(loanId);
  const [payOpen, setPayOpen] = useState(false);
  const { can } = usePermissions();
  const canPay =
    can("finance_loans", "create") || can("finance_expenses", "create");

  if (isLoading) {
    return <FinanceDetailPageSkeleton />;
  }

  if (isError || !loan) {
    return (
      <PortalPageShell>
        <FinanceEmptyState
          title="Loan not found"
          description={`No loan #${loanId}.`}
          actionLabel="Back to loans"
          onAction={() => { window.location.href = "/finance/loans"; }}
        />
      </PortalPageShell>
    );
  }

  const principalPaid = loan.totalPrincipalPaid ?? loan.paidAmount ?? 0;
  const interestPaid = loan.totalInterestPaid ?? 0;
  const cashPaid = loan.totalCashPaid ?? principalPaid + interestPaid;
  const remaining = loan.remainingPrincipal ?? loan.remainingAmount ?? 0;
  const progress = pct(principalPaid, loan.principal);
  const payments = loan.payments ?? [];

  const paymentColumns: CmsColumn<(typeof payments)[number]>[] = [
    {
      id: "date",
      header: "Date",
      cell: (p) => format(new Date(p.date), "MMM d, yyyy"),
    },
    {
      id: "expense",
      header: "Expense",
      cell: (p) => (
        <>
          <Link href="/finance/expenses" className="font-mono hover:text-primary">
            {p.reference}
          </Link>
          {p.notes ? (
            <div className="text-[10px] text-muted-foreground truncate max-w-[160px]" title={p.notes}>
              {p.notes}
            </div>
          ) : null}
        </>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (p) => <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>,
    },
    {
      id: "principal",
      header: "Principal",
      align: "right",
      cell: (p) =>
        p.principalPortion != null ? (
          p.loanAllocation === "interest" ||
          (p.principalPortion === 0 && p.interestPortion != null && p.interestPortion > 0) ? (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
              Interest only
            </span>
          ) : (
            <span className="tabular-nums text-emerald-700">{formatCurrency(p.principalPortion)}</span>
          )
        ) : (
          "—"
        ),
    },
    {
      id: "interest",
      header: "Interest",
      align: "right",
      cell: (p) =>
        p.interestPortion != null ? (
          p.loanAllocation === "principal" ||
          (p.interestPortion === 0 && p.principalPortion != null && p.principalPortion > 0) ? (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
              Principal only
            </span>
          ) : (
            <span className="tabular-nums text-amber-700">{formatCurrency(p.interestPortion)}</span>
          )
        ) : (
          "—"
        ),
    },
    {
      id: "balance",
      header: "Balance after",
      align: "right",
      cell: (p) => (
        <span
          className={cn(
            "tabular-nums",
            p.outstandingAfter === 0 ? "text-emerald-700" : "text-muted-foreground",
          )}
        >
          {p.outstandingAfter != null ? formatCurrency(p.outstandingAfter) : "—"}
        </span>
      ),
    },
    { id: "mode", header: "Mode", cell: (p) => PAYMENT_MODE_LABELS[p.paymentMode] },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (p) => <FinanceStatusBadge variant="expense" value={p.status} />,
    },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title={loan.name}
        description={`${loan.reference} · ${loan.lender} · ${LOAN_SOURCE_LABELS[loan.source ?? "bank"] ?? "Bank"}`}
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Loans", href: "/finance/loans" },
          { label: loan.reference },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/finance/loans">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            {canPay && loan.status === "active" && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setPayOpen(true)}>
                <Wallet className="h-3.5 w-3.5" />
                Pay installment
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <FinanceStatusBadge variant="loan" value={loan.status} />
        <span>{LOAN_SOURCE_LABELS[loan.source ?? "bank"] ?? "Bank"} loan</span>
        <span>
          {format(new Date(loan.startDate), "MMM d, yyyy")}
          {loan.endDate ? ` → ${format(new Date(loan.endDate), "MMM d, yyyy")}` : ""}
        </span>
        {loan.interestRate != null && <span>· {loan.interestRate}% / month</span>}
        {loan.tenureMonths != null && <span>· {loan.tenureMonths} months</span>}
        {loan.emiAmount != null && <span>· EMI {formatCurrency(loan.emiAmount)}</span>}
      </div>

      <PortalKpiGrid
        columns={4}
        items={[
          {
            title: "Principal",
            value: formatCurrency(loan.principal),
            icon: PiggyBank,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Principal paid",
            value: formatCurrency(principalPaid),
            icon: HandCoins,
            accent: "green",
            delay: 1,
          },
          {
            title: "Interest paid",
            value: formatCurrency(interestPaid),
            icon: Percent,
            accent: "amber",
            delay: 2,
          },
          {
            title: "Remaining principal",
            value: formatCurrency(remaining),
            icon: CircleDollarSign,
            accent: remaining > 0 ? "red" : "green",
            delay: 3,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Repayment overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <div className="mb-1 flex justify-between text-muted-foreground">
                <span>Principal progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <dl className="space-y-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Total cash paid</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(cashPaid)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Toward principal</dt>
                <dd className="font-medium tabular-nums text-emerald-700">{formatCurrency(principalPaid)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Toward interest</dt>
                <dd className="font-medium tabular-nums text-amber-700">{formatCurrency(interestPaid)}</dd>
              </div>
              {loan.estimatedTotalInterest != null && (
                <div className="flex justify-between gap-2 border-t pt-2">
                  <dt className="text-muted-foreground">Est. interest (full EMI schedule)</dt>
                  <dd className="tabular-nums">{formatCurrency(loan.estimatedTotalInterest)}</dd>
                </div>
              )}
              {loan.estimatedTotalPayable != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Est. total payable (full schedule)</dt>
                  <dd className="tabular-nums">{formatCurrency(loan.estimatedTotalPayable)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t pt-2">
                <dt className="text-muted-foreground">Installments paid</dt>
                <dd>{loan.installmentsPaid ?? 0}</dd>
              </div>
              {(loan.installmentsPending ?? 0) > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Pending approval</dt>
                  <dd className="text-amber-700">{loan.installmentsPending}</dd>
                </div>
              )}
            </dl>
            {loan.notes && (
              <p className="rounded-md border bg-muted/30 p-2 text-muted-foreground">{loan.notes}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Installment history</CardTitle>
            {canPay && loan.status === "active" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayOpen(true)}>
                Pay installment
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <FinanceEmptyState
                icon={Wallet}
                title="No installments yet"
                description="Record a payment — it will appear here and under Expenses."
                actionLabel={canPay && loan.status === "active" ? "Pay installment" : undefined}
                onAction={canPay && loan.status === "active" ? () => setPayOpen(true) : undefined}
              />
            ) : (
              <CmsDataTable
                columns={paymentColumns}
                rows={payments}
                rowKey={(p) => p.id}
                embedded
              />
            )}
          </CardContent>
        </Card>
      </div>

      <PayLoanInstallmentModal
        open={payOpen}
        onOpenChange={setPayOpen}
        loan={loan}
        onSuccess={() => { refetch(); }}
      />
    </PortalPageShell>
  );
}
