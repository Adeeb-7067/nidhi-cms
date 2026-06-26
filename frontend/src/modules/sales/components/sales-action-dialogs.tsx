import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
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
  useListInstallments,
  type LeadStatus,
  type FollowUpType,
  type PaymentMethod,
  type CustomerType,
  type CustomerStatus,
} from "@/api/sales";
import { useListProjects, getListProjectsQueryKey } from "@/api/generated/api";
import type { User } from "@/api/generated/api.schemas";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  FOLLOW_UP_TYPE_OPTIONS,
} from "../constants";
import { useSalesStaff } from "../use-sales-staff";

// ─── Shared field wrapper ────────────────────────────────────────────────────

function SalesField({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Customer ───────────────────────────────────────────────────────────────

export function CustomerFormModal({
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
  const [gstin, setGstin] = useState("");
  const [website, setWebsite] = useState("");
  const [type, setType] = useState<CustomerType>("corporate");
  const [status, setStatus] = useState<CustomerStatus>("active");

  const reset = () => {
    setCompanyName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setLocation("");
    setGstin("");
    setWebsite("");
    setType("corporate");
    setStatus("active");
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

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
        gstin: gstin.trim() || null,
        website: website.trim() || null,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>Create a new customer record in the sales database.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="px-6 py-4 space-y-4">
            <SalesField label="Company name">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" required />
            </SalesField>
            <SalesField label="Contact person">
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Jane Smith" required />
            </SalesField>
            <SalesField label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" required />
            </SalesField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SalesField label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </SalesField>
              <SalesField label="Location">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai" />
              </SalesField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SalesField label="GSTIN">
                <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Optional" />
              </SalesField>
              <SalesField label="Website">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
              </SalesField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SalesField label="Type">
                <Select value={type} onValueChange={(v) => setType(v as CustomerType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesField>
              <SalesField label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as CustomerStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesField>
            </div>
          </DialogBody>
          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use CustomerFormModal */
export const CustomerFormDrawer = CustomerFormModal;

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

  useEffect(() => {
    if (!open) return;
    setType("call");
    setScheduledAt("");
    setNotes("");
    setExecutiveId("");
  }, [open]);

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
      <DialogContent className="sm:max-w-[420px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Schedule follow-up</DialogTitle>
          <DialogDescription>Set a callback, email, meeting, or demo for this lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <SalesField label="Type">
              <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
            <SalesField label="Scheduled at">
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
            </SalesField>
          </div>
          {staff.length > 0 && (
            <SalesField label="Executive">
              <Select value={executiveId || "none"} onValueChange={(v) => setExecutiveId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s: User) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
          )}
          <SalesField label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Talking points or context…" />
          </SalesField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createFollowUp.isPending}>
              {createFollowUp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
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

  useEffect(() => {
    if (!open) return;
    setDate(initialDate?.slice(0, 10) ?? "");
    setNote(initialNote ?? "");
  }, [open, initialDate, initialNote]);

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
      <DialogContent className="sm:max-w-[380px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{initialDate ? "Edit reminder" : "Set reminder"}</DialogTitle>
          <DialogDescription>You'll get a notification on this date to follow up.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </SalesField>
          <SalesField label="Note">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What to follow up on…" />
          </SalesField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={setReminder.isPending}>
              {setReminder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save reminder
            </Button>
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
  defaultPhone,
  defaultAddress,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  defaultEmail?: string | null;
  defaultCompany?: string | null;
  defaultPhone?: string | null;
  defaultAddress?: string | null;
}) {
  const convertLead = useConvertLead();
  const [portalEmail, setPortalEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState(defaultCompany ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [gstin, setGstin] = useState("");
  const [type, setType] = useState<CustomerType>("corporate");

  useEffect(() => {
    if (!open) return;
    setPortalEmail(defaultEmail ?? "");
    setCompanyName(defaultCompany ?? "");
    setPhone(defaultPhone ?? "");
    setAddress(defaultAddress ?? "");
    setPassword("");
    setWebsite("");
    setIndustry("");
    setGstin("");
    setType("corporate");
  }, [open, defaultEmail, defaultCompany, defaultPhone, defaultAddress]);

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
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
        location: address.trim() || undefined,
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
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Convert to customer</DialogTitle>
          <DialogDescription>
            Creates a client record and a portal login for this lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Portal login email">
            <Input type="email" value={portalEmail} onChange={(e) => setPortalEmail(e.target.value)} placeholder="client@company.com" required />
          </SalesField>
          <SalesField label="Portal password" hint="Minimum 8 characters. The client can change this after first login.">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </SalesField>
          <SalesField label="Company name">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
          </SalesField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SalesField label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </SalesField>
            <SalesField label="Industry">
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" />
            </SalesField>
          </div>
          <SalesField label="Address">
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Street, city, state…" />
          </SalesField>
          <SalesField label="Website">
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
          </SalesField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SalesField label="GSTIN">
              <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Optional" />
            </SalesField>
            <SalesField label="Customer type">
              <Select value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={convertLead.isPending}>
              {convertLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convert to customer
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
        <DialogContent className="sm:max-w-[360px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Assign {selectedIds.length} lead{selectedIds.length !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>Route these leads to a sales executive.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <SalesField label="Executive">
              <Select value={assignTo || "none"} onValueChange={setAssignTo}>
                <SelectTrigger><SelectValue placeholder="Select executive" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s: User) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button
                onClick={() => runBulk({ assignedTo: assignTo && assignTo !== "none" ? Number(assignTo) : null })}
                disabled={bulkUpdate.isPending}
              >
                {bulkUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-[360px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>Set the same status for {selectedIds.length} selected lead{selectedIds.length !== 1 ? "s" : ""}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <SalesField label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
              <Button onClick={() => runBulk({ status })} disabled={bulkUpdate.isPending}>
                {bulkUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply
              </Button>
            </DialogFooter>
          </div>
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
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>New installment plan</DialogTitle>
          <DialogDescription>Create a payment milestone tied to a project and customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Project">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {(projectsData as { projects?: Array<{ id: number; name: string }> } | undefined)?.projects?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SalesField>
          <SalesField label="Customer">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {(customersData?.customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SalesField>
          <SalesField label="Milestone name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Milestone 1 — Design" />
          </SalesField>
          <div className="grid grid-cols-2 gap-3">
            <SalesField label="Due amount (₹)">
              <Input type="number" min={0} value={dueAmount} onChange={(e) => setDueAmount(e.target.value)} placeholder="0" />
            </SalesField>
            <SalesField label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </SalesField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createInstallment.isPending}>
              {createInstallment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create installment
            </Button>
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
  const { data: proposalsData } = useListProposals(undefined, open);
  const { data: installmentsData } = useListInstallments(undefined, open);
  const projectParams = { limit: 200 };
  const { data: projectsData } = useListProjects(projectParams, {
    query: { queryKey: getListProjectsQueryKey(projectParams), enabled: open },
  });
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [proposalId, setProposalId] = useState("");

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setAmount("");
    setDueDate("");
    setProjectId("");
    setInstallmentId("");
    setProposalId("");
  }, [open]);

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
        projectId: projectId ? Number(projectId) : undefined,
        installmentId: installmentId ? Number(installmentId) : undefined,
        proposalId: proposalId ? Number(proposalId) : undefined,
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
      <DialogContent className="sm:max-w-[440px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Generate a new invoice for a customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Customer">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {(customersData?.customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SalesField>
          <div className="grid grid-cols-2 gap-3">
            <SalesField label="Amount (₹)">
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </SalesField>
            <SalesField label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </SalesField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SalesField label="Project" hint="Optional">
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(projectsData as { projects?: Array<{ id: number; name: string }> } | undefined)?.projects?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
            <SalesField label="Installment" hint="Optional">
              <Select value={installmentId || "none"} onValueChange={(v) => setInstallmentId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(installmentsData?.installments ?? []).map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
            <SalesField label="Proposal" hint="Optional">
              <Select value={proposalId || "none"} onValueChange={(v) => setProposalId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(proposalsData?.proposals ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create invoice
            </Button>
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
      <DialogContent className="sm:max-w-[420px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Invoice from proposal</DialogTitle>
          <DialogDescription>Convert an approved proposal into an invoice.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Approved proposal">
            <Select value={proposalId} onValueChange={setProposalId}>
              <SelectTrigger><SelectValue placeholder="Select proposal" /></SelectTrigger>
              <SelectContent>
                {approved.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.number} — {p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SalesField>
          <SalesField label="Due date" hint="Optional — leave blank to set it on the invoice later.">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </SalesField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createFromProposal.isPending}>
              {createFromProposal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create invoice
            </Button>
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
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>Log an incoming payment against an outstanding invoice.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Invoice">
            <Select value={invoiceId} onValueChange={setInvoiceId} disabled={!!defaultInvoiceId}>
              <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
              <SelectContent>
                {unpaid.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.number} — ₹{(i.amount - i.paidAmount).toLocaleString()} due
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SalesField>
          <div className="grid grid-cols-2 gap-3">
            <SalesField
              label="Amount (₹)"
              hint={maxAmount != null ? `Max: ₹${maxAmount.toLocaleString()}` : undefined}
            >
              <Input
                type="number"
                min={0}
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </SalesField>
            <SalesField label="Payment method">
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
          </div>
          <SalesField label="Transaction ID" hint="Optional — reference number, UTR, or cheque number.">
            <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. UTR123456789" />
          </SalesField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
