import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, FileText, History, Layers, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getProposalById, calcProposalTotal, mockCustomerProjects } from "@/modules/sales/mock-data";
import { formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesStatusBadge,
  ExecutiveAvatar,
  SalesEmptyState,
  InstallmentProgress,
} from "@/modules/sales/components";
import { toast } from "sonner";

export default function ProposalDetail() {
  const [, params] = useRoute("/sales/proposals/:id");
  const proposalId = Number(params?.id);
  const proposal = getProposalById(proposalId);

  if (!proposal) {
    return (
      <SalesEmptyState
        title="Proposal not found"
        description={`No proposal with ID #${proposalId} in demo data.`}
        actionLabel="Back to proposals"
        onAction={() => window.history.back()}
      />
    );
  }

  const { subtotal, tax, total } = calcProposalTotal(proposal);
  const linkedProject = mockCustomerProjects.find((p) => p.proposalId === proposal.id);
  const milestoneTotal = proposal.milestones?.reduce((s, m) => s + m.amount, 0) ?? 0;
  const milestonePaid = linkedProject?.paidAmount ?? 0;

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
              <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Proposal sent (demo)")}>
                <Send className="h-3.5 w-3.5" />
                Send proposal
              </Button>
            )}
            {proposal.status === "sent" && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Marked approved (demo)")}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark approved
              </Button>
            )}
            {proposal.status === "approved" && proposal.projectId && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                <Link href={`/sales/installments`}>View installments</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SalesStatusBadge variant="proposal" value={proposal.status} />
        <span className="text-xs text-muted-foreground">
          Valid until {format(new Date(proposal.validUntil), "MMM d, yyyy")}
        </span>
        <ExecutiveAvatar name={proposal.assignedTo.name} />
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
                    {proposal.items.map((item) => {
                      const line = item.quantity * item.unitPrice;
                      const lineTax = line * (item.taxPercent / 100);
                      return (
                        <TableRow key={item.id}>
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

          {proposal.milestones && proposal.milestones.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Installment / milestone plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proposal.milestones.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{m.name}</p>
                        {m.description && <p className="text-[10px] text-muted-foreground">{m.description}</p>}
                      </div>
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(m.amount)}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Due {format(new Date(m.dueDate), "MMM d, yyyy")}</p>
                  </div>
                ))}
                <InstallmentProgress paid={milestonePaid} total={milestoneTotal} />
              </CardContent>
            </Card>
          )}

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
              PDF preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed bg-muted/30 aspect-[3/4] flex flex-col items-center justify-center p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">{proposal.customerName}</p>
              <p className="text-xs text-muted-foreground mt-1">{proposal.number}</p>
              <p className="text-lg font-bold mt-4 text-primary">{formatCurrency(total)}</p>
              <p className="text-[10px] text-muted-foreground mt-6">
                PDF preview placeholder — connect PDF generator in production
              </p>
            </div>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Terms:</span> {proposal.terms}
              </p>
              {proposal.notes && (
                <p>
                  <span className="font-medium text-foreground">Notes:</span> {proposal.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalPageShell>
  );
}
