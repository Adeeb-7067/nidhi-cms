import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/ui/file-uploader";
import { useListProjects, useListClients } from "@/api/generated/api";
import { useHrmEmployees } from "@/api/hrm";
import {
  useCreateExpense,
  useUpdateExpense,
  useRecordIncome,
  useUpdateIncome,
  useRecordPayment,
  useUpdatePayment,
  useCreateInvoice,
  useUpdateInvoice,
  useAddCreditNote,
  useCreateBudget,
  useUpdateBudget,
  useCreateVendor,
  useUpdateVendor,
  useCreateBankAccount,
  useUpdateBankAccount,
  useCreateTaxDeposit,
  useUpdateTaxDeposit,
  useListVendors,
  type Expense,
  type Income,
  type FinancePayment,
  type FinanceInvoice,
  type FinanceVendor,
  type FinanceBankAccount,
  type Budget,
  type ExpenseCategory,
  type FinancePaymentMode,
  type BudgetType,
  type TaxDeposit,
} from "@/api/finance";
import { vendorToFormDefaults } from "@/modules/finance/vendor-utils";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_MODE_LABELS, calcInvoiceTotal, formatCurrency } from "../constants";

type ModalBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result?: unknown) => void;
};

const EXPENSE_FORM_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

function optionalSelectId(value: string | undefined): number | null {
  if (!value || value === "none") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const positiveAmountString = z
  .string()
  .min(1, "Amount is required")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero");

const positiveRateString = z
  .string()
  .min(1, "Rate is required")
  .refine((v) => Number(v) > 0, "Rate must be greater than zero");

// ─── Expense ────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category: z.string(),
  amount: positiveAmountString,
  paymentMode: z.string(),
  projectId: z.string().optional(),
  employeeId: z.string().optional(),
  vendorId: z.string().optional(),
  notes: z.string().optional(),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function ExpenseFormModal({
  open,
  onOpenChange,
  onSuccess,
  expense,
}: ModalBaseProps & { expense?: Expense | null }) {
  const isEdit = expense != null;
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isPending = createExpense.isPending || updateExpense.isPending;
  const { data: projectsData } = useListProjects({ limit: 200 }, { query: { enabled: open } });
  const { data: employeesData } = useHrmEmployees({ limit: 200, status: "active" }, { enabled: open });
  const { data: vendorsData, refetch: refetchVendors } = useListVendors(undefined, open);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);

  const blankDefaults: ExpenseFormValues = {
    date: new Date().toISOString().slice(0, 10),
    category: "software",
    amount: "",
    paymentMode: "bank_transfer",
    projectId: "",
    employeeId: "",
    vendorId: "",
    notes: "",
  };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: blankDefaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      expense
        ? {
            date: expense.date.slice(0, 10),
            category: expense.category,
            amount: String(expense.amount),
            paymentMode: expense.paymentMode,
            projectId: expense.projectId ? String(expense.projectId) : "",
            employeeId: expense.employeeId ? String(expense.employeeId) : "",
            vendorId: expense.vendorId ? String(expense.vendorId) : "",
            notes: expense.notes ?? "",
          }
        : blankDefaults,
    );
    setAttachments(expense?.attachments?.map((a) => ({ name: a.name, url: a.url })) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense, form]);

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      const payload = {
        date: values.date,
        category: values.category as ExpenseCategory,
        amount: Number(values.amount),
        paymentMode: values.paymentMode as FinancePaymentMode,
        projectId: optionalSelectId(values.projectId),
        employeeId: optionalSelectId(values.employeeId),
        vendorId: optionalSelectId(values.vendorId),
        notes: values.notes || undefined,
        attachments,
      };
      if (isEdit && expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...payload });
        toast.success("Expense updated");
      } else {
        await createExpense.mutateAsync(payload);
        toast.success(`Expense of ${formatCurrency(Number(values.amount))} submitted for approval`);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update expense" : "Failed to create expense");
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this pending expense." : "Record a new expense — pending approval by default."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EXPENSE_FORM_CATEGORIES.map((k) => (
                        <SelectItem key={k} value={k}>{EXPENSE_CATEGORY_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="paymentMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.keys(PAYMENT_MODE_LABELS) as FinancePaymentMode[]).map((k) => (
                        <SelectItem key={k} value={k}>{PAYMENT_MODE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="projectId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(projectsData?.projects ?? []).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="employeeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(employeesData?.employees ?? []).map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Service vendor</FormLabel>
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setVendorModalOpen(true)}>
                      + Add vendor
                    </Button>
                  </div>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="AWS, hosting, SaaS…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(vendorsData?.vendors ?? []).map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div>
                <Label className="mb-2 block text-sm font-medium">Bill attachment</Label>
                <FileUploader
                  accept="image/*,.pdf"
                  category="finance"
                  onUploadComplete={(url, meta) => {
                    if (!url) return;
                    setAttachments((prev) => [...prev, { name: meta?.fileName ?? "Receipt", url }]);
                    toast.success("Attachment uploaded");
                  }}
                />
                {attachments.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {attachments.map((a) => <li key={a.url} className="truncate">{a.name}</li>)}
                  </ul>
                )}
              </div>
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Submit expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <VendorFormModal
      open={vendorModalOpen}
      onOpenChange={setVendorModalOpen}
      onSuccess={(vendor) => {
        void refetchVendors();
        const saved = vendor as FinanceVendor | undefined;
        if (saved?.id) form.setValue("vendorId", String(saved.id));
      }}
    />
    </>
  );
}

const paymentSchema = z.object({
  date: z.string().min(1),
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional(),
  amount: positiveAmountString,
  paymentMode: z.string(),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

export function RecordPaymentModal({
  open,
  onOpenChange,
  onSuccess,
  invoice,
}: ModalBaseProps & { invoice?: FinanceInvoice | null }) {
  const recordIncome = useRecordIncome();
  const { data: clientsData } = useListClients({ limit: 200 }, { query: { enabled: open } });
  const { data: projectsData } = useListProjects({ limit: 200 }, { query: { enabled: open } });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      clientId: "",
      projectId: "",
      amount: "",
      paymentMode: "neft",
    },
  });

  useEffect(() => {
    if (!open) return;
    const remaining = invoice ? Math.max(0, (invoice.total ?? 0) - invoice.paidAmount) : 0;
    form.reset({
      date: new Date().toISOString().slice(0, 10),
      clientId: invoice ? String(invoice.clientId) : "",
      projectId: invoice?.projectId ? String(invoice.projectId) : "",
      amount: invoice ? String(remaining) : "",
      paymentMode: "neft",
    });
  }, [open, invoice, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      const result = await recordIncome.mutateAsync({
        clientId: Number(values.clientId),
        projectId: optionalSelectId(values.projectId),
        invoiceId: invoice?.id ?? null,
        amount: Number(values.amount),
        paymentMode: values.paymentMode as FinancePaymentMode,
        date: values.date,
      });
      toast.success(`Payment of ${formatCurrency(Number(values.amount))} recorded`);
      void result;
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice ? `Log a payment received against ${invoice.number}.` : "Log an incoming client payment."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!invoice}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(clientsData?.clients ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"} disabled={!!invoice}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(projectsData?.projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="paymentMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.keys(PAYMENT_MODE_LABELS) as FinancePaymentMode[]).map((k) => (
                        <SelectItem key={k} value={k}>{PAYMENT_MODE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={recordIncome.isPending}>Cancel</Button>
              <Button type="submit" disabled={recordIncome.isPending}>
                {recordIncome.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoice ────────────────────────────────────────────────────────────

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  discount: z.string().optional(),
  gstEnabled: z.boolean(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.string().min(1).refine((v) => Number(v) > 0, "Quantity must be greater than zero"),
        rate: positiveRateString,
        taxPercent: z.string(),
      }),
    )
    .min(1),
});
type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function InvoiceFormModal({
  open,
  onOpenChange,
  onSuccess,
  invoice,
}: ModalBaseProps & { invoice?: FinanceInvoice | null }) {
  const isEdit = invoice != null;
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const isPending = createInvoice.isPending || updateInvoice.isPending;
  const { data: clientsData } = useListClients({ limit: 200 }, { query: { enabled: open } });
  const { data: projectsData } = useListProjects({ limit: 200 }, { query: { enabled: open } });

  const blankDefaults: InvoiceFormValues = {
    clientId: "",
    projectId: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    discount: "0",
    gstEnabled: true,
    notes: "",
    items: [{ description: "", quantity: "1", rate: "", taxPercent: "18" }],
  };

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: blankDefaults,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");
  const watchedDiscount = form.watch("discount");
  const watchedGst = form.watch("gstEnabled");

  useEffect(() => {
    if (!open) return;
    form.reset(
      invoice
        ? {
            clientId: String(invoice.clientId),
            projectId: invoice.projectId ? String(invoice.projectId) : "",
            issueDate: invoice.issueDate.slice(0, 10),
            dueDate: invoice.dueDate.slice(0, 10),
            discount: String(invoice.discount ?? 0),
            gstEnabled: invoice.gstEnabled !== false,
            notes: invoice.notes ?? "",
            items: (invoice.items ?? []).map((i) => ({
              description: i.description,
              quantity: String(i.quantity),
              rate: String(i.rate),
              taxPercent: String(i.taxPercent ?? 0),
            })),
          }
        : blankDefaults,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice, form]);

  const totals = calcInvoiceTotal(
    watchedItems.map((i) => ({ quantity: Number(i.quantity) || 0, rate: Number(i.rate) || 0, taxPercent: Number(i.taxPercent) || 0 })),
    Number(watchedDiscount) || 0,
    watchedGst,
  );

  const onSubmit = async (values: InvoiceFormValues) => {
    if (totals.total <= 0) {
      toast.error("Invoice total must be greater than ₹0");
      return;
    }
    const items = values.items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      taxPercent: Number(i.taxPercent) || 0,
    }));
    try {
      if (isEdit && invoice) {
        await updateInvoice.mutateAsync({
          id: invoice.id,
          projectId: optionalSelectId(values.projectId),
          dueDate: values.dueDate,
          discount: Number(values.discount) || 0,
          gstEnabled: values.gstEnabled,
          notes: values.notes || undefined,
          items,
        });
        toast.success("Invoice updated");
      } else {
        await createInvoice.mutateAsync({
          clientId: Number(values.clientId),
          projectId: optionalSelectId(values.projectId),
          issueDate: values.issueDate,
          dueDate: values.dueDate,
          discount: Number(values.discount) || 0,
          gstEnabled: values.gstEnabled,
          notes: values.notes || undefined,
          items,
        });
        toast.success("Invoice created");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update invoice" : "Failed to create invoice");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit invoice" : "Create invoice"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update line items and details for this unpaid invoice." : "Generate a new client invoice with line items."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="clientId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(clientsData?.clients ?? []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="projectId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(projectsData?.projects ?? []).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="issueDate" render={({ field }) => (
                  <FormItem><FormLabel>Issue date</FormLabel><FormControl><Input type="date" disabled={isEdit} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Due date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Line items</Label>
                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-[1fr_70px_90px_70px_auto] gap-2 items-start">
                    <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (
                      <FormItem><FormControl><Input placeholder="Description" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                      <FormItem><FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.rate`} render={({ field }) => (
                      <FormItem><FormControl><Input type="number" placeholder="Rate" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.taxPercent`} render={({ field }) => (
                      <FormItem><FormControl><Input type="number" placeholder="Tax %" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => append({ description: "", quantity: "1", rate: "", taxPercent: "18" })}
                >
                  <Plus className="h-3.5 w-3.5" /> Add line item
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="discount" render={({ field }) => (
                  <FormItem><FormLabel>Discount (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gstEnabled" render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel className="mb-2">Apply GST</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="rounded-lg border bg-muted/20 p-3 grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-muted-foreground">Subtotal</p><p className="font-semibold tabular-nums">{formatCurrency(totals.subtotal)}</p></div>
                <div><p className="text-muted-foreground">Tax</p><p className="font-semibold tabular-nums">{formatCurrency(totals.tax)}</p></div>
                <div><p className="text-muted-foreground">Total</p><p className="font-bold tabular-nums">{formatCurrency(totals.total)}</p></div>
              </div>
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Credit note ──────────────────────────────────────────────────────────

const creditNoteSchema = z.object({
  amount: positiveAmountString,
  reason: z.string().min(1, "Reason is required"),
});
type CreditNoteFormValues = z.infer<typeof creditNoteSchema>;

export function CreditNoteModal({
  open,
  onOpenChange,
  onSuccess,
  invoiceId,
}: ModalBaseProps & { invoiceId: number }) {
  const addCreditNote = useAddCreditNote();
  const form = useForm<CreditNoteFormValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: { amount: "", reason: "" },
  });

  useEffect(() => {
    if (open) form.reset({ amount: "", reason: "" });
  }, [open, form]);

  const onSubmit = async (values: CreditNoteFormValues) => {
    try {
      await addCreditNote.mutateAsync({ id: invoiceId, amount: Number(values.amount), reason: values.reason });
      toast.success("Credit note issued");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to issue credit note");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Issue credit note</DialogTitle>
          <DialogDescription>Reduce the outstanding balance on this invoice.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem><FormLabel>Reason</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={addCreditNote.isPending}>Cancel</Button>
              <Button type="submit" disabled={addCreditNote.isPending}>
                {addCreditNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Issue credit note
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Budget ───────────────────────────────────────────────────────────────

const budgetSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: z.string(),
    projectId: z.string().optional(),
    fiscalYear: z.string().min(1, "Fiscal year is required"),
    allocated: positiveAmountString,
    department: z.string().optional(),
  })
  .refine((data) => data.type !== "project" || Boolean(data.projectId?.trim()), {
    message: "Project is required for project budgets",
    path: ["projectId"],
  });
type BudgetFormValues = z.infer<typeof budgetSchema>;

export function BudgetFormModal({
  open,
  onOpenChange,
  onSuccess,
  budget,
}: ModalBaseProps & { budget?: Budget | null }) {
  const isEdit = budget != null;
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const isPending = createBudget.isPending || updateBudget.isPending;
  const { data: projectsData } = useListProjects({ limit: 200 }, { query: { enabled: open } });

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { name: "", type: "annual", projectId: "", fiscalYear: "2026-27", allocated: "", department: "" },
  });
  const watchedType = form.watch("type") as BudgetType;

  useEffect(() => {
    if (!open) return;
    form.reset(
      budget
        ? {
            name: budget.name,
            type: budget.type,
            projectId: budget.projectId ? String(budget.projectId) : "",
            fiscalYear: budget.fiscalYear,
            allocated: String(budget.allocated),
            department: budget.department ?? "",
          }
        : { name: "", type: "annual", projectId: "", fiscalYear: "2026-27", allocated: "", department: "" },
    );
  }, [open, budget, form]);

  const onSubmit = async (values: BudgetFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        type: values.type as BudgetType,
        projectId: values.type === "project" && values.projectId ? Number(values.projectId) : null,
        fiscalYear: values.fiscalYear.trim(),
        allocated: Number(values.allocated),
        department: values.type === "annual" ? values.department?.trim() || undefined : undefined,
      };
      if (isEdit && budget) {
        await updateBudget.mutateAsync({ id: budget.id, ...payload });
        toast.success(`Budget "${values.name}" updated`);
      } else {
        await createBudget.mutateAsync(payload);
        toast.success(`Budget "${values.name}" created`);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update budget" : "Failed to create budget");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit budget" : "Add budget"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this budget's allocation." : "Set up an annual or project budget."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Budget name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {watchedType === "project" ? (
                <FormField control={form.control} name="projectId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(projectsData?.projects ?? []).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem><FormLabel>Department (optional)</FormLabel><FormControl><Input placeholder="e.g. Engineering" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="fiscalYear" render={({ field }) => (
                  <FormItem><FormLabel>Fiscal year</FormLabel><FormControl><Input placeholder="2026-27" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="allocated" render={({ field }) => (
                  <FormItem><FormLabel>Allocated (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Vendor ───────────────────────────────────────────────────────────────

const vendorFieldRowSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
  fields: z.array(vendorFieldRowSchema).optional(),
});
type VendorFormValues = z.infer<typeof vendorSchema>;

function VendorFieldsEditor({
  fields,
  onChange,
}: {
  fields: { label: string; value: string }[];
  onChange: (next: { label: string; value: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Service details</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onChange([...fields, { label: "", value: "" }])}
        >
          <Plus className="h-3.5 w-3.5" />
          Add field
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Add whatever you track for this provider — e.g. Service → AWS hosting, Account ID → 1234.
      </p>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center">
          No custom fields yet.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <Input
                placeholder="Label (e.g. Service)"
                value={row.label}
                onChange={(e) => {
                  const next = [...fields];
                  next[index] = { ...next[index], label: e.target.value };
                  onChange(next);
                }}
              />
              <Input
                placeholder="Value (e.g. Cloud hosting)"
                value={row.value}
                onChange={(e) => {
                  const next = [...fields];
                  next[index] = { ...next[index], value: e.target.value };
                  onChange(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(fields.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VendorFormModal({
  open,
  onOpenChange,
  onSuccess,
  vendor,
}: ModalBaseProps & { vendor?: FinanceVendor | null }) {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const isEdit = !!vendor?.id;
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendorToFormDefaults(null),
  });
  const [fieldRows, setFieldRows] = useState<{ label: string; value: string }[]>([{ label: "", value: "" }]);

  useEffect(() => {
    if (!open) return;
    const defaults = vendorToFormDefaults(vendor);
    form.reset(defaults);
    setFieldRows(defaults.fields);
  }, [open, vendor, form]);

  const onSubmit = async (values: VendorFormValues) => {
    const fields = fieldRows
      .map((row) => ({ label: row.label.trim(), value: row.value.trim() }))
      .filter((row) => row.label && row.value);
    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      contactPerson: values.contactPerson?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      website: values.website?.trim() || undefined,
      gstin: values.gstin?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      fields,
    };
    try {
      const saved = isEdit
        ? await updateVendor.mutateAsync({ id: vendor!.id, ...payload })
        : await createVendor.mutateAsync(payload);
      toast.success(isEdit ? `Vendor "${saved.name}" updated` : `Vendor "${saved.name}" added`);
      onOpenChange(false);
      onSuccess?.(saved);
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update vendor" : "Failed to add vendor");
    }
  };

  const pending = createVendor.isPending || updateVendor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit vendor" : "Add vendor"}</DialogTitle>
          <DialogDescription>
            Service providers you pay — AWS, hosting, domains, SaaS tools, and similar vendors.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Vendor name</FormLabel><FormControl><Input placeholder="AWS India" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="billing@vendor.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                  <FormItem><FormLabel>Contact person</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://aws.amazon.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="Billing address (optional)" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="gstin" render={({ field }) => (
                <FormItem><FormLabel>GSTIN</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <VendorFieldsEditor fields={fieldRows} onChange={setFieldRows} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Renewal reminders, support contacts, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save vendor" : "Add vendor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bank account ───────────────────────────────────────────────────────

const bankAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bankName: z.string().optional(),
  accountNumberMasked: z.string().optional(),
  ifsc: z.string().optional(),
  openingBalance: z.string().optional(),
});
type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

export function BankAccountFormModal({
  open,
  onOpenChange,
  onSuccess,
  account,
}: ModalBaseProps & { account?: FinanceBankAccount | null }) {
  const isEdit = account != null;
  const createBankAccount = useCreateBankAccount();
  const updateBankAccount = useUpdateBankAccount();
  const isPending = createBankAccount.isPending || updateBankAccount.isPending;
  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: { name: "", bankName: "", accountNumberMasked: "", ifsc: "", openingBalance: "0" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      account
        ? {
            name: account.name,
            bankName: account.bankName ?? "",
            accountNumberMasked: account.accountNumberMasked ?? "",
            ifsc: account.ifsc ?? "",
            openingBalance: String(account.openingBalance ?? 0),
          }
        : { name: "", bankName: "", accountNumberMasked: "", ifsc: "", openingBalance: "0" },
    );
  }, [open, account, form]);

  const onSubmit = async (values: BankAccountFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        bankName: values.bankName?.trim() || undefined,
        accountNumberMasked: values.accountNumberMasked?.trim() || undefined,
        ifsc: values.ifsc?.trim() || undefined,
        openingBalance: Number(values.openingBalance) || 0,
      };
      if (isEdit && account) {
        await updateBankAccount.mutateAsync({ id: account.id, ...payload });
        toast.success(`Bank account "${values.name}" updated`);
      } else {
        await createBankAccount.mutateAsync(payload);
        toast.success(`Bank account "${values.name}" added`);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update bank account" : "Failed to add bank account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit bank account" : "Add bank account"}</DialogTitle>
          <DialogDescription>Track cash position for a company bank account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Display name</FormLabel><FormControl><Input placeholder="HDFC Current A/C — 4521" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="bankName" render={({ field }) => (
                  <FormItem><FormLabel>Bank</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ifsc" render={({ field }) => (
                  <FormItem><FormLabel>IFSC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="accountNumberMasked" render={({ field }) => (
                <FormItem><FormLabel>Account number</FormLabel><FormControl><Input placeholder="XXXX XXXX 4521" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="openingBalance" render={({ field }) => (
                <FormItem><FormLabel>Opening balance (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Add account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record outgoing payment (vendor / payroll disbursement) ─────────────

const outgoingPaymentSchema = z.object({
  date: z.string().min(1),
  vendorId: z.string().optional(),
  partyName: z.string().optional(),
  amount: positiveAmountString,
  mode: z.string(),
  reference: z.string().optional(),
});
type OutgoingPaymentFormValues = z.infer<typeof outgoingPaymentSchema>;

export function RecordOutgoingPaymentModal({ open, onOpenChange, onSuccess }: ModalBaseProps) {
  const recordPayment = useRecordPayment();
  const { data: vendorsData } = useListVendors(undefined, open);

  const form = useForm<OutgoingPaymentFormValues>({
    resolver: zodResolver(outgoingPaymentSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), vendorId: "", partyName: "", amount: "", mode: "bank_transfer", reference: "" },
  });

  useEffect(() => {
    if (open) form.reset({ date: new Date().toISOString().slice(0, 10), vendorId: "", partyName: "", amount: "", mode: "bank_transfer", reference: "" });
  }, [open, form]);

  const watchedVendorId = form.watch("vendorId");

  const onSubmit = async (values: OutgoingPaymentFormValues) => {
    const vendorId = optionalSelectId(values.vendorId);
    if (!vendorId && !values.partyName?.trim()) {
      form.setError("partyName", { message: "Select a vendor or enter a payee name" });
      return;
    }
    try {
      await recordPayment.mutateAsync({
        direction: "outgoing",
        amount: Number(values.amount),
        mode: values.mode as FinancePaymentMode,
        date: values.date,
        reference: values.reference || undefined,
        vendorId,
        partyName: vendorId ? undefined : values.partyName?.trim(),
      });
      toast.success(`Payment of ${formatCurrency(Number(values.amount))} recorded`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Record outgoing payment</DialogTitle>
          <DialogDescription>Log a disbursement to a vendor or other payee.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Other payee (enter name)</SelectItem>
                      {(vendorsData?.vendors ?? []).map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {(!watchedVendorId || watchedVendorId === "none") && (
                <FormField control={form.control} name="partyName" render={({ field }) => (
                  <FormItem><FormLabel>Payee name</FormLabel><FormControl><Input placeholder="e.g. Employee Payroll" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(Object.keys(PAYMENT_MODE_LABELS) as FinancePaymentMode[]).map((k) => (
                          <SelectItem key={k} value={k}>{PAYMENT_MODE_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="Bank UTR / note" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={recordPayment.isPending}>Cancel</Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Income edit ─────────────────────────────────────────────────────────

const incomeEditSchema = z.object({
  date: z.string().min(1, "Date is required"),
  paymentMode: z.string(),
  projectId: z.string().optional(),
});
type IncomeEditFormValues = z.infer<typeof incomeEditSchema>;

export function IncomeEditModal({
  open,
  onOpenChange,
  onSuccess,
  income,
}: ModalBaseProps & { income: Income | null }) {
  const updateIncome = useUpdateIncome();
  const { data: projectsData } = useListProjects({ limit: 200 }, { query: { enabled: open } });

  const form = useForm<IncomeEditFormValues>({
    resolver: zodResolver(incomeEditSchema),
    defaultValues: { date: "", paymentMode: "neft", projectId: "" },
  });

  useEffect(() => {
    if (!open || !income) return;
    form.reset({
      date: income.date.slice(0, 10),
      paymentMode: income.paymentMode,
      projectId: income.projectId ? String(income.projectId) : "",
    });
  }, [open, income, form]);

  const onSubmit = async (values: IncomeEditFormValues) => {
    if (!income) return;
    try {
      await updateIncome.mutateAsync({
        id: income.id,
        date: values.date,
        paymentMode: values.paymentMode as FinancePaymentMode,
        projectId: optionalSelectId(values.projectId),
      });
      toast.success("Income updated");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to update income");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Edit income receipt</DialogTitle>
          <DialogDescription>
            Amount and client are locked to keep the invoice balance in sync — adjust the date, mode, or project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="paymentMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.keys(PAYMENT_MODE_LABELS) as FinancePaymentMode[]).map((k) => (
                        <SelectItem key={k} value={k}>{PAYMENT_MODE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(projectsData?.projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateIncome.isPending}>Cancel</Button>
              <Button type="submit" disabled={updateIncome.isPending}>
                {updateIncome.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Outgoing payment edit ───────────────────────────────────────────────

const paymentEditSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: positiveAmountString,
  mode: z.string(),
  reference: z.string().optional(),
  partyName: z.string().optional(),
});
type PaymentEditFormValues = z.infer<typeof paymentEditSchema>;

export function PaymentEditModal({
  open,
  onOpenChange,
  onSuccess,
  payment,
}: ModalBaseProps & { payment: FinancePayment | null }) {
  const updatePayment = useUpdatePayment();
  const hasVendor = Boolean(payment?.vendorId);

  const form = useForm<PaymentEditFormValues>({
    resolver: zodResolver(paymentEditSchema),
    defaultValues: { date: "", amount: "", mode: "bank_transfer", reference: "", partyName: "" },
  });

  useEffect(() => {
    if (!open || !payment) return;
    form.reset({
      date: payment.date.slice(0, 10),
      amount: String(payment.amount),
      mode: payment.mode,
      reference: payment.reference ?? "",
      partyName: payment.partyName ?? "",
    });
  }, [open, payment, form]);

  const onSubmit = async (values: PaymentEditFormValues) => {
    if (!payment) return;
    try {
      await updatePayment.mutateAsync({
        id: payment.id,
        date: values.date,
        amount: Number(values.amount),
        mode: values.mode as FinancePaymentMode,
        reference: values.reference?.trim() || undefined,
        partyName: hasVendor ? undefined : values.partyName?.trim() || undefined,
      });
      toast.success("Payment updated");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to update payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Edit outgoing payment</DialogTitle>
          <DialogDescription>Update this disbursement — ledgers recompute automatically.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              {!hasVendor && (
                <FormField control={form.control} name="partyName" render={({ field }) => (
                  <FormItem><FormLabel>Payee name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(Object.keys(PAYMENT_MODE_LABELS) as FinancePaymentMode[]).map((k) => (
                          <SelectItem key={k} value={k}>{PAYMENT_MODE_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updatePayment.isPending}>Cancel</Button>
              <Button type="submit" disabled={updatePayment.isPending}>
                {updatePayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tax deposit ─────────────────────────────────────────────────────────

const taxDepositSchema = z.object({
  type: z.enum(["gst", "tds"]),
  period: z.string().min(1, "Period is required"),
  amount: positiveAmountString,
  challanNumber: z.string().optional(),
  depositedAt: z.string().min(1, "Deposit date is required"),
});
type TaxDepositFormValues = z.infer<typeof taxDepositSchema>;

export function TaxDepositFormModal({
  open,
  onOpenChange,
  onSuccess,
  deposit,
}: ModalBaseProps & { deposit?: TaxDeposit | null }) {
  const isEdit = deposit != null;
  const createDeposit = useCreateTaxDeposit();
  const updateDeposit = useUpdateTaxDeposit();
  const isPending = createDeposit.isPending || updateDeposit.isPending;

  const blankDefaults: TaxDepositFormValues = {
    type: "gst",
    period: "",
    amount: "",
    challanNumber: "",
    depositedAt: new Date().toISOString().slice(0, 10),
  };

  const form = useForm<TaxDepositFormValues>({
    resolver: zodResolver(taxDepositSchema),
    defaultValues: blankDefaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      deposit
        ? {
            type: deposit.type,
            period: deposit.period,
            amount: String(deposit.amount),
            challanNumber: deposit.challanNumber ?? "",
            depositedAt: deposit.depositedAt.slice(0, 10),
          }
        : blankDefaults,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deposit, form]);

  const onSubmit = async (values: TaxDepositFormValues) => {
    try {
      const payload = {
        type: values.type,
        period: values.period.trim(),
        amount: Number(values.amount),
        challanNumber: values.challanNumber?.trim() || undefined,
        depositedAt: values.depositedAt,
      };
      if (isEdit && deposit) {
        await updateDeposit.mutateAsync({ id: deposit.id, ...payload });
        toast.success("Tax deposit updated");
      } else {
        await createDeposit.mutateAsync(payload);
        toast.success("Tax deposit recorded");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update tax deposit" : "Failed to record tax deposit");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit tax deposit" : "Record tax deposit"}</DialogTitle>
          <DialogDescription>Log a GST or TDS challan deposit against a tax period.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="gst">GST</SelectItem>
                        <SelectItem value="tds">TDS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="period" render={({ field }) => (
                  <FormItem><FormLabel>Period</FormLabel><FormControl><Input placeholder="2026-06 or 2026-Q1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="challanNumber" render={({ field }) => (
                  <FormItem><FormLabel>Challan no.</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="depositedAt" render={({ field }) => (
                  <FormItem><FormLabel>Deposit date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Record deposit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
