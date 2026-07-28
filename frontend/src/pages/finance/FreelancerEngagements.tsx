import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, IndianRupee, Pencil, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import type { PaymentMode } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
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
import { Link, useLocation } from "wouter";
import { getProjectDetailHref } from "@/lib/project-routes";
import { PaymentProofUploadField } from "@/modules/sales/components/sales-action-dialogs";
import { FreelancerNavTabs } from "@/components/freelancers/FreelancerNavTabs";

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
  const [payDate, setPayDate] = useState("");
  const [payMode, setPayMode] = useState("bank_transfer");
  const [payNote, setPayNote] = useState("");
  const [payProofUrl, setPayProofUrl] = useState("");
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
  const [, setLocation] = useLocation();

  const openPayDialog = (engagement: FreelancerEngagement, installmentId: number) => {
    setPayTarget({ engagement, installmentId });
    setPayReference("");
    setPayDate(format(new Date(), "yyyy-MM-dd"));
    setPayMode("bank_transfer");
    setPayNote("");
    setPayProofUrl("");
  };

  const handleMarkPaid = async () => {
    if (!payTarget) return;
    const engagementId = payTarget.engagement.id;
    const installmentId = payTarget.installmentId;
    try {
      const result = await markPaid.mutateAsync({
        engagementId,
        installmentId,
        status: "paid",
        reference: payReference.trim() || null,
        paymentMode: payMode,
        notes: payNote.trim() || null,
        proofImageUrl: payProofUrl.trim() || null,
        paidAt: payDate || null,
      });
      toast.success("Payment recorded — opening receipt");
      setPayTarget(null);
      setPayReference("");
      setPayNote("");
      setPayProofUrl("");
      setLocation(`/freelancers/receipts/${engagementId}/${result.id ?? installmentId}`);
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

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

  const chipItems = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "unpaid", label: "Outstanding" },
    { value: "completed", label: "Completed" },
  ];

  const paymentTone = (status: string): "success" | "warning" | "danger" | "muted" | "neutral" => {
    if (status === "paid") return "success";
    if (status === "partially_paid") return "warning";
    if (status === "unpaid") return "danger";
    return "muted";
  };

  const columns: CmsColumn<FreelancerEngagement>[] = [
    {
      id: "freelancer",
      header: "Freelancer",
      cell: (e) => <span className="font-medium">{e.freelancerName ?? `User #${e.userId}`}</span>,
    },
    {
      id: "project",
      header: "Project",
      cell: (e) => (
        <>
          <Link
            href={getProjectDetailHref(e.projectId, undefined, e.projectType)}
            className="font-medium hover:text-primary hover:underline underline-offset-2"
          >
            {e.projectName ?? `Project #${e.projectId}`}
          </Link>
          {e.projectType ? (
            <span className="ml-2 text-[10px] capitalize text-muted-foreground">{e.projectType}</span>
          ) : null}
        </>
      ),
    },
    {
      id: "agreed",
      header: "Agreed",
      align: "right",
      cell: (e) => <span className="tabular-nums font-medium">{formatCurrency(e.agreedAmount)}</span>,
    },
    {
      id: "paid",
      header: "Paid",
      align: "right",
      cell: (e) => (
        <span className="tabular-nums font-medium text-emerald-600">{formatCurrency(e.paidAmount)}</span>
      ),
    },
    {
      id: "remaining",
      header: "Remaining",
      align: "right",
      cell: (e) => (
        <span className="tabular-nums text-amber-600">{formatCurrency(e.remainingAmount)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (e) => (
        <CmsStatusChip
          label={PAYMENT_STATUS_LABEL[e.paymentStatus] ?? e.paymentStatus}
          tone={paymentTone(e.paymentStatus)}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (e) => {
        const nextPending = e.installments.find((i) => i.status === "pending");
        const paidLocked = hasPaidRows(e);
        return (
          <div className="inline-flex items-center justify-end gap-1">
            {canEdit && nextPending ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => openPayDialog(e, nextPending.id)}
              >
                Record pay
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
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
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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
          </div>
        );
      },
    },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Payments"
        description="Project fees, installments, and payout status."
        breadcrumbs={[
          { label: "Freelancers", href: "/freelancers" },
          { label: "Payments" },
        ]}
      />

      <FreelancerNavTabs activeTab="payments" />

      <PortalKpiGrid
        items={[
          { title: "Engagements", value: String(kpis.count), icon: Wallet, accent: "blue", delay: 0 },
          { title: "Agreed total", value: formatCurrency(kpis.agreed), icon: IndianRupee, accent: "violet", delay: 1 },
          { title: "Paid out", value: formatCurrency(kpis.paid), icon: CheckCircle2, accent: "green", delay: 2 },
          {
            title: "Outstanding",
            value: formatCurrency(kpis.remaining),
            icon: IndianRupee,
            accent: "amber",
            alert: kpis.remaining > 0,
            delay: 3,
          },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search freelancer or project…" />

      <CmsChipTabs value={statusTab} onValueChange={setStatusTab} items={chipItems} />

      <CmsDataTable
        columns={columns}
        rows={engagements}
        rowKey={(e) => e.id}
        empty={{
          icon: Wallet,
          title: "No freelancer engagements",
          description: "Assign a freelancer to a project, then set their fee from the project team panel.",
        }}
      />

      {/* RECORD PAYMENT DIALOG — mirrors Sales record payment fields */}
      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Log an outgoing payout and generate a branded receipt voucher.
            </DialogDescription>
          </DialogHeader>
          {payTarget ? (
            <div className="space-y-4">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pay-date">Payment date</Label>
                  <Input
                    id="pay-date"
                    type="date"
                    value={payDate}
                    onChange={(ev) => setPayDate(ev.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment method</Label>
                  <Select value={payMode} onValueChange={setPayMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {PAYMENT_MODE_LABELS[mode]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Transaction ID</Label>
                <Input
                  id="pay-ref"
                  value={payReference}
                  onChange={(ev) => setPayReference(ev.target.value)}
                  placeholder="e.g. UTR123456789"
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional — reference number, UTR, or cheque number.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-note">Note</Label>
                <Textarea
                  id="pay-note"
                  value={payNote}
                  onChange={(ev) => setPayNote(ev.target.value)}
                  rows={2}
                  placeholder="e.g. Milestone 1 payout"
                />
              </div>
              <PaymentProofUploadField value={payProofUrl} onChange={setPayProofUrl} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleMarkPaid()} disabled={markPaid.isPending}>
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT FEE DIALOG */}
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
                  stay locked.
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
