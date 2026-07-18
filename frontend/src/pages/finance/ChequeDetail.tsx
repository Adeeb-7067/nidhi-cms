import { useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Pencil,
  XCircle,
  Ban,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import {
  formatCurrency,
  CHEQUE_PURPOSE_LABELS,
  CHEQUE_PAYEE_TYPE_LABELS,
} from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  FinanceStatusBadge,
  ChequeFormModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceDetailPageSkeleton } from "@/components/loading";
import {
  useGetCheque,
  useClearCheque,
  useCancelCheque,
  useBounceCheque,
  useRePresentCheque,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

export default function ChequeDetailPage() {
  const [, params] = useRoute("/finance/cheques/:id");
  const chequeId = Number(params?.id);
  const { data: cheque, isLoading, isError, refetch } = useGetCheque(chequeId);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | "cancel" | "bounce" | "re-present" | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const { can } = usePermissions();
  const canEdit = can("finance_cheques", "edit");
  const clearCheque = useClearCheque();
  const cancelCheque = useCancelCheque();
  const bounceCheque = useBounceCheque();
  const rePresentCheque = useRePresentCheque();
  const actionPending =
    clearCheque.isPending ||
    cancelCheque.isPending ||
    bounceCheque.isPending ||
    rePresentCheque.isPending;

  const runAction = async () => {
    if (!cheque || !confirm) return;
    try {
      if (confirm === "clear") {
        await clearCheque.mutateAsync({ id: cheque.id });
        toast.success("Cheque cleared — expense settled");
      } else if (confirm === "cancel") {
        await cancelCheque.mutateAsync({ id: cheque.id, notes: actionNotes.trim() || undefined });
        toast.success("Cheque cancelled");
        setActionNotes("");
      } else if (confirm === "bounce") {
        await bounceCheque.mutateAsync({ id: cheque.id, notes: actionNotes.trim() || undefined });
        toast.success("Cheque marked bounced");
        setActionNotes("");
      } else if (confirm === "re-present") {
        await rePresentCheque.mutateAsync(cheque.id);
        toast.success("Cheque re-presented successfully");
      }
      setConfirm(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Action failed");
    }
  };

  if (isLoading) {
    return <FinanceDetailPageSkeleton />;
  }

  if (isError || !cheque) {
    return (
      <PortalPageShell>
        <FinanceEmptyState
          title="Cheque not found"
          description={`No cheque #${chequeId}.`}
          actionLabel="Back to cheques"
          onAction={() => {
            window.location.href = "/finance/cheques";
          }}
        />
      </PortalPageShell>
    );
  }

  const issued = cheque.status === "issued";

  return (
    <PortalPageShell>
      <FinancePageHeader
        title={`${cheque.payeeName}`}
        description={`${cheque.reference} · Cheque #${cheque.chequeNumber}`}
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Cheques", href: "/finance/cheques" },
          { label: cheque.reference },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/finance/cheques">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            {canEdit && issued && (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setConfirm("clear")}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark cleared
                </Button>
              </>
            )}
            {canEdit && cheque.status === "bounced" && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setConfirm("re-present")}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Re-present cheque
              </Button>
            )}
          </>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Amount", value: formatCurrency(cheque.amount), icon: Banknote, accent: "blue", delay: 0 },
          {
            title: "Status",
            value: cheque.status.replace("_", " "),
            icon: CheckCircle2,
            accent: cheque.status === "cleared" ? "green" : cheque.status === "bounced" ? "red" : "amber",
            delay: 1,
          },
          {
            title: "Purpose",
            value: CHEQUE_PURPOSE_LABELS[cheque.purpose],
            icon: Banknote,
            accent: "violet",
            delay: 2,
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cheque details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <FinanceStatusBadge variant="cheque" value={cheque.status} />
              <span className="text-xs text-muted-foreground">{CHEQUE_PAYEE_TYPE_LABELS[cheque.payeeType]}</span>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[11px] text-muted-foreground">Payee</dt>
                <dd className="font-medium">{cheque.payeeName}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Cheque number</dt>
                <dd className="font-mono">{cheque.chequeNumber}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Issue date</dt>
                <dd>{format(new Date(cheque.issueDate), "MMM d, yyyy")}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Clearance date</dt>
                <dd>{format(new Date(cheque.clearanceDate), "MMM d, yyyy")}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Bank</dt>
                <dd>{cheque.bankName || "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Linked expense</dt>
                <dd>
                  {cheque.expenseReference ? (
                    <Link
                      href={`/finance/expenses?search=${encodeURIComponent(cheque.expenseReference)}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {cheque.expenseReference}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {cheque.clearedAt ? (
                <div className="col-span-2">
                  <dt className="text-[11px] text-muted-foreground">Cleared at</dt>
                  <dd>{format(new Date(cheque.clearedAt), "MMM d, yyyy HH:mm")}</dd>
                </div>
              ) : null}
              {cheque.notes ? (
                <div className="col-span-2">
                  <dt className="text-[11px] text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{cheque.notes}</dd>
                </div>
              ) : null}
            </dl>

            {cheque.attachments?.length ? (
              <div className="pt-2 space-y-1">
                <div className="text-[11px] text-muted-foreground">Attachments</div>
                {cheque.attachments.map((a) => (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs text-primary hover:underline truncate"
                  >
                    {a.name}
                  </a>
                ))}
              </div>
            ) : null}

            {canEdit && issued && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-amber-700"
                  onClick={() => setConfirm("bounce")}
                >
                  <Ban className="h-3.5 w-3.5" />
                  Mark bounced
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive"
                  onClick={() => setConfirm("cancel")}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel cheque
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {cheque.bounceHistory && cheque.bounceHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-700 flex items-center gap-1.5">
                <Ban className="h-4 w-4" />
                Bounce history ({cheque.bounceHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="relative border-l border-border/80 pl-4 space-y-4 ml-2">
                {cheque.bounceHistory.map((b, i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 flex h-2 w-2 rounded-full bg-amber-500 ring-4 ring-background" />
                    <div className="text-xs font-semibold">
                      Bounced on {format(new Date(b.bouncedAt), "MMM d, yyyy 'at' hh:mm a")}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      By {b.bouncedByName || `User #${b.bouncedBy}`}
                    </div>
                    {b.notes && (
                      <div className="text-xs bg-muted/40 border rounded px-2.5 py-1.5 mt-1.5 text-muted-foreground italic max-w-sm">
                        "{b.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ChequeFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        cheque={cheque}
        onSuccess={() => refetch()}
      />

      <FinanceConfirmDialog
        open={confirm != null && confirm !== "bounce" && confirm !== "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm === "clear"
            ? "Mark cheque cleared?"
            : "Re-present this cheque?"
        }
        description={
          confirm === "clear"
            ? `Records an outgoing cheque payment of ${formatCurrency(cheque.amount)} and settles the linked expense.`
            : "This transitions the cheque status back to 'Issued' so it can be cleared or bounced again."
        }
        confirmLabel={
          confirm === "clear" ? "Clear & settle" : "Re-present"
        }
        loading={actionPending}
        onConfirm={runAction}
      />

      <Dialog open={confirm === "bounce"} onOpenChange={(o) => { if (!o) { setConfirm(null); setActionNotes(""); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Mark cheque bounced?</DialogTitle>
            <DialogDescription>
              The associated expense will remain unpaid so you can re-issue or re-present it later.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bounce notes / reason</label>
              <Textarea
                placeholder="e.g. Insufficient funds, signature mismatch (optional)"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirm(null); setActionNotes(""); }} disabled={actionPending}>
              Cancel
            </Button>
            <Button onClick={runAction} disabled={actionPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {actionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark bounced
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm === "cancel"} onOpenChange={(o) => { if (!o) { setConfirm(null); setActionNotes(""); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Cancel this cheque?</DialogTitle>
            <DialogDescription>
              The linked unpaid expense will be rejected. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cancellation reason (optional)</label>
              <Textarea
                placeholder="e.g. Wrong amount entered, payee details changed (optional)"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirm(null); setActionNotes(""); }} disabled={actionPending}>
              Cancel
            </Button>
            <Button onClick={runAction} disabled={actionPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {actionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel cheque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
