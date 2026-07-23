import { useMemo, useState } from "react";
import { Receipt, Printer, CheckCircle2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
  type FreelancerEngagement,
  type FreelancerInstallment,
} from "@/api/finance";

type PaidReceiptItem = {
  engagement: FreelancerEngagement;
  installment: FreelancerInstallment;
};

export default function FreelancerReceiptsPage() {
  const [search, setSearch] = useState("");
  const [receiptTarget, setReceiptTarget] = useState<PaidReceiptItem | null>(null);

  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();

  const paidReceiptsList = useMemo(() => {
    const list: PaidReceiptItem[] = [];
    for (const e of data?.engagements ?? []) {
      for (const i of e.installments ?? []) {
        if (i.status === "paid") {
          list.push({ engagement: e, installment: i });
        }
      }
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        (r.engagement.freelancerName ?? "").toLowerCase().includes(q) ||
        (r.engagement.projectName ?? "").toLowerCase().includes(q) ||
        (r.installment.reference ?? "").toLowerCase().includes(q)
    );
  }, [data?.engagements, search]);

  const kpis = useMemo(() => {
    const list = paidReceiptsList;
    const totalPaidAmount = list.reduce((s, r) => s + r.installment.amount, 0);
    return { count: list.length, totalPaidAmount };
  }, [paidReceiptsList]);

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
        title="Freelancer Payment Receipts"
        description="Official payment receipt vouchers for all completed freelancer payouts and installments"
      />

      <PortalKpiGrid
        items={[
          { title: "Total Paid Vouchers", value: String(kpis.count), icon: Receipt, accent: "blue" },
          { title: "Total Amount Disbursed", value: formatCurrency(kpis.totalPaidAmount), icon: CheckCircle2, accent: "green" },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search receipt ref, freelancer, or project…" />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Payment Receipt Vouchers ({paidReceiptsList.length})
        </h3>

        {paidReceiptsList.length === 0 ? (
          <FinanceEmptyState
            title="No payment receipts available"
            description="Record a freelancer payment on the Payments page to generate payment receipt vouchers."
          />
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt Reference</TableHead>
                  <TableHead>Freelancer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Payment Milestone</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidReceiptsList.map((item, idx) => (
                  <TableRow key={`${item.engagement.id}-${item.installment.id}-${idx}`}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {item.installment.reference || `REC-FL-${item.installment.id}`}
                    </TableCell>
                    <TableCell className="font-medium">{item.engagement.freelancerName}</TableCell>
                    <TableCell>{item.engagement.projectName}</TableCell>
                    <TableCell>{item.installment.label}</TableCell>
                    <TableCell className="font-medium text-emerald-600">
                      {formatCurrency(item.installment.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.installment.paidAt ? item.installment.paidAt.slice(0, 10) : "Paid"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setReceiptTarget(item)}
                      >
                        <Receipt className="h-3.5 w-3.5" /> View Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* PRINTABLE PAYMENT RECEIPT VOUCHER DIALOG */}
      <Dialog open={!!receiptTarget} onOpenChange={(open) => !open && setReceiptTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" /> Payment Receipt Voucher
            </DialogTitle>
          </DialogHeader>

          {receiptTarget ? (
            <div className="space-y-4 border rounded-xl p-4 bg-card shadow-sm">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Voucher Reference</p>
                  <p className="font-mono text-sm font-bold text-primary">
                    {receiptTarget.installment.reference || `REC-FL-${receiptTarget.installment.id}`}
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  PAID
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Freelancer:</span>
                  <span className="font-medium">{receiptTarget.engagement.freelancerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-medium">{receiptTarget.engagement.projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Milestone:</span>
                  <span className="font-medium">{receiptTarget.installment.label}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-semibold">Paid Amount:</span>
                  <span className="font-bold text-base text-emerald-600">
                    {formatCurrency(receiptTarget.installment.amount)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReceiptTarget(null)}>
              Close
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
