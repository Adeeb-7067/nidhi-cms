import { useMemo, useState } from "react";
import { IndianRupee, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  useCreateFreelancerEngagement,
  useListFreelancerEngagements,
  useUpdateFreelancerInstallment,
  type FreelancerEngagementPaymentMode,
} from "@/api/finance";
import { formatCurrency } from "@/modules/finance/constants";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  userId: number;
  freelancerName: string;
};

type DraftInstallment = { label: string; amount: string; dueDate: string };

export function FreelancerEngagementDialog({
  open,
  onOpenChange,
  projectId,
  userId,
  freelancerName,
}: Props) {
  const { data } = useListFreelancerEngagements({ projectId, userId }, open);
  const existing = data?.engagements?.[0] ?? null;
  const create = useCreateFreelancerEngagement();
  const markPaid = useUpdateFreelancerInstallment();

  const [agreedAmount, setAgreedAmount] = useState("20000");
  const [paymentMode, setPaymentMode] = useState<FreelancerEngagementPaymentMode>("lump_sum");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState<DraftInstallment[]>([
    { label: "Installment 1", amount: "10000", dueDate: "" },
    { label: "Installment 2", amount: "10000", dueDate: "" },
  ]);

  const agreedNum = Number(agreedAmount) || 0;
  const scheduleTotal = useMemo(
    () => installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [installments],
  );

  const handleCreate = async () => {
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
      toast.success("Freelancer fee set for this project");
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to create engagement");
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
      await markPaid.mutateAsync({
        engagementId: existing.id,
        installmentId: next.id,
        status: "paid",
        paymentMode: "bank_transfer",
      });
      toast.success(`Recorded ${formatCurrency(next.amount)}`);
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Freelancer payment
          </DialogTitle>
          <DialogDescription>
            {freelancerName} · project fee and installments
          </DialogDescription>
        </DialogHeader>

        {existing ? (
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
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {existing.remainingAmount > 0 ? (
                <Button onClick={handleRecordNext} disabled={markPaid.isPending}>
                  Record next payment
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agreed">Agreed amount (₹)</Label>
              <Input
                id="agreed"
                type="number"
                min={0}
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(e.target.value)}
              />
            </div>
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
                  <SelectItem value="lump_sum">Pay full amount (at end / one shot)</SelectItem>
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
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  create.isPending ||
                  agreedNum < 0 ||
                  (paymentMode === "installments" && Math.abs(scheduleTotal - agreedNum) > 0.5)
                }
              >
                <IndianRupee className="mr-1 h-4 w-4" />
                Save fee
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
