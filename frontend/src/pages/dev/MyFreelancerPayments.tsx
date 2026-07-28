import { useMemo } from "react";
import { IndianRupee, Wallet, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { formatCurrency } from "@/modules/finance/constants";
import { FinancePageHeader, FinanceEmptyState, FinanceErrorState } from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListFreelancerEngagements, type FreelancerEngagement } from "@/api/finance";
import { getProjectDetailHref } from "@/lib/project-routes";

type Installment = FreelancerEngagement["installments"][number];

const installmentColumns: CmsColumn<Installment>[] = [
  { id: "label", header: "Installment", cell: (inst) => inst.label },
  {
    id: "amount",
    header: "Amount",
    cell: (inst) => formatCurrency(inst.amount),
  },
  {
    id: "due",
    header: "Due",
    cell: (inst) => (inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : "—"),
  },
  {
    id: "status",
    header: "Status",
    chip: true,
    cell: (inst) => (
      <CmsStatusChip
        label={inst.status}
        tone={inst.status === "paid" ? "success" : "muted"}
      />
    ),
  },
];

export default function MyFreelancerPaymentsPage() {
  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();

  const engagements = data?.engagements ?? [];
  const kpis = useMemo(() => {
    const agreed = engagements.reduce((s, e) => s + e.agreedAmount, 0);
    const paid = engagements.reduce((s, e) => s + e.paidAmount, 0);
    const remaining = engagements.reduce((s, e) => s + e.remainingAmount, 0);
    return { agreed, paid, remaining };
  }, [engagements]);

  if (isLoading) return <FinanceListPageSkeleton />;
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="My project payments"
        description="Fees and installment status for projects you are hired on"
      />

      <PortalKpiGrid
        items={[
          { title: "Agreed total", value: formatCurrency(kpis.agreed), icon: IndianRupee },
          { title: "Received", value: formatCurrency(kpis.paid), icon: CheckCircle2 },
          { title: "Remaining", value: formatCurrency(kpis.remaining), icon: Wallet },
        ]}
        columns={3}
      />

      {engagements.length === 0 ? (
        <FinanceEmptyState
          title="No payment schedules yet"
          description="When admin sets your project fee, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {engagements.map((e) => (
            <div key={e.id} className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link
                    href={getProjectDetailHref(e.projectId, "freelancer", e.projectType)}
                    className="font-medium hover:text-primary"
                  >
                    {e.projectName ?? `Project #${e.projectId}`}
                  </Link>
                  <p className="text-xs text-muted-foreground capitalize">
                    {e.projectType ?? "project"} · {e.paymentMode.replace("_", " ")}
                  </p>
                </div>
                <CmsStatusChip
                  label={e.paymentStatus.replace("_", " ")}
                  tone={
                    e.paymentStatus === "paid"
                      ? "success"
                      : e.paymentStatus === "partially_paid"
                        ? "warning"
                        : "muted"
                  }
                />
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Agreed</p>
                  <p className="font-medium">{formatCurrency(e.agreedAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-medium">{formatCurrency(e.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-medium">{formatCurrency(e.remainingAmount)}</p>
                </div>
              </div>
              <CmsDataTable
                columns={installmentColumns}
                rows={e.installments}
                rowKey={(inst) => inst.id}
                embedded
                empty={{ title: "No installments", description: "No schedule rows yet." }}
              />
            </div>
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
