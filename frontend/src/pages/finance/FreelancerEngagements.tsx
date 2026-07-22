import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, IndianRupee, Pencil, Trash2, Wallet } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useDeleteFreelancerEngagement,
  useListFreelancerEngagements,
  useUpdateFreelancerEngagement,
  useUpdateFreelancerInstallment,
  type FreelancerEngagement,
  type FreelancerEngagementPaymentMode,
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

type DraftInstallment = { label: string; amount: string; dueDate: string };

export default function FreelancerEngagementsPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [payTarget, setPayTarget] = useState<{
    engagement: FreelancerEngagement;
    installmentId: number;
  } | null>(null);
  const [payReference, setPayReference] = useState("");
  const [editTarget, setEditTarget] = useState<FreelancerEngagement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FreelancerEngagement | null>(null);
  const [agreedAmount, setAgreedAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<FreelancerEngagementPaymentMode>("lump_sum");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState<DraftInstallment[]>([]);

  const { can } = usePermissions();
  const canEdit = can("finance_freelancers", "edit");
  const canDelete = can("finance_freelancers", "delete");
  const markPaid = useUpdateFreelancerInstallment();
  const updateEngagement = useUpdateFreelancerEngagement();
  const deleteEngagement = useDeleteFreelancerEngagement();
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

  useEffect(() => {
    if (!editTarget) return;
    setAgreedAmount(String(editTarget.agreedAmount ?? ""));
    setPaymentMode(editTarget.paymentMode);
    setNotes(editTarget.notes ?? "");
    setInstallments(
      editTarget.installments.map((i) => ({
        label: i.label,
        amount: String(i.amount),
        dueDate: i.dueDate ? i.dueDate.slice(0, 10) : "",
      })),
    );
  }, [editTarget]);

  const agreedNum = Number(agreedAmount) || 0;
  const scheduleTotal = useMemo(
    () => installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [installments],
  );
  const hasPaidRows = (e: FreelancerEngagement) => e.installments.some((i) => i.status === "paid");

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

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (agreedNum <= 0) {
      toast.error("Agreed amount must be greater than zero");
      return;
    }
    const unpaid = !hasPaidRows(editTarget);
    if (unpaid && paymentMode === "installments" && Math.abs(scheduleTotal - agreedNum) > 0.5) {
      toast.error("Installment total must match the agreed amount");
      return;
    }
    try {
      await updateEngagement.mutateAsync({
        id: editTarget.id,
        agreedAmount: agreedNum,
        paymentMode,
        notes: notes.trim() || null,
        ...(unpaid
          ? {
              installments:
                paymentMode === "lump_sum"
                  ? [{ label: "Full payment", amount: agreedNum }]
                  : installments.map((i, idx) => ({
                      label: i.label.trim() || `Installment ${idx + 1}`,
                      amount: Number(i.amount) || 0,
                      dueDate: i.dueDate || null,
                    })),
            }
          : {}),
      });
      toast.success("Engagement updated");
      setEditTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to update engagement");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEngagement.mutateAsync(deleteTarget.id);
      toast.success("Engagement deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete engagement");
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
                const paidLocked = hasPaidRows(e);
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
                      <div className="inline-flex items-center justify-end gap-1">
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
                        ) : null}
                        {canEdit ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label={`Edit fee for ${e.freelancerName ?? e.userId}`}
                            onClick={() => setEditTarget(e)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            aria-label={`Delete engagement for ${e.freelancerName ?? e.userId}`}
                            disabled={paidLocked}
                            title={
                              paidLocked
                                ? "Cannot delete after payments are recorded"
                                : "Delete engagement"
                            }
                            onClick={() => setDeleteTarget(e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {!canEdit && !canDelete ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
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
            <Button onClick={() => void handleMarkPaid()} disabled={markPaid.isPending}>
              Mark paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit project fee</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `${editTarget.freelancerName ?? "Freelancer"} · ${editTarget.projectName ?? `Project #${editTarget.projectId}`}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <div className="space-y-4">
              {hasPaidRows(editTarget) ? (
                <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                  Payments already recorded — you can raise the agreed amount, but schedule rows
                  stay locked. Delete is blocked until paid rows are reversed.
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="edit-agreed">Agreed amount (₹)</Label>
                <Input
                  id="edit-agreed"
                  type="number"
                  min={1}
                  value={agreedAmount}
                  onChange={(ev) => setAgreedAmount(ev.target.value)}
                />
              </div>
              {!hasPaidRows(editTarget) ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Payment method</Label>
                    <Select
                      value={paymentMode}
                      onValueChange={(v) => setPaymentMode(v as FreelancerEngagementPaymentMode)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lump_sum">One payment (lump sum)</SelectItem>
                        <SelectItem value="installments">Split into installments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMode === "installments" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Installments</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setInstallments((prev) => [
                              ...prev,
                              {
                                label: `Installment ${prev.length + 1}`,
                                amount: "",
                                dueDate: "",
                              },
                            ])
                          }
                        >
                          Add row
                        </Button>
                      </div>
                      {installments.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2">
                          <Input
                            placeholder="Label"
                            value={row.label}
                            onChange={(ev) =>
                              setInstallments((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, label: ev.target.value } : r,
                                ),
                              )
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={row.amount}
                            onChange={(ev) =>
                              setInstallments((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, amount: ev.target.value } : r,
                                ),
                              )
                            }
                          />
                          <Input
                            type="date"
                            value={row.dueDate}
                            onChange={(ev) =>
                              setInstallments((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, dueDate: ev.target.value } : r,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                      <p
                        className={`text-xs ${
                          Math.abs(scheduleTotal - agreedNum) > 0.5
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        Schedule total {formatCurrency(scheduleTotal)} · agreed{" "}
                        {formatCurrency(agreedNum)}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={notes}
                  onChange={(ev) => setNotes(ev.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveEdit()}
              disabled={
                updateEngagement.isPending ||
                agreedNum <= 0 ||
                (!!editTarget &&
                  !hasPaidRows(editTarget) &&
                  paymentMode === "installments" &&
                  Math.abs(scheduleTotal - agreedNum) > 0.5)
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FinanceConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete freelancer engagement?"
        description={
          deleteTarget
            ? `Remove the fee for ${deleteTarget.freelancerName ?? "this freelancer"} on ${deleteTarget.projectName ?? "this project"}. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        loading={deleteEngagement.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
