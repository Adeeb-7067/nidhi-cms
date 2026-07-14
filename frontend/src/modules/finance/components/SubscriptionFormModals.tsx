import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHrmEmployees } from "@/api/hrm";
import {
  useCreateSubscription,
  useUpdateSubscription,
  useAssignSubscriptionSeat,
  useRecordSubscriptionPayment,
  type SoftwareSubscription,
  type SubscriptionBillingCycle,
  type SubscriptionStatus,
  type FinancePaymentMode,
} from "@/api/finance";
import { PAYMENT_MODE_LABELS, SUBSCRIPTION_BILLING_LABELS, formatCurrency } from "../constants";

type ModalBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result?: unknown) => void;
};

const positiveAmountString = z
  .string()
  .min(1, "Required")
  .refine((v) => Number(v) > 0, "Must be greater than zero");

const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  vendorName: z.string().optional(),
  plan: z.string().optional(),
  billingCycle: z.string(),
  seatsPurchased: z.string().min(1).refine((v) => Number(v) >= 1, "At least 1 seat"),
  costAmount: positiveAmountString,
  renewalDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

export function SubscriptionFormModal({
  open,
  onOpenChange,
  onSuccess,
  subscription,
}: ModalBaseProps & { subscription?: SoftwareSubscription | null }) {
  const isEdit = subscription != null;
  const createSub = useCreateSubscription();
  const updateSub = useUpdateSubscription();
  const isPending = createSub.isPending || updateSub.isPending;

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: "",
      vendorName: "",
      plan: "",
      billingCycle: "monthly",
      seatsPurchased: "1",
      costAmount: "",
      renewalDate: "",
      status: "active",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      subscription
        ? {
            name: subscription.name,
            vendorName: subscription.vendorName ?? "",
            plan: subscription.plan ?? "",
            billingCycle: subscription.billingCycle,
            seatsPurchased: String(subscription.seatsPurchased),
            costAmount: String(subscription.costAmount),
            renewalDate: subscription.renewalDate ? subscription.renewalDate.slice(0, 10) : "",
            status: subscription.status,
            notes: subscription.notes ?? "",
          }
        : {
            name: "",
            vendorName: "",
            plan: "",
            billingCycle: "monthly",
            seatsPurchased: "1",
            costAmount: "",
            renewalDate: "",
            status: "active",
            notes: "",
          },
    );
  }, [open, subscription, form]);

  const onSubmit = async (values: SubscriptionFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        vendorName: values.vendorName?.trim() || undefined,
        plan: values.plan?.trim() || undefined,
        billingCycle: values.billingCycle as SubscriptionBillingCycle,
        seatsPurchased: Number(values.seatsPurchased),
        costAmount: Number(values.costAmount),
        renewalDate: values.renewalDate?.trim() || null,
        notes: values.notes?.trim() || undefined,
      };
      if (isEdit && subscription) {
        await updateSub.mutateAsync({
          id: subscription.id,
          ...payload,
          status: (values.status as SubscriptionStatus) || subscription.status,
        });
        toast.success(`Subscription "${values.name}" updated`);
      } else {
        await createSub.mutateAsync(payload);
        toast.success(`Subscription "${values.name}" created`);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update subscription" : "Failed to create subscription");
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit subscription" : "Add subscription"}</DialogTitle>
          <DialogDescription>
            Track company software like Cursor, Claude, Figma — seats and billing.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g. Cursor Pro" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="vendorName" render={({ field }) => (
                  <FormItem><FormLabel>Vendor</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="plan" render={({ field }) => (
                  <FormItem><FormLabel>Plan</FormLabel><FormControl><Input placeholder="e.g. Team" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="billingCycle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(Object.keys(SUBSCRIPTION_BILLING_LABELS) as SubscriptionBillingCycle[]).map((k) => (
                          <SelectItem key={k} value={k}>{SUBSCRIPTION_BILLING_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="seatsPurchased" render={({ field }) => (
                  <FormItem><FormLabel>Seats bought</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="costAmount" render={({ field }) => (
                  <FormItem><FormLabel>Cost / cycle (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="renewalDate" render={({ field }) => (
                  <FormItem><FormLabel>Next renewal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              {isEdit && (
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "active"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const assignSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  seatEmail: z.string().optional(),
  notes: z.string().optional(),
});
type AssignFormValues = z.infer<typeof assignSchema>;

export function AssignSeatModal({
  open,
  onOpenChange,
  onSuccess,
  subscription,
}: ModalBaseProps & { subscription: SoftwareSubscription | null }) {
  const assignSeat = useAssignSubscriptionSeat();
  const { data: employeesData } = useHrmEmployees({ limit: 200, status: "active" }, { enabled: open });
  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { employeeId: "", seatEmail: "", notes: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ employeeId: "", seatEmail: "", notes: "" });
  }, [open, form]);

  const onSubmit = async (values: AssignFormValues) => {
    if (!subscription) return;
    try {
      await assignSeat.mutateAsync({
        id: subscription.id,
        employeeId: Number(values.employeeId),
        seatEmail: values.seatEmail?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Seat assigned");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to assign seat");
    }
  };

  if (!open || !subscription) return null;

  const assignedIds = new Set(
    subscription.assignments.filter((a) => a.isActive).map((a) => a.employeeId),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Assign seat</DialogTitle>
          <DialogDescription>
            {subscription.name} · {subscription.seatsAvailable} of {subscription.seatsPurchased} seats free
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(employeesData?.employees ?? [])
                        .filter((u) => !assignedIds.has(u.id))
                        .map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="seatEmail" render={({ field }) => (
                <FormItem><FormLabel>Seat email (optional)</FormLabel><FormControl><Input type="email" placeholder="work@company.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={assignSeat.isPending}>Cancel</Button>
              <Button type="submit" disabled={assignSeat.isPending || subscription.seatsAvailable <= 0}>
                {assignSeat.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const paymentSchema = z.object({
  date: z.string().min(1),
  amount: positiveAmountString,
  paymentMode: z.string().min(1),
  renewalDate: z.string().optional(),
  notes: z.string().optional(),
  approve: z.boolean().optional(),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

export function SubscriptionPaymentModal({
  open,
  onOpenChange,
  onSuccess,
  subscription,
}: ModalBaseProps & { subscription: SoftwareSubscription | null }) {
  const recordPayment = useRecordSubscriptionPayment();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: "",
      paymentMode: "bank_transfer",
      renewalDate: "",
      notes: "",
      approve: true,
    },
  });

  useEffect(() => {
    if (!open || !subscription) return;
    form.reset({
      date: new Date().toISOString().slice(0, 10),
      amount: String(subscription.costAmount),
      paymentMode: "bank_transfer",
      renewalDate: "",
      notes: "",
      approve: true,
    });
  }, [open, subscription, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (!subscription) return;
    try {
      const result = await recordPayment.mutateAsync({
        id: subscription.id,
        date: values.date,
        amount: Number(values.amount),
        paymentMode: values.paymentMode as FinancePaymentMode,
        renewalDate: values.renewalDate?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        approve: values.approve !== false,
      });
      toast.success(`Payment recorded as expense ${result.expense.reference}`);
      onOpenChange(false);
      onSuccess?.(result);
    } catch (err) {
      toastApiError(err, "Failed to record payment");
    }
  };

  if (!open || !subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Creates a software expense for {subscription.reference}
            {" · "}
            {formatCurrency(subscription.costAmount)}/{subscription.billingCycle === "yearly" ? "yr" : "mo"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Payment date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
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
              <FormField control={form.control} name="renewalDate" render={({ field }) => (
                <FormItem><FormLabel>Next renewal (optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="approve" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div>
                    <FormLabel className="text-sm">Mark as paid now</FormLabel>
                    <p className="text-[10px] text-muted-foreground">Creates an approved software expense</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value !== false} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
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
