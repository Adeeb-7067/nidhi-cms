import { useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, KeyRound, UserPlus, Wallet, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import {
  formatCurrency,
  PAYMENT_MODE_LABELS,
  SUBSCRIPTION_BILLING_LABELS,
} from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  FinanceStatusBadge,
  AssignSeatModal,
  SubscriptionPaymentModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceDetailPageSkeleton } from "@/components/loading";
import { useGetSubscription, useRevokeSubscriptionSeat } from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

export default function SubscriptionDetailPage() {
  const [, params] = useRoute("/finance/subscriptions/:id");
  const subscriptionId = Number(params?.id);
  const { data: sub, isLoading, isError, refetch } = useGetSubscription(subscriptionId);
  const [assignOpen, setAssignOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const revokeSeat = useRevokeSubscriptionSeat();
  const { can } = usePermissions();
  const canEdit = can("finance_subscriptions", "edit");
  const canPay =
    can("finance_subscriptions", "create") || can("finance_expenses", "create");

  if (isLoading) return <FinanceDetailPageSkeleton />;

  if (isError || !sub) {
    return (
      <PortalPageShell>
        <FinanceEmptyState
          title="Subscription not found"
          description={`No subscription #${subscriptionId}.`}
          actionLabel="Back to subscriptions"
          onAction={() => { window.location.href = "/finance/subscriptions"; }}
        />
      </PortalPageShell>
    );
  }

  const activeSeats = sub.assignments.filter((a) => a.isActive);
  const expenses = sub.expenses ?? [];

  const seatColumns: CmsColumn<(typeof activeSeats)[number]>[] = [
    {
      id: "employee",
      header: "Employee",
      cell: (a) => <span className="font-medium">{a.employeeName ?? `#${a.employeeId}`}</span>,
    },
    {
      id: "email",
      header: "Seat email",
      cell: (a) => <span className="text-muted-foreground">{a.seatEmail ?? "—"}</span>,
    },
    {
      id: "since",
      header: "Since",
      cell: (a) => (
        <span className="text-muted-foreground">{format(new Date(a.assignedAt), "MMM d, yyyy")}</span>
      ),
    },
    ...(canEdit
      ? [
          {
            id: "actions",
            header: "Actions",
            align: "right" as const,
            cell: (a: (typeof activeSeats)[number]) => (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive"
                onClick={() => setRevokeId(a.id)}
              >
                <UserMinus className="h-3.5 w-3.5" />
                Revoke
              </Button>
            ),
          } satisfies CmsColumn<(typeof activeSeats)[number]>,
        ]
      : []),
  ];

  const expenseColumns: CmsColumn<(typeof expenses)[number]>[] = [
    {
      id: "date",
      header: "Date",
      cell: (e) => format(new Date(e.date), "MMM d, yyyy"),
    },
    {
      id: "expense",
      header: "Expense",
      cell: (e) => (
        <>
          <Link href="/finance/expenses" className="font-mono hover:text-primary">
            {e.reference}
          </Link>
          <div className="text-[10px] text-muted-foreground">{PAYMENT_MODE_LABELS[e.paymentMode]}</div>
        </>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (e) => <span className="tabular-nums font-medium">{formatCurrency(e.amount)}</span>,
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (e) => <FinanceStatusBadge variant="expense" value={e.status} />,
    },
  ];

  const handleRevoke = async () => {
    if (revokeId == null) return;
    try {
      await revokeSeat.mutateAsync({ id: sub.id, assignmentId: revokeId });
      toast.success("Seat revoked");
      setRevokeId(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to revoke seat");
    }
  };

  return (
    <PortalPageShell>
      <FinancePageHeader
        title={sub.name}
        description={`${sub.reference}${sub.vendorName ? ` · ${sub.vendorName}` : ""}`}
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Subscriptions", href: "/finance/subscriptions" },
          { label: sub.reference },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/finance/subscriptions">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            {canEdit && sub.status === "active" && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setAssignOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Assign seat
              </Button>
            )}
            {canPay && sub.status === "active" && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setPayOpen(true)}>
                <Wallet className="h-3.5 w-3.5" />
                Record payment
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <FinanceStatusBadge variant="subscription" value={sub.status} />
        <span>{SUBSCRIPTION_BILLING_LABELS[sub.billingCycle]}</span>
        {sub.plan && <span>· {sub.plan}</span>}
        {sub.renewalDate && (
          <span>· Renews {format(new Date(sub.renewalDate), "MMM d, yyyy")}</span>
        )}
        {sub.purchaseEmail && <span>· Bought with {sub.purchaseEmail}</span>}
      </div>

      <PortalKpiGrid
        columns={3}
        items={[
          {
            title: "Seats",
            value: `${sub.seatsUsed} / ${sub.seatsPurchased}`,
            icon: KeyRound,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Available",
            value: sub.seatsAvailable,
            icon: UserPlus,
            accent: sub.seatsAvailable > 0 ? "green" : "amber",
            delay: 1,
          },
          {
            title: "Cost / cycle",
            value: formatCurrency(sub.costAmount),
            icon: Wallet,
            accent: "violet",
            delay: 2,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Assigned seats</CardTitle>
            {canEdit && sub.status === "active" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAssignOpen(true)}>
                Assign
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {activeSeats.length === 0 ? (
              <FinanceEmptyState
                icon={KeyRound}
                title="No seats assigned"
                description="Assign this tool to an employee."
                actionLabel={canEdit && sub.status === "active" ? "Assign seat" : undefined}
                onAction={canEdit && sub.status === "active" ? () => setAssignOpen(true) : undefined}
                className="py-10"
              />
            ) : (
              <CmsDataTable columns={seatColumns} rows={activeSeats} rowKey={(a) => a.id} embedded />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Payment history</CardTitle>
            {canPay && sub.status === "active" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <FinanceEmptyState
                icon={Wallet}
                title="No payments yet"
                description="When you pay Cursor/Claude, record it here — it lands in Expenses."
                actionLabel={canPay && sub.status === "active" ? "Record payment" : undefined}
                onAction={canPay && sub.status === "active" ? () => setPayOpen(true) : undefined}
                className="py-10"
              />
            ) : (
              <CmsDataTable columns={expenseColumns} rows={expenses} rowKey={(e) => e.id} embedded />
            )}
          </CardContent>
        </Card>
      </div>

      {sub.notes && (
        <Card>
          <CardContent className="py-3 text-xs text-muted-foreground">{sub.notes}</CardContent>
        </Card>
      )}

      <AssignSeatModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        subscription={sub}
        onSuccess={() => refetch()}
      />
      <SubscriptionPaymentModal
        open={payOpen}
        onOpenChange={setPayOpen}
        subscription={sub}
        onSuccess={() => refetch()}
      />
      <FinanceConfirmDialog
        open={revokeId != null}
        onOpenChange={(open) => { if (!open) setRevokeId(null); }}
        title="Revoke seat?"
        description="The employee will no longer count against this subscription. You can reassign later."
        confirmLabel="Revoke"
        loading={revokeSeat.isPending}
        onConfirm={handleRevoke}
      />
    </PortalPageShell>
  );
}
