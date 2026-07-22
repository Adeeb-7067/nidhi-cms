import { useMemo } from "react";
import { IndianRupee, Wallet, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/modules/finance/constants";
import { FinancePageHeader, FinanceEmptyState, FinanceErrorState } from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListFreelancerEngagements } from "@/api/finance";
import { getProjectDetailHref } from "@/lib/project-routes";

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
          { title: "Remaining", value: formatCurrency(kpis.remaining), icon: IndianRupee },
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
                <Badge variant="secondary">{e.paymentStatus.replace("_", " ")}</Badge>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Installment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e.installments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell>{inst.label}</TableCell>
                      <TableCell>{formatCurrency(inst.amount)}</TableCell>
                      <TableCell>
                        {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inst.status === "paid" ? "default" : "secondary"}>
                          {inst.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
