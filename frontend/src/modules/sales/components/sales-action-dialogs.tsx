import { useState, useEffect } from "react";
import { addDays, format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError, parseApiError } from "@/lib/api-error";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { phoneValidationError, normalizePhoneForSubmit } from "@/lib/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  useCreateInstallmentsFromProposal,
  useCreateInvoice,
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
  type Proposal,
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
  formatCurrency,
} from "../constants";
import { useSalesStaff } from "../use-sales-staff";

// ─── Shared field wrapper ────────────────────────────────────────────────────

function SalesField({
  label,
  children,
  hint,
  className,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
  error?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive leading-snug">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
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
  const [enablePortal, setEnablePortal] = useState(true);
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [industry, setIndustry] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const inputErrorClass = (field: string) =>
    fieldErrors[field] ? "border-destructive focus-visible:ring-destructive" : undefined;

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
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
    if (!customer) {
      setEnablePortal(true);
      setPortalEmail("");
      setPortalPassword("");
      setIndustry("");
    }
  }, [open, customer]);

  useEffect(() => {
    if (!enablePortal || isEdit) return;
    if (!portalEmail.trim() && email.trim()) {
      setPortalEmail(email.trim());
    }
  }, [email, enablePortal, isEdit, portalEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!companyName.trim() || !contactPerson.trim() || !email.trim()) {
      toast.error("Company name, contact person, and email are required");
      return;
    }
    const phoneErr = phoneValidationError(phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    if (!isEdit && enablePortal) {
      if (!portalEmail.trim()) {
        toast.error("Portal login email is required when portal access is enabled");
        return;
      }
      if (portalPassword.length < 8) {
        toast.error("Portal password must be at least 8 characters");
        return;
      }
    }
    const payload = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: normalizePhoneForSubmit(phone) || null,
      location: location.trim() || null,
      gstin: gstin.trim() || null,
      website: website.trim() || null,
      type,
      status,
      ...(!isEdit
        ? enablePortal
          ? {
              enablePortal: true,
              portalEmail: portalEmail.trim(),
              password: portalPassword,
              industry: industry.trim() || null,
            }
          : { enablePortal: false }
        : {}),
    };
    try {
      if (isEdit && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...payload });
        toast.success(`Customer "${payload.companyName}" updated`);
      } else {
        const created = await createCustomer.mutateAsync(payload);
        if (enablePortal) {
          toast.success(`Customer "${payload.companyName}" created with portal access`);
        } else {
          toast.success(`Customer "${payload.companyName}" created`);
        }
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const parsed = parseApiError(
        err,
        isEdit ? "Failed to update customer" : "Failed to create customer",
      );
      if (parsed.field) {
        setFieldErrors({ [parsed.field]: parsed.message });
      }
      toast.error(parsed.message);
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
              : "Creates one company record for Sales and Admin → Companies. Portal access is enabled by default — set a login password before saving."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogBody className="px-6 py-4 space-y-5">
            <CustomerFormSection title="Company & contact">
              <SalesField label="Company name">
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" required />
              </SalesField>
              <SalesField label="Contact person">
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Jane Smith" required />
              </SalesField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SalesField label="Email" error={fieldErrors.email}>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    placeholder="jane@acme.com"
                    required
                    className={inputErrorClass("email")}
                  />
                </SalesField>
                <SalesField label="Phone">
                  <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} />
                </SalesField>
              </div>
            </CustomerFormSection>

            {!isEdit ? (
              <CustomerFormSection title="Client portal">
                <Alert className="bg-muted/40 border-border/60">
                  <AlertDescription className="text-xs leading-relaxed">
                    Recommended: create the company with portal login so it appears active under Admin → Companies.
                    Turn off only if you will add portal access later from the customer detail page.
                  </AlertDescription>
                </Alert>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Enable client portal</p>
                    <p className="text-[11px] text-muted-foreground">
                      Portal login on the same company record (on by default)
                    </p>
                  </div>
                  <Switch checked={enablePortal} onCheckedChange={setEnablePortal} />
                </div>
                {enablePortal ? (
                  <div className="space-y-3 pt-1">
                    <SalesField
                      label="Portal login email"
                      hint="Defaults to contact email; can differ from billing email."
                      error={fieldErrors.portalEmail}
                    >
                      <Input
                        type="email"
                        value={portalEmail}
                        onChange={(e) => {
                          setPortalEmail(e.target.value);
                          clearFieldError("portalEmail");
                        }}
                        placeholder="login@company.com"
                        required
                        className={inputErrorClass("portalEmail")}
                      />
                    </SalesField>
                    <SalesField
                      label="Portal password"
                      hint="Required — minimum 8 characters. Share securely with the client."
                      error={fieldErrors.password}
                    >
                      <PasswordInput
                        value={portalPassword}
                        onChange={(e) => {
                          setPortalPassword(e.target.value);
                          clearFieldError("password");
                        }}
                        minLength={8}
                        required
                        autoComplete="new-password"
                        className={inputErrorClass("password")}
                      />
                    </SalesField>
                    <SalesField label="Industry">
                      <Input
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g. Technology, Hospitality"
                      />
                    </SalesField>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Without portal login, the company will show in Admin → Companies as non-portal until you enable access later.
                  </p>
                )}
              </CustomerFormSection>
            ) : null}

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

            {isEdit && (customer?.leadId || customer?.portalUserId) ? (
              <CustomerFormSection title="Linked records">
                <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-1">
                  {customer.leadId ? <p>Source lead: #{customer.leadId}</p> : null}
                  <p>Company record: #{customer.id}</p>
                  {customer.portalUserId ? (
                    <p>Portal access enabled (user #{customer.portalUserId})</p>
                  ) : (
                    <p>Portal access not enabled yet</p>
                  )}
                  <p className="text-[10px]">Lead link is set during conversion. Use Enable portal for login setup.</p>
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
              {isEdit ? "Save changes" : enablePortal ? "Create customer & portal" : "Create customer"}
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
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
      const parsed = parseApiError(err, "Failed to provision portal access");
      if (parsed.field) {
        setFieldErrors({ [parsed.field]: parsed.message });
      }
      toast.error(parsed.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Enable client portal</DialogTitle>
          <DialogDescription>
            Creates one company record used in both Sales and Admin. Optionally enable the client portal now.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SalesField label="Portal login email" error={fieldErrors.portalEmail}>
            <Input
              type="email"
              value={portalEmail}
              onChange={(e) => {
                setPortalEmail(e.target.value);
                setFieldErrors((prev) => {
                  if (!prev.portalEmail) return prev;
                  const next = { ...prev };
                  delete next.portalEmail;
                  return next;
                });
              }}
              required
              className={fieldErrors.portalEmail ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
          </SalesField>
          <SalesField label="Portal password" hint="Minimum 8 characters." error={fieldErrors.password}>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => {
                  if (!prev.password) return prev;
                  const next = { ...prev };
                  delete next.password;
                  return next;
                });
              }}
              minLength={8}
              required
              className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
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
  const [type, setType] = useState<FollowUpType>("call");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setType("call");
    setScheduledAt("");
    setNotes("");
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      toast.error("Scheduled date is required");
      return;
    }
    try {
      await createFollowUp.mutateAsync({
        leadId,
        type,
        scheduledAt,
        notes: notes.trim() || undefined,
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
      <DialogContent className="sm:max-w-[380px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Schedule follow-up</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <SalesField label="Type">
              <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SalesField>
            <SalesField label="Date">
              <Input type="date" className="h-9" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
            </SalesField>
          </div>
          <SalesField label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Brief note…" />
          </SalesField>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createFollowUp.isPending}>
              {createFollowUp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
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
  const [date, setDate] = useState(initialDate?.slice(0, 16) ?? "");
  const [note, setNote] = useState(initialNote ?? "");

  useEffect(() => {
    if (!open) return;
    setDate(initialDate?.slice(0, 16) ?? "");
    setNote(initialNote ?? "");
  }, [open, initialDate, initialNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Reminder date & time is required");
      return;
    }
    try {
      await setReminder.mutateAsync({ id: leadId, date: new Date(date).toISOString(), note: note.trim() || undefined });
      toast.success("Reminder saved");
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to save reminder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{initialDate ? "Edit reminder" : "Set reminder"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <SalesField label="When">
            <Input type="datetime-local" className="h-9" value={date} onChange={(e) => setDate(e.target.value)} required />
          </SalesField>
          <SalesField label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What to follow up on…" />
          </SalesField>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={setReminder.isPending}>
              {setReminder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
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
    const phoneErr = phoneValidationError(phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    try {
      const result = await convertLead.mutateAsync({
        id: leadId,
        portalEmail: portalEmail.trim(),
        password,
        companyName: companyName.trim() || undefined,
        phone: normalizePhoneForSubmit(phone) || undefined,
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
              <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} />
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
  defaultCustomerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerId?: number;
}) {
  const createInstallment = useCreateInstallment();
  const { data: customersData } = useListCustomers({ limit: 200 }, open);
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

  useEffect(() => {
    if (!open) return;
    setCustomerId(defaultCustomerId ? String(defaultCustomerId) : "");
  }, [open, defaultCustomerId]);

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
  defaultCustomerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerId?: number;
}) {
  const createInvoice = useCreateInvoice();
  const { data: customersData } = useListCustomers({ limit: 200 }, open);
  const { data: proposalsData } = useListProposals({ limit: 200 }, open);
  const { data: installmentsData } = useListInstallments({ limit: 200 }, open);
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
    setCustomerId(defaultCustomerId ? String(defaultCustomerId) : "");
    setBaseAmount("");
    setTotalAdjustment(0);
    setAdjustedTotal(null);
    setUseCustomTotal(false);
    setDueDate("");
    setProjectId("");
    setInstallmentId("");
    setProposalId("");
  }, [open, defaultCustomerId]);

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

type ScheduleRow = { name: string; amount: string; dueDate: string };

function buildDefaultScheduleRows(proposalTotal: number): ScheduleRow[] {
  const today = new Date();
  const labels = ["Advance", "Development", "Final"];
  const offsets = [0, 30, 60];
  const pct = [0.4, 0.4, 0.2];
  const amounts = pct.map((p) => Math.round(proposalTotal * p));
  amounts[amounts.length - 1] += proposalTotal - amounts.reduce((sum, n) => sum + n, 0);
  return labels.map((name, i) => ({
    name,
    amount: String(amounts[i]),
    dueDate: format(addDays(today, offsets[i]), "yyyy-MM-dd"),
  }));
}

export function InstallmentsFromProposalDialog({
  open,
  onOpenChange,
  proposal,
  proposalTotal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Pick<Proposal, "id" | "number" | "title" | "customerId">;
  proposalTotal: number;
}) {
  const createSchedule = useCreateInstallmentsFromProposal();
  const [rows, setRows] = useState<ScheduleRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setRows(buildDefaultScheduleRows(proposalTotal));
  }, [open, proposalTotal]);

  const scheduledTotal = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const diff = proposalTotal - scheduledTotal;
  const balanced = Math.abs(diff) <= 1;

  const updateRow = (index: number, patch: Partial<ScheduleRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        name: `Milestone ${prev.length + 1}`,
        amount: diff > 0 ? String(Math.max(0, Math.round(diff))) : "0",
        dueDate: format(addDays(new Date(), 30 * (prev.length + 1)), "yyyy-MM-dd"),
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal.customerId) {
      toast.error("Convert the lead to a customer before creating installments.");
      return;
    }
    if (!balanced) {
      toast.error(`Installment total must equal proposal total (${formatCurrency(proposalTotal)})`);
      return;
    }
    for (const row of rows) {
      if (!row.name.trim() || !row.amount || Number(row.amount) <= 0 || !row.dueDate) {
        toast.error("Each milestone needs a name, amount, and due date");
        return;
      }
    }
    try {
      const result = await createSchedule.mutateAsync({
        proposalId: proposal.id,
        installments: rows.map((row) => ({
          name: row.name.trim(),
          dueAmount: Number(row.amount),
          calculatedAmount: Number(row.amount),
          dueDate: row.dueDate,
        })),
      });
      toast.success(`${result.installments.length} installments created`);
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to create installments");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Payment schedule from proposal</DialogTitle>
          <DialogDescription>
            Split {proposal.number} ({formatCurrency(proposalTotal)}) into milestones. Invoices are generated per installment later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Proposal total</span>
            <span className="font-semibold tabular-nums">{formatCurrency(proposalTotal)}</span>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_100px_130px_32px] gap-2 items-end">
                <SalesField label={index === 0 ? "Milestone" : ""}>
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder="e.g. Advance"
                  />
                </SalesField>
                <SalesField label={index === 0 ? "Amount (₹)" : ""}>
                  <Input
                    type="number"
                    min={1}
                    value={row.amount}
                    onChange={(e) => updateRow(index, { amount: e.target.value })}
                  />
                </SalesField>
                <SalesField label={index === 0 ? "Due date" : ""}>
                  <Input
                    type="date"
                    value={row.dueDate}
                    onChange={(e) => updateRow(index, { dueDate: e.target.value })}
                  />
                </SalesField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" />
            Add milestone
          </Button>
          <div className={`text-xs rounded-lg px-3 py-2 border ${balanced ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            Scheduled: <span className="font-semibold tabular-nums">{formatCurrency(scheduledTotal)}</span>
            {!balanced && (
              <span> · {diff > 0 ? `${formatCurrency(diff)} remaining` : `${formatCurrency(Math.abs(diff))} over`}</span>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createSchedule.isPending || !balanced}>
              {createSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create installments
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Billing flow updated</DialogTitle>
          <DialogDescription>
            Invoices are no longer created directly from proposals. Open an approved proposal, create a payment schedule (installments), then generate an invoice for each milestone when you are ready to bill.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" onClick={() => { onOpenChange(false); window.location.href = "/sales/proposals"; }}>
            Go to proposals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment ──────────────────────────────────────────────────────────────

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultInvoiceId,
  defaultInstallmentId,
  customerId: filterCustomerId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultInvoiceId?: number;
  defaultInstallmentId?: number;
  customerId?: number;
  onSuccess?: (paymentId: number) => void;
}) {
  const recordPayment = useRecordPayment();
  const { data: invoicesData } = useListInvoices({ limit: 500 }, open);
  const unpaid = (invoicesData?.invoices ?? []).filter(
    (i) => i.status !== "paid" && i.status !== "cancelled" && (filterCustomerId == null || i.customerId === filterCustomerId),
  );
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ? String(defaultInvoiceId) : "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setInvoiceId(defaultInvoiceId ? String(defaultInvoiceId) : "");
    setAmount("");
    setTransactionId("");
    setNote("");
  }, [open, defaultInvoiceId]);

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
        installmentId: defaultInstallmentId,
        amount: amt,
        paymentMethod,
        transactionId: transactionId.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
      setAmount("");
      setNote("");
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
          <SalesField label="Note" hint="Optional — internal note about this payment.">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. Part payment for milestone 1"
            />
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
