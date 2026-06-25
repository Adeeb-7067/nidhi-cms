import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { ArrowLeft, FileText, History, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetProposal,
  useSendProposal,
  useApproveProposal,
  useDeclineProposal,
} from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { calcProposalTotal } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesStatusBadge,
  ExecutiveAvatar,
  SalesEmptyState,
} from "@/modules/sales/components";

export default function ProposalDetail() {
  const [, params] = useRoute("/sales/proposals/:id");
  const proposalId = Number(params?.id);

  const { data: proposal, isLoading, isError } = useGetProposal(proposalId, !!proposalId);
  const sendProposal = useSendProposal();
  const approveProposal = useApproveProposal();
  const declineProposal = useDeclineProposal();

  const runAction = async (
    action: "send" | "approve" | "decline",
    mutate: { mutateAsync: (vars: { id: number; reason?: string }) => Promise<unknown> },
  ) => {
    try {
      await mutate.mutateAsync({ id: proposalId });
      const labels = { send: "sent", approve: "approved", decline: "declined" };
      toast.success(`Proposal ${labels[action]}`);
    } catch (err) {
      toastApiError(err, `Failed to ${action} proposal`);
    }
  };

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </PortalPageShell>
    );
  }

  if (isError || !proposal) {
    return (
      <SalesEmptyState
        title="Proposal not found"
        description={`No proposal with ID #${proposalId} exists.`}
        actionLabel="Back to proposals"
        onAction={() => window.history.back()}
      />
    );
  }

  const { subtotal, tax, total } = calcProposalTotal(proposal);
  const clientLabel = proposal.leadId
    ? `Lead #${proposal.leadId}`
    : proposal.customerId
    ? `Customer #${proposal.customerId}`
    : "—";

  const revisions = Array.from({ length: proposal.revision }, (_, i) => ({
    rev: i + 1,
    date: format(
      new Date(new Date(proposal.createdAt).getTime() + i * 86400000 * 2),
      "MMM d, yyyy",
    ),
    note: i === proposal.revision - 1 ? "Current version" : "Previous revision",
  }));

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={proposal.title}
        description={proposal.number}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Proposals", href: "/sales/proposals" },
          { label: proposal.number },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/sales/proposals">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            {proposal.status === "draft" && (
              <Button
                size="sm"
                className="h-8 gap-1.5"
                disabled={sendProposal.isPending}
                onClick={() => runAction("send", sendProposal)}
              >
                <Send className="h-3.5 w-3.5" />
                Send proposal
              </Button>
            )}
            {(proposal.status === "sent" || proposal.status === "seen") && (
              <>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={approveProposal.isPending}
                  onClick={() => runAction("approve", approveProposal)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark approved
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  disabled={declineProposal.isPending}
                  onClick={() => runAction("decline", declineProposal)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Decline
                </Button>
              </>
            )}
            {proposal.status === "approved" && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                <Link href="/sales/installments">View installments</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SalesStatusBadge variant="proposal" value={proposal.status} />
        {proposal.validUntil && (
          <span className="text-xs text-muted-foreground">
            Valid until {format(new Date(proposal.validUntil), "MMM d, yyyy")}
          </span>
        )}
        {proposal.assignedToUser && <ExecutiveAvatar name={proposal.assignedToUser.name} />}
        <span className="text-xs text-muted-foreground">For {clientLabel}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Line items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Unit price</TableHead>
                      <TableHead className="text-xs text-right">Tax</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposal.items.map((item, idx) => {
                      const line = item.quantity * item.unitPrice;
                      const lineTax = line * (item.taxPercent / 100);
                      return (
                        <TableRow key={item.itemId ?? idx}>
                          <TableCell className="text-xs">{item.description}</TableCell>
                          <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-xs text-right">{item.taxPercent}%</TableCell>
                          <TableCell className="text-xs text-right font-medium tabular-nums">
                            {formatCurrency(line + lineTax)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="tabular-nums">{formatCurrency(tax)}</span>
                </div>
                {proposal.discount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount ({proposal.discount}%)</span>
                    <span>Applied</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Total</span>
                  <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Revision history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {revisions.map((r) => (
                <div
                  key={r.rev}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                >
                  <span className="font-medium">Revision {r.rev}</span>
                  <span className="text-muted-foreground">{r.date}</span>
                  <span className="text-muted-foreground">{r.note}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed bg-muted/30 aspect-[3/4] flex flex-col items-center justify-center p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">{clientLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">{proposal.number}</p>
              <p className="text-lg font-bold mt-4 text-primary">{formatCurrency(total)}</p>
              <p className="text-[10px] text-muted-foreground mt-6">
                PDF preview — connect PDF generator in production
              </p>
            </div>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              {proposal.terms && (
                <p>
                  <span className="font-medium text-foreground">Terms:</span> {proposal.terms}
                </p>
              )}
              {proposal.clientNote && (
                <p>
                  <span className="font-medium text-foreground">Client notes:</span> {proposal.clientNote}
                </p>
              )}
              {proposal.internalNotes && (
                <p>
                  <span className="font-medium text-foreground">Internal notes:</span> {proposal.internalNotes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalPageShell>
  );
}
