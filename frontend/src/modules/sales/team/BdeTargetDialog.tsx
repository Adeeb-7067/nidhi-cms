import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toastApiError } from "@/lib/api-error";
import { type BdeTarget, useUpsertBdeTarget } from "@/api/sales";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const schema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  trackRevenue: z.boolean(),
  revenueTarget: z.coerce.number().min(0).optional(),
  trackDeals: z.boolean(),
  dealsTarget: z.coerce.number().min(0).optional(),
  trackLeads: z.boolean(),
  leadsTarget: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.trackRevenue && (data.revenueTarget == null || data.revenueTarget <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["revenueTarget"], message: "Enter a closed project value target" });
  }
  if (data.trackDeals && (data.dealsTarget == null || data.dealsTarget <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dealsTarget"], message: "Enter a deals target" });
  }
  if (data.trackLeads && (data.leadsTarget == null || data.leadsTarget <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["leadsTarget"], message: "Enter a leads target" });
  }
  if (!data.trackRevenue && !data.trackDeals && !data.trackLeads) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trackRevenue"], message: "Enable at least one metric" });
  }
});

type FormValues = z.infer<typeof schema>;

function getDefaultMonth() {
  const now = new Date();
  return now.getMonth() + 1;
}
function getDefaultYear() {
  return new Date().getFullYear();
}

function targetToForm(target: BdeTarget): FormValues {
  return {
    month: target.month,
    year: target.year,
    trackRevenue: target.revenueTarget != null,
    revenueTarget: target.revenueTarget ?? undefined,
    trackDeals: target.dealsTarget != null,
    dealsTarget: target.dealsTarget ?? undefined,
    trackLeads: target.leadsTarget != null,
    leadsTarget: target.leadsTarget ?? undefined,
    notes: target.notes ?? "",
  };
}

function emptyForm(month: number, year: number): FormValues {
  return {
    month,
    year,
    trackRevenue: false,
    revenueTarget: undefined,
    trackDeals: false,
    dealsTarget: undefined,
    trackLeads: false,
    leadsTarget: undefined,
    notes: "",
  };
}

export function BdeTargetDialog({
  open,
  onOpenChange,
  userId,
  bdeNam,
  existingTarget,
  defaultMonth,
  defaultYear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  bdeNam: string;
  existingTarget?: BdeTarget | null;
  defaultMonth?: number;
  defaultYear?: number;
}) {
  const upsert = useUpsertBdeTarget();
  const [trackRevenue, setTrackRevenue] = useState(false);
  const [trackDeals, setTrackDeals] = useState(false);
  const [trackLeads, setTrackLeads] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm(defaultMonth ?? getDefaultMonth(), defaultYear ?? getDefaultYear()),
  });

  useEffect(() => {
    if (!open) return;
    const values = existingTarget
      ? targetToForm(existingTarget)
      : emptyForm(defaultMonth ?? getDefaultMonth(), defaultYear ?? getDefaultYear());
    form.reset(values);
    setTrackRevenue(values.trackRevenue);
    setTrackDeals(values.trackDeals);
    setTrackLeads(values.trackLeads);
  }, [open, existingTarget, defaultMonth, defaultYear, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await upsert.mutateAsync({
        userId,
        month: values.month,
        year: values.year,
        revenueTarget: values.trackRevenue ? (values.revenueTarget ?? null) : null,
        dealsTarget: values.trackDeals ? (values.dealsTarget ?? null) : null,
        leadsTarget: values.trackLeads ? (values.leadsTarget ?? null) : null,
        notes: values.notes?.trim() || null,
      });
      toast.success(`Target set for ${MONTH_NAMES[values.month - 1]} ${values.year}`);
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Failed to save target");
    }
  };

  const currentYear = getDefaultYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-base">Set monthly target</DialogTitle>
          <DialogDescription>
            Configure performance targets for <strong>{bdeNam}</strong>. Toggle the metrics you want to track.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 py-4 space-y-5">
              {/* Month + Year row */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Month</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MONTH_NAMES.map((name, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Year</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {yearOptions.map((y) => (
                            <SelectItem key={y} value={String(y)} className="text-xs">
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Closed project value target */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Closed project value</p>
                    <p className="text-[10px] text-muted-foreground">
                      Sum of deal values when you create a payment schedule (e.g. close ₹20,000 → target +₹20,000)
                    </p>
                  </div>
                  <Switch
                    checked={trackRevenue}
                    onCheckedChange={(checked) => {
                      setTrackRevenue(checked);
                      form.setValue("trackRevenue", checked);
                      if (!checked) form.setValue("revenueTarget", undefined);
                    }}
                  />
                </div>
                {trackRevenue && (
                  <FormField
                    control={form.control}
                    name="revenueTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              min={0}
                              placeholder="500000"
                              className="pl-6 h-8 text-xs"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Deals closed target */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Deals closed</p>
                    <p className="text-[10px] text-muted-foreground">Approved proposals</p>
                  </div>
                  <Switch
                    checked={trackDeals}
                    onCheckedChange={(checked) => {
                      setTrackDeals(checked);
                      form.setValue("trackDeals", checked);
                      if (!checked) form.setValue("dealsTarget", undefined);
                    }}
                  />
                </div>
                {trackDeals && (
                  <FormField
                    control={form.control}
                    name="dealsTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="5"
                            className="h-8 text-xs"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Leads target */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Leads</p>
                    <p className="text-[10px] text-muted-foreground">New leads assigned/created</p>
                  </div>
                  <Switch
                    checked={trackLeads}
                    onCheckedChange={(checked) => {
                      setTrackLeads(checked);
                      form.setValue("trackLeads", checked);
                      if (!checked) form.setValue("leadsTarget", undefined);
                    }}
                  />
                </div>
                {trackLeads && (
                  <FormField
                    control={form.control}
                    name="leadsTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="20"
                            className="h-8 text-xs"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Validation error when no metric enabled */}
              {form.formState.errors.trackRevenue && (
                <p className="text-[11px] text-destructive">{form.formState.errors.trackRevenue.message}</p>
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Focus on enterprise clients this month…"
                        rows={2}
                        className="text-xs resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={upsert.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {upsert.isPending ? "Saving…" : "Save target"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
