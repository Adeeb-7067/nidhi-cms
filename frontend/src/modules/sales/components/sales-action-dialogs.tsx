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
  TotalAmountAdjustFields,
  totalAdjustPayload,
} from "./total-amount-adjust";
import { resolveProposalTotal } from "@/modules/sales/utils";
import {
  useCreateCustomer,
  useUpdateCustomer,
  useRemindCustomer,
  useProvisionCustomerPortal,
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
  type Customer,
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

const EMPTY_CUSTOMER_FORM = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  location: "",
  gstin: "",
  website: "",
  type: "corporate" as CustomerType,
  status: "active" as CustomerStatus,
};

function customerToFormValues(customer: Customer) {
  return {
    companyName: customer.companyName,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone ?? "",
    location: customer.location ?? "",
    gstin: customer.gstin ?? "",
    website: customer.website ?? "",
    type: customer.type,
    status: customer.status,
  };
}

function CustomerFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function CustomerFormModal({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: () => void;
}) {
  const isEdit = customer != null;
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const [companyName, setCompanyName] = useState(EMPTY_CUSTOMER_FORM.companyName);
  const [contactPerson, setContactPerson] = useState(EMPTY_CUSTOMER_FORM.contactPerson);
  const [email, setEmail] = useState(EMPTY_CUSTOMER_FORM.email);
  const [phone, setPhone] = useState(EMPTY_CUSTOMER_FORM.phone);
  const [location, setLocation] = useState(EMPTY_CUSTOMER_FORM.location);
  const [gstin, setGstin] = useState(EMPTY_CUSTOMER_FORM.gstin);
  const [website, setWebsite] = useState(EMPTY_CUSTOMER_FORM.website);
  const [type, setType] = useState<CustomerType>(EMPTY_CUSTOMER_FORM.type);
  const [status, setStatus] = useState<CustomerStatus>(EMPTY_CUSTOMER_FORM.status);

  useEffect(() => {
    if (!open) return;
    const values = customer ? customerToFormValues(customer) : EMPTY_CUSTOMER_FORM;
    setCompanyName(values.companyName);
    setContactPerson(values.contactPerson);
    setEmail(values.email);
    setPhone(values.phone);
    setLocation(values.location);
    setGstin(values.gstin);
    setWebsite(values.website);
    setType(values.type);
    setStatus(values.status);
  }, [open, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !email.trim()) {
      toast.error("Company name, contact person, and email are required");
      return;
    }
    const payload = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      location: location.trim() || null,
      gstin: gstin.trim() || null,
      website: website.trim() || null,
      type,
      status,
    };
    try {
      if (isEdit && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload });
        toast.success(`Customer "${payload.companyName}" updated`);
      } else {
        await createCustomer.mutateAsync(payload);
        toast.success(`Customer "${payload.companyName}" created`);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update customer" : "Failed to create customer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update company profile, contact details, and classification."
              : "Create a new customer record in the sales database."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="px-6 py-4 space-y-5 max-h-[min(70vh,560px)] overflow-y-auto">
            <CustomerFormSection title="Company & contact">
              <SalesField label="Company name">
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" required />
              </SalesField>
              <SalesField label="Contact person">
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Jane Smith" required />
              </SalesField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SalesField label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" required />
                </SalesField>
                <SalesField label="Phone">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                </SalesField>
              </div>
            </CustomerFormSection>

            <CustomerFormSection title="Address & web">
              <SalesField label="Location / address">
                <Textarea
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  rows={2}
                  placeholder="Street, city, state, pin code…"
                />
              </SalesField>
              <SalesField label="Website">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
              </SalesField>
            </CustomerFormSection>

            <CustomerFormSection title="Tax & classification">
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
            </CustomerFormSection>

            {isEdit && (customer?.leadId || customer?.clientId || customer?.portalUserId) ? (
              <CustomerFormSection title="Linked records">
                <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-1">
                  {customer.leadId ? <p>Source lead: #{customer.leadId}</p> : null}
                  {customer.clientId ? <p>Client record: #{customer.clientId}</p> : null}
                  {customer.portalUserId ? <p>Portal user: #{customer.portalUserId}</p> : null}
                  <p className="text-[10px]">These links are set during lead conversion and cannot be edited here.</p>
                </div>
              </CustomerFormSection>
            ) : null}
          </DialogBody>
          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerRemindDialog({
  open,
  onOpenChange,
  customerId,
  customerEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerEmail: string;
}) {
  const remindCustomer = useRemindCustomer();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) setMessage("");
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await remindCustomer.mutateAsync({
        id: customerId,
        message: message.trim() || undefined,
      });
      if (result.emailSent) {
        toast.success(`Payment reminder emailed to ${customerEmail}`);
      } else {
        toast.warning(
          `Reminder logged but email was not sent${result.emailReason ? ` (${result.emailReason})` : ""}. Configure SMTP to enable delivery.`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to send reminder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Send payment reminder</DialogTitle>
          <DialogDescription>
            Notify {customerEmail} about their outstanding balance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SalesField label="Message" hint="Leave blank to use the default reminder text.">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="You have a pending payment. Please review your account."
            />
          </SalesField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={remindCustomer.isPending}>
              {remindCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerProvisionPortalDialog({
  open,
  onOpenChange,
  customerId,
  defaultEmail,
  defaultCompany,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  defaultEmail?: string | null;
  defaultCompany?: string | null;
  onSuccess?: () => void;
}) {
  const provisionPortal = useProvisionCustomerPortal();
  const [portalEmail, setPortalEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState(defaultCompany ?? "");
  const [industry, setIndustry] = useState("");

  useEffect(() => {
    if (!open) return;
    setPortalEmail(defaultEmail ?? "");
    setCompanyName(defaultCompany ?? "");
    setPassword("");
    setIndustry("");
  }, [open, defaultEmail, defaultCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalEmail.trim() || password.length < 8) {
      toast.error("Portal email and password (min 8 chars) are required");
      return;
    }
    try {
      await provisionPortal.mutateAsync({
        id: customerId,
        portalEmail: portalEmail.trim(),
        password,
        companyName: companyName.trim() || undefined,
        industry: industry.trim() || undefined,
      });
      toast.success("Client portal access enabled");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to provision portal access");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Enable client portal</DialogTitle>
          <DialogDescription>
            Creates a client record and portal login for this customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Portal login email">
            <Input type="email" value={portalEmail} onChange={(e) => setPortalEmail(e.target.value)} required />
          </SalesField>
          <SalesField label="Portal password" hint="Minimum 8 characters.">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </SalesField>
          <SalesField label="Company name">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Optional override" />
          </SalesField>
          <SalesField label="Industry">
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" />
          </SalesField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={provisionPortal.isPending}>
              {provisionPortal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enable portal
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
  const [baseAmount, setBaseAmount] = useState("");
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const calculatedAmount = Number(baseAmount) || 0;
  const finalDueAmount = totalAdjustPayload(
    calculatedAmount,
    totalAdjustment,
    useCustomTotal,
    adjustedTotal,
  ).dueAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !customerId || !name.trim() || !baseAmount || !dueDate) {
      toast.error("All fields are required");
      return;
    }
    try {
      const payload = totalAdjustPayload(
        calculatedAmount,
        totalAdjustment,
        useCustomTotal,
        adjustedTotal,
      );
      await createInstallment.mutateAsync({
        projectId: Number(projectId),
        customerId: Number(customerId),
        name: name.trim(),
        dueAmount: payload.dueAmount,
        calculatedAmount: payload.calculatedAmount,
        totalAdjustment: payload.totalAdjustment ?? 0,
        adjustedTotal: payload.adjustedTotal,
        dueDate,
      });
      toast.success("Installment created");
      onOpenChange(false);
      setName("");
      setBaseAmount("");
      setTotalAdjustment(0);
      setAdjustedTotal(null);
      setUseCustomTotal(false);
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
            <SalesField label="Base amount (₹)">
              <Input type="number" min={0} value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder="0" />
            </SalesField>
            <SalesField label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </SalesField>
          </div>
          <TotalAmountAdjustFields
            calculatedTotal={calculatedAmount}
            totalAdjustment={totalAdjustment}
            onTotalAdjustmentChange={setTotalAdjustment}
            adjustedTotal={adjustedTotal}
            onAdjustedTotalChange={setAdjustedTotal}
            useCustomTotal={useCustomTotal}
            onUseCustomTotalChange={setUseCustomTotal}
            finalTotal={finalDueAmount}
            compact
          />
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
  const [baseAmount, setBaseAmount] = useState("");
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [proposalId, setProposalId] = useState("");

  const calculatedAmount = Number(baseAmount) || 0;
  const finalAmount = totalAdjustPayload(
    calculatedAmount,
    totalAdjustment,
    useCustomTotal,
    adjustedTotal,
  ).amount;

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setBaseAmount("");
    setTotalAdjustment(0);
    setAdjustedTotal(null);
    setUseCustomTotal(false);
    setDueDate("");
    setProjectId("");
    setInstallmentId("");
    setProposalId("");
  }, [open]);

  useEffect(() => {
    if (!proposalId || proposalId === "none") return;
    const proposal = (proposalsData?.proposals ?? []).find((p) => String(p.id) === proposalId);
    if (!proposal) return;
    const { finalTotal } = resolveProposalTotal(proposal);
    setBaseAmount(String(finalTotal));
    setTotalAdjustment(0);
    setAdjustedTotal(null);
    setUseCustomTotal(false);
    if (proposal.customerId) setCustomerId(String(proposal.customerId));
    if (proposal.projectId) setProjectId(String(proposal.projectId));
  }, [proposalId, proposalsData?.proposals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !baseAmount || !dueDate) {
      toast.error("Customer, amount, and due date are required");
      return;
    }
    try {
      const payload = totalAdjustPayload(
        calculatedAmount,
        totalAdjustment,
        useCustomTotal,
        adjustedTotal,
      );
      const inv = await createInvoice.mutateAsync({
        customerId: Number(customerId),
        amount: payload.amount,
        calculatedAmount: payload.calculatedAmount,
        totalAdjustment: payload.totalAdjustment ?? 0,
        adjustedTotal: payload.adjustedTotal,
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
            <SalesField label="Base amount (₹)">
              <Input type="number" min={0} value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder="0" />
            </SalesField>
            <SalesField label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </SalesField>
          </div>
          <TotalAmountAdjustFields
            calculatedTotal={calculatedAmount}
            totalAdjustment={totalAdjustment}
            onTotalAdjustmentChange={setTotalAdjustment}
            adjustedTotal={adjustedTotal}
            onAdjustedTotalChange={setAdjustedTotal}
            useCustomTotal={useCustomTotal}
            onUseCustomTotalChange={setUseCustomTotal}
            finalTotal={finalAmount}
            compact
          />
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
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);

  const selectedProposal = (proposalsData?.proposals ?? []).find(
    (p) => String(p.id) === proposalId && p.status === "approved",
  );
  const calculatedAmount = selectedProposal ? resolveProposalTotal(selectedProposal).finalTotal : 0;
  const finalAmount = totalAdjustPayload(
    calculatedAmount,
    totalAdjustment,
    useCustomTotal,
    adjustedTotal,
  ).amount;

  useEffect(() => {
    if (!open) return;
    setProposalId("");
    setDueDate("");
    setTotalAdjustment(0);
    setAdjustedTotal(null);
    setUseCustomTotal(false);
  }, [open]);

  useEffect(() => {
    setTotalAdjustment(0);
    setAdjustedTotal(null);
    setUseCustomTotal(false);
  }, [proposalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalId) {
      toast.error("Select a proposal");
      return;
    }
    try {
      const payload = totalAdjustPayload(
        calculatedAmount,
        totalAdjustment,
        useCustomTotal,
        adjustedTotal,
      );
      const inv = await createFromProposal.mutateAsync({
        proposalId: Number(proposalId),
        dueDate: dueDate || undefined,
        totalAdjustment: payload.totalAdjustment ?? 0,
        adjustedTotal: payload.adjustedTotal,
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
          {selectedProposal && (
            <TotalAmountAdjustFields
              calculatedTotal={calculatedAmount}
              totalAdjustment={totalAdjustment}
              onTotalAdjustmentChange={setTotalAdjustment}
              adjustedTotal={adjustedTotal}
              onAdjustedTotalChange={setAdjustedTotal}
              useCustomTotal={useCustomTotal}
              onUseCustomTotalChange={setUseCustomTotal}
              finalTotal={finalAmount}
              compact
            />
          )}
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
