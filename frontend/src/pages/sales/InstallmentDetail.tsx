import { useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, IndianRupee, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getInstallmentById,
  getPartialPaymentsByInstallment,
  getProjectById,
} from "@/modules/sales/mock-data";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesStatusBadge,
  SalesEmptyState,
  InstallmentProgress,
  PaymentHistoryTable,
  PaymentTimeline,
  OutstandingBadge,
} from "@/modules/sales/components";
import { toast } from "sonner";

export default function InstallmentDetailPage() {
  const [, params] = useRoute("/sales/installments/:id");
  const installmentId = Number(params?.id);
  const installment = getInstallmentById(installmentId);
  const payments = getPartialPaymentsByInstallment(installmentId);
  const project = installment ? getProjectById(installment.projectId) : undefined;
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("bank_transfer");
  const [open, setOpen] = useState(false);

  if (!installment) {
    return (
      <SalesEmptyState
        title="Installment not found"
        description={`No installment #${installmentId} in demo data.`}
        actionLabel="Back to installments"
        onAction={() => window.history.back()}
      />
    );
  }

  const remaining = calcRemaining(installment.dueAmount, installment.paidAmount);

  const handleRecordPayment = () => {
    toast.success(`Payment of ${formatCurrency(Number(amount) || 0)} recorded (demo)`);
    setOpen(false);
    setAmount("");
  };

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={installment.name}
        description={`${installment.projectName} · ${installment.customerName}`}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Installments", href: "/sales/installments" },
          { label: installment.name },
        ]}
        actions={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/sales/installments">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SalesStatusBadge variant="installment" value={installment.status} />
        <OutstandingBadge amount={remaining} />
        {installment.invoiceNumber && (
          <Link href={`/sales/invoices/${installment.invoiceId}`} className="text-xs text-primary hover:underline font-mono">
            {installment.invoiceNumber}
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Installment progress</CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5" disabled={remaining <= 0}>
                    <Plus className="h-3.5 w-3.5" />
                    Record payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record partial payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="rounded-lg bg-muted/40 p-3 text-xs">
                      Remaining balance: <span className="font-bold">{formatCurrency(remaining)}</span>
                    </div>
                    <div>
                      <Label className="text-xs">Amount (INR)</Label>
                      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Payment mode</Label>
                      <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Transaction ID</Label>
                      <Input placeholder="NEFT-xxx" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea placeholder="Optional notes…" className="mt-1 min-h-[72px]" />
                    </div>
                    <Button className="w-full" onClick={handleRecordPayment}>
                      <IndianRupee className="h-4 w-4 mr-1.5" />
                      Save payment & generate receipt
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <InstallmentProgress paid={installment.paidAmount} total={installment.dueAmount} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><p className="text-muted-foreground">Due amount</p><p className="font-bold">{formatCurrency(installment.dueAmount)}</p></div>
                <div><p className="text-muted-foreground">Paid</p><p className="font-bold text-emerald-700">{formatCurrency(installment.paidAmount)}</p></div>
                <div><p className="text-muted-foreground">Remaining</p><p className="font-bold text-amber-700">{formatCurrency(remaining)}</p></div>
                <div><p className="text-muted-foreground">Due date</p><p className="font-medium">{format(new Date(installment.dueDate), "MMM d, yyyy")}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment history</CardTitle></CardHeader>
            <CardContent><PaymentHistoryTable payments={payments} /></CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {project && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Project summary</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <p className="font-semibold">{project.name}</p>
                <InstallmentProgress paid={project.paidAmount} total={project.totalAmount} />
                <p className="text-muted-foreground">Total {formatCurrency(project.totalAmount)}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment timeline</CardTitle></CardHeader>
            <CardContent><PaymentTimeline payments={payments} /></CardContent>
          </Card>
        </div>
      </div>
    </PortalPageShell>
  );
}
