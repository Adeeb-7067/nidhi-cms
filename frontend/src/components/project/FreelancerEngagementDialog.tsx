import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Pencil, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  useCreateFreelancerEngagement,
  useDeleteFreelancerEngagement,
  useListFreelancerEngagements,
  useUpdateFreelancerEngagement,
  useUpdateFreelancerInstallment,
  type FreelancerEngagementPaymentMode,
} from "@/api/finance";
import { formatCurrency } from "@/modules/finance/constants";
import { FinanceConfirmDialog } from "@/modules/finance/components";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  userId: number;
  freelancerName: string;
  /** hire = just added to team; manage = Pay button / finance follow-up */
  intent?: "hire" | "manage";
  /** e.g. "2 freelancers left" when adding several at once */
  queueHint?: string;
};

type DraftInstallment = { label: string; amount: string; dueDate: string };

const emptyInstallments = (): DraftInstallment[] => [
  { label: "Installment 1", amount: "", dueDate: "" },
  { label: "Installment 2", amount: "", dueDate: "" },
];

export function FreelancerEngagementDialog({
  open,
  onOpenChange,
  projectId,
  userId,
  freelancerName,
  intent = "manage",
  queueHint,
}: Props) {
  const { data, isLoading } = useListFreelancerEngagements({ projectId, userId }, open);
  const existing = data?.engagements?.[0] ?? null;
  const create = useCreateFreelancerEngagement();
  const update = useUpdateFreelancerEngagement();
  const remove = useDeleteFreelancerEngagement();
  const markPaid = useUpdateFreelancerInstallment();
  const [, setLocation] = useLocation();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [agreedAmount, setAgreedAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<FreelancerEngagementPaymentMode>("lump_sum");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState<DraftInstallment[]>(emptyInstallments);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setConfirmDelete(false);
      return;
    }
    setAgreedAmount("");
    setPaymentMode("lump_sum");
    setNotes("");
    setInstallments(emptyInstallments());
    setEditing(false);
  }, [open, userId, projectId]);

  useEffect(() => {
    if (!editing || !existing) return;
    setAgreedAmount(String(existing.agreedAmount ?? ""));
    setPaymentMode(existing.paymentMode);
    setNotes(existing.notes ?? "");
    setInstallments(
      existing.installments.map((i) => ({
        label: i.label,
        amount: String(i.amount),
        dueDate: i.dueDate ? i.dueDate.slice(0, 10) : "",
      })),
    );
  }, [editing, existing]);

  const agreedNum = Number(agreedAmount) || 0;
  const scheduleTotal = useMemo(
    () => installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [installments],
  );
  const hasPaid = existing?.installments.some((i) => i.status === "paid") ?? false;

  const handleCreate = async () => {
    if (agreedNum <= 0) {
      toast.error("Enter how much this freelancer is paid for this project");
      return;
    }
    if (paymentMode === "installments" && Math.abs(scheduleTotal - agreedNum) > 0.5) {
      toast.error("Installment total must match the agreed amount");
      return;
    }
    try {
      const payload =
        paymentMode === "lump_sum"
          ? {
              projectId,
              userId,
              agreedAmount: agreedNum,
              paymentMode,
              notes: notes.trim() || null,
            }
          : {
              projectId,
              userId,
              agreedAmount: agreedNum,
              paymentMode,
              notes: notes.trim() || null,
              installments: installments.map((i, idx) => ({
                label: i.label.trim() || `Installment ${idx + 1}`,
                amount: Number(i.amount) || 0,
                dueDate: i.dueDate || null,
              })),
            };
      await create.mutateAsync(payload);
      toast.success("Project fee saved — tracks against expenses");
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to create engagement");
    }
  };

  const handleUpdate = async () => {
    if (!existing) return;
    if (agreedNum <= 0) {
      toast.error("Agreed amount must be greater than zero");
      return;
    }
    if (!hasPaid && paymentMode === "installments" && Math.abs(scheduleTotal - agreedNum) > 0.5) {
      toast.error("Installment total must match the agreed amount");
      return;
    }
    try {
      await update.mutateAsync({
        id: existing.id,
        agreedAmount: agreedNum,
        paymentMode,
        notes: notes.trim() || null,
        ...(!hasPaid
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
      toast.success("Project fee updated");
      setEditing(false);
    } catch (err) {
      toastApiError(err, "Failed to update engagement");
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    try {
      await remove.mutateAsync(existing.id);
      toast.success("Engagement deleted");
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to delete engagement");
    }
  };

  const handleRecordNext = async () => {
    if (!existing) return;
    const next = existing.installments.find((i) => i.status === "pending");
    if (!next) {
      toast.message("No pending installments");
      return;
    }
    try {
      const result = await markPaid.mutateAsync({
        engagementId: existing.id,
        installmentId: next.id,
        status: "paid",
        paymentMode: "bank_transfer",
      });
      toast.success(`Recorded ${formatCurrency(next.amount)} — opening receipt`);
      onOpenChange(false);
      setLocation(`/freelancers/receipts/${existing.id}/${result.id ?? next.id}`);
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  const title =
    intent === "hire" && !existing
      ? "How much for this project?"
      : editing
        ? "Edit project fee"
        : "Freelancer payment";
  const description =
    intent === "hire" && !existing
      ? `Set ${freelancerName}'s agreed fee for this project so finance can manage expenses.${
          queueHint ? ` (${queueHint})` : ""
        }`
      : `${freelancerName} · project fee and installments`;

  const feeForm = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="agreed">Agreed amount for this project (₹)</Label>
        <Input
          id="agreed"
          type="number"
          min={1}
          step="1"
          value={agreedAmount}
          onChange={(e) => setAgreedAmount(e.target.value)}
          placeholder="e.g. 25000"
          autoFocus={intent === "hire" || editing}
        />
        <p className="text-[11px] text-muted-foreground">
          Total you commit to pay them to complete this project (not salary).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>How will you pay?</Label>
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
                onChange={(e) =>
                  setInstallments((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                  )
                }
              />
              <Input
                type="number"
                placeholder="Amount"
                value={row.amount}
                onChange={(e) =>
                  setInstallments((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)),
                  )
                }
              />
              <Input
                type="date"
                value={row.dueDate}
                onChange={(e) =>
                  setInstallments((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, dueDate: e.target.value } : r)),
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
            Schedule total {formatCurrency(scheduleTotal)} · agreed {formatCurrency(agreedNum)}
          </p>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Scope, milestones, or payment terms"
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : existing && editing ? (
            <div className="space-y-4">
              {hasPaid ? (
                <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                  Payments already recorded — amount can be raised; schedule stays locked.
                </p>
              ) : null}
              {feeForm}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleUpdate()}
                  disabled={
                    update.isPending ||
                    agreedNum <= 0 ||
                    (!hasPaid &&
                      paymentMode === "installments" &&
                      Math.abs(scheduleTotal - agreedNum) > 0.5)
                  }
                >
                  <IndianRupee className="mr-1 h-4 w-4" />
                  Save changes
                </Button>
              </DialogFooter>
            </div>
          ) : existing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Agreed</p>
                  <p className="font-medium">{formatCurrency(existing.agreedAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-medium">{formatCurrency(existing.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-medium">{formatCurrency(existing.remainingAmount)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {existing.installments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{inst.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(inst.amount)}
                        {inst.dueDate
                          ? ` · due ${new Date(inst.dueDate).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <Badge variant={inst.status === "paid" ? "default" : "secondary"}>
                      {inst.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit fee
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={hasPaid}
                    title={hasPaid ? "Cannot delete after payments are recorded" : "Delete"}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  {existing.remainingAmount > 0 ? (
                    <Button onClick={() => void handleRecordNext()} disabled={markPaid.isPending}>
                      Record next payment
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {feeForm}
              <DialogFooter className="gap-2 sm:gap-0">
                {intent === "hire" ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      toast.message("Fee skipped — set it later from Pay on the team list");
                      onOpenChange(false);
                    }}
                  >
                    Skip for now
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={() => void handleCreate()}
                  disabled={
                    create.isPending ||
                    agreedNum <= 0 ||
                    (paymentMode === "installments" && Math.abs(scheduleTotal - agreedNum) > 0.5)
                  }
                >
                  <IndianRupee className="mr-1 h-4 w-4" />
                  Save project fee
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FinanceConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this project fee?"
        description={`Remove the fee for ${freelancerName} on this project. You can set a new one later.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
