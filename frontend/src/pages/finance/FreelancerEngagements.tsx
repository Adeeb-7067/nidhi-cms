import { useMemo, useState } from "react";
import { CheckCircle2, IndianRupee, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceEmptyState,
  FinanceErrorState,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useListFreelancerEngagements,
  useUpdateFreelancerInstallment,
  type FreelancerEngagement,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";
import { Link } from "wouter";
import { getProjectDetailHref } from "@/lib/project-routes";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partial",
  paid: "Paid",
};

export default function FreelancerEngagementsPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [payTarget, setPayTarget] = useState<{
    engagement: FreelancerEngagement;
    installmentId: number;
  } | null>(null);
  const [payReference, setPayReference] = useState("");
  const { can } = usePermissions();
  const canEdit = can("finance_freelancers", "edit");
  const markPaid = useUpdateFreelancerInstallment();
  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();

  const engagements = useMemo(() => {
    let list = data?.engagements ?? [];
    if (statusTab === "active") list = list.filter((e) => e.status === "active");
    if (statusTab === "completed") list = list.filter((e) => e.status === "completed");
    if (statusTab === "unpaid") {
      list = list.filter((e) => e.paymentStatus === "unpaid" || e.paymentStatus === "partially_paid");
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        (e.freelancerName ?? "").toLowerCase().includes(q) ||
        (e.projectName ?? "").toLowerCase().includes(q),
    );
  }, [data?.engagements, search, statusTab]);

  const kpis = useMemo(() => {
    const rows = data?.engagements ?? [];
    const agreed = rows.reduce((s, e) => s + e.agreedAmount, 0);
    const paid = rows.reduce((s, e) => s + e.paidAmount, 0);
    const remaining = rows.reduce((s, e) => s + e.remainingAmount, 0);
    return { count: rows.length, agreed, paid, remaining };
  }, [data?.engagements]);

  const handleMarkPaid = async () => {
    if (!payTarget) return;
    try {
      await markPaid.mutateAsync({
        engagementId: payTarget.engagement.id,
        installmentId: payTarget.installmentId,
        status: "paid",
        reference: payReference.trim() || null,
        paymentMode: "bank_transfer",
      });
      toast.success("Payment recorded");
      setPayTarget(null);
      setPayReference("");
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

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
        title="Freelancer payments"
        description="Project-wise fees, installments, and payment status"
      />

      <PortalKpiGrid
        items={[
          { title: "Engagements", value: String(kpis.count), icon: Wallet },
          { title: "Agreed", value: formatCurrency(kpis.agreed), icon: IndianRupee },
          { title: "Paid", value: formatCurrency(kpis.paid), icon: CheckCircle2 },
          { title: "Remaining", value: formatCurrency(kpis.remaining), icon: IndianRupee },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search freelancer or project…" />

      <Tabs value={statusTab} onValueChange={setStatusTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="unpaid">Outstanding</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {engagements.length === 0 ? (
        <FinanceEmptyState
          title="No freelancer engagements"
          description="Assign a freelancer to a project, then set their fee from the project team panel."
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Freelancer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Agreed</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engagements.map((e) => {
                const nextPending = e.installments.find((i) => i.status === "pending");
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.freelancerName ?? `User #${e.userId}`}</TableCell>
                    <TableCell>
                      <Link
                        href={getProjectDetailHref(e.projectId, undefined, e.projectType)}
                        className="hover:text-primary"
                      >
                        {e.projectName ?? `Project #${e.projectId}`}
                      </Link>
                      {e.projectType ? (
                        <span className="ml-2 text-xs text-muted-foreground capitalize">{e.projectType}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatCurrency(e.agreedAmount)}</TableCell>
                    <TableCell>{formatCurrency(e.paidAmount)}</TableCell>
                    <TableCell>{formatCurrency(e.remainingAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PAYMENT_STATUS_LABEL[e.paymentStatus] ?? e.paymentStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && nextPending ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPayTarget({ engagement: e, installmentId: nextPending.id });
                            setPayReference("");
                          }}
                        >
                          Record pay
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          {payTarget ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {payTarget.engagement.freelancerName} · {payTarget.engagement.projectName}
              </p>
              {(() => {
                const inst = payTarget.engagement.installments.find(
                  (i) => i.id === payTarget.installmentId,
                );
                return inst ? (
                  <p className="text-sm font-medium">
                    {inst.label}: {formatCurrency(inst.amount)}
                  </p>
                ) : null;
              })()}
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Payment reference (optional)</Label>
                <Input
                  id="pay-ref"
                  value={payReference}
                  onChange={(ev) => setPayReference(ev.target.value)}
                  placeholder="UTR / cheque / note"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={markPaid.isPending}>
              Mark paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
