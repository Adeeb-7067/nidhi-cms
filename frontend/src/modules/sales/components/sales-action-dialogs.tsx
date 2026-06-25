import { useState } from "react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateCustomer,
  useCreateInstallment,
  useCreateInvoice,
  useCreateInvoiceFromProposal,
  useCreateFollowUp,
  useConvertLead,
  useSetLeadReminder,
  useRecordPayment,
  useBulkUpdateLeads,
  useListCustomers,
  useListProposals,
  useListInvoices,
  type LeadStatus,
  type FollowUpType,
  type PaymentMethod,
  type CustomerType,
  type CustomerStatus,
} from "@/api/sales";
import { useListProjects, getListProjectsQueryKey } from "@/api/generated/api";
import type { User } from "@/api/generated/api.schemas";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "../constants";
import { useSalesStaff } from "../use-sales-staff";

// ─── Customer ───────────────────────────────────────────────────────────────

export function CustomerFormDrawer({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const createCustomer = useCreateCustomer();
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<CustomerType>("corporate");
  const [status, setStatus] = useState<CustomerStatus>("active");

  const reset = () => {
    setCompanyName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setLocation("");
    setType("corporate");
    setStatus("active");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !email.trim()) {
      toast.error("Company name, contact person, and email are required");
      return;
    }
    try {
      await createCustomer.mutateAsync({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        type,
        status,
      });
      toast.success("Customer created");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to create customer");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add customer</SheetTitle>
          <SheetDescription>Create a new customer record in the sales database.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Contact person</Label>
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="sme">SME</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CustomerStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="pt-2">
            <Button type="submit" className="w-full sm:w-auto" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? "Saving…" : "Create customer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Follow-up ────────────────────────────────────────────────────────────

export function FollowUpDialog({
  open,
  onOpenChange,
  leadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
}) {
  const createFollowUp = useCreateFollowUp();
  const { staff } = useSalesStaff();
  const [type, setType] = useState<FollowUpType>("call");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [executiveId, setExecutiveId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      toast.error("Scheduled date/time is required");
      return;
    }
    try {
      await createFollowUp.mutateAsync({
        leadId,
        type,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || undefined,
        executiveId: executiveId ? Number(executiveId) : undefined,
      });
      toast.success("Follow-up scheduled");
      onOpenChange(false);
      setNotes("");
      setScheduledAt("");
    } catch (err) {
      toastApiError(err, "Failed to schedule follow-up");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule follow-up</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scheduled at</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
          </div>
          {staff.length > 0 && (
            <div className="space-y-2">
              <Label>Executive</Label>
              <Select value={executiveId || "none"} onValueChange={(v) => setExecutiveId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s: User) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createFollowUp.isPending}>
              {createFollowUp.isPending ? "Saving…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reminder ─────────────────────────────────────────────────────────────

export function LeadReminderDialog({
  open,
  onOpenChange,
  leadId,
  initialDate,
  initialNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  initialDate?: string;
  initialNote?: string;
}) {
  const setReminder = useSetLeadReminder();
  const [date, setDate] = useState(initialDate?.slice(0, 10) ?? "");
  const [note, setNote] = useState(initialNote ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Reminder date is required");
      return;
    }
    try {
      await setReminder.mutateAsync({ id: leadId, date, note: note.trim() || undefined });
      toast.success("Reminder saved");
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to save reminder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initialDate ? "Edit reminder" : "Set reminder"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={setReminder.isPending}>Save reminder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Convert lead ─────────────────────────────────────────────────────────

export function ConvertLeadDialog({
  open,
  onOpenChange,
  leadId,
  defaultEmail,
  defaultCompany,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  defaultEmail?: string | null;
  defaultCompany?: string | null;
}) {
  const convertLead = useConvertLead();
  const [portalEmail, setPortalEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState(defaultCompany ?? "");
  const [gstin, setGstin] = useState("");
  const [type, setType] = useState<CustomerType>("corporate");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalEmail.trim() || password.length < 8) {
      toast.error("Portal email and password (min 8 chars) are required");
      return;
    }
    try {
      const result = await convertLead.mutateAsync({
        id: leadId,
        portalEmail: portalEmail.trim(),
        password,
        companyName: companyName.trim() || undefined,
        gstin: gstin.trim() || undefined,
        type,
      });
      toast.success("Lead converted to customer");
      onOpenChange(false);
      if (result.customerId) {
        window.location.href = `/sales/customers/${result.customerId}`;
      }
    } catch (err) {
      toastApiError(err, "Failed to convert lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Convert to customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Portal login email</Label>
            <Input type="email" value={portalEmail} onChange={(e) => setPortalEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Portal password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="sme">SME</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={convertLead.isPending}>
              {convertLead.isPending ? "Converting…" : "Convert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk lead actions ────────────────────────────────────────────────────

export function BulkLeadActions({
  selectedIds,
  onClear,
}: {
  selectedIds: number[];
  onClear: () => void;
}) {
  const bulkUpdate = useBulkUpdateLeads();
  const { staff } = useSalesStaff();
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [status, setStatus] = useState<LeadStatus>("contacted");

  const runBulk = async (payload: { status?: LeadStatus; assignedTo?: number | null }) => {
    try {
      await bulkUpdate.mutateAsync({ ids: selectedIds, ...payload });
      toast.success(`Updated ${selectedIds.length} lead(s)`);
      onClear();
      setAssignOpen(false);
      setStatusOpen(false);
    } catch (err) {
      toastApiError(err, "Bulk update failed");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAssignOpen(true)}>
        Assign executive
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setStatusOpen(true)}>
        Change status
      </Button>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign {selectedIds.length} lead(s)</DialogTitle></DialogHeader>
          <Select value={assignTo || "none"} onValueChange={setAssignTo}>
            <SelectTrigger><SelectValue placeholder="Select executive" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {staff.map((s: User) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              onClick={() =>
                runBulk({ assignedTo: assignTo && assignTo !== "none" ? Number(assignTo) : null })
              }
              disabled={bulkUpdate.isPending}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change status for {selectedIds.length} lead(s)</DialogTitle></DialogHeader>
          <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={() => runBulk({ status })} disabled={bulkUpdate.isPending}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Installment ──────────────────────────────────────────────────────────

export function CreateInstallmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createInstallment = useCreateInstallment();
  const { data: customersData } = useListCustomers(undefined, open);
  const projectParams = { limit: 200 };
  const { data: projectsData } = useListProjects(projectParams, {
    query: { queryKey: getListProjectsQueryKey(projectParams), enabled: open },
  });
  const [projectId, setProjectId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !customerId || !name.trim() || !dueAmount || !dueDate) {
      toast.error("All fields are required");
      return;
    }
    try {
      await createInstallment.mutateAsync({
        projectId: Number(projectId),
        customerId: Number(customerId),
        name: name.trim(),
        dueAmount: Number(dueAmount),
        dueDate,
      });
      toast.success("Installment created");
      onOpenChange(false);
      setName("");
      setDueAmount("");
    } catch (err) {
      toastApiError(err, "Failed to create installment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New installment plan</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {(projectsData as { projects?: Array<{ id: number; name: string }> } | undefined)?.projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {(customersData?.customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Milestone 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due amount (₹)</Label>
              <Input type="number" min={0} value={dueAmount} onChange={(e) => setDueAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createInstallment.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoice ──────────────────────────────────────────────────────────────

export function CreateInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createInvoice = useCreateInvoice();
  const { data: customersData } = useListCustomers(undefined, open);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount || !dueDate) {
      toast.error("Customer, amount, and due date are required");
      return;
    }
    try {
      const inv = await createInvoice.mutateAsync({
        customerId: Number(customerId),
        amount: Number(amount),
        dueDate,
      });
      toast.success(`Invoice ${inv.number} created`);
      onOpenChange(false);
      window.location.href = `/sales/invoices/${inv.id}`;
    } catch (err) {
      toastApiError(err, "Failed to create invoice");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {(customersData?.customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createInvoice.isPending}>Create invoice</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InvoiceFromProposalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createFromProposal = useCreateInvoiceFromProposal();
  const { data: proposalsData } = useListProposals({ status: "approved" }, open);
  const [proposalId, setProposalId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalId) {
      toast.error("Select a proposal");
      return;
    }
    try {
      const inv = await createFromProposal.mutateAsync({
        proposalId: Number(proposalId),
        dueDate: dueDate || undefined,
      });
      toast.success(`Invoice ${inv.number} created from proposal`);
      onOpenChange(false);
      window.location.href = `/sales/invoices/${inv.id}`;
    } catch (err) {
      toastApiError(err, "Failed to create invoice from proposal");
    }
  };

  const approved = (proposalsData?.proposals ?? []).filter((p) => p.status === "approved");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invoice from proposal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Approved proposal</Label>
            <Select value={proposalId} onValueChange={setProposalId}>
              <SelectTrigger><SelectValue placeholder="Select proposal" /></SelectTrigger>
              <SelectContent>
                {approved.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.number} — {p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Due date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createFromProposal.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment ──────────────────────────────────────────────────────────────

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultInvoiceId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultInvoiceId?: number;
  onSuccess?: (paymentId: number) => void;
}) {
  const recordPayment = useRecordPayment();
  const { data: invoicesData } = useListInvoices(undefined, open);
  const unpaid = (invoicesData?.invoices ?? []).filter((i) => i.status !== "paid");
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ? String(defaultInvoiceId) : "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [transactionId, setTransactionId] = useState("");

  const selectedInvoice = unpaid.find((i) => String(i.id) === invoiceId);
  const maxAmount = selectedInvoice
    ? Math.max(0, selectedInvoice.amount - selectedInvoice.paidAmount)
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !amount) {
      toast.error("Invoice and amount are required");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const payment = await recordPayment.mutateAsync({
        invoiceId: Number(invoiceId),
        amount: amt,
        paymentMethod,
        transactionId: transactionId.trim() || undefined,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
      setAmount("");
      onSuccess?.(payment.id);
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Invoice</Label>
            <Select
              value={invoiceId}
              onValueChange={setInvoiceId}
              disabled={!!defaultInvoiceId}
            >
              <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
              <SelectContent>
                {unpaid.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.number} — ₹{(i.amount - i.paidAmount).toLocaleString()} due
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (₹){maxAmount != null && <span className="text-muted-foreground font-normal"> — max {maxAmount}</span>}</Label>
            <Input
              type="number"
              min={0}
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transaction ID</Label>
            <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={recordPayment.isPending}>Record payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
