import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useCreateLead, useListSalesConfig, useUpdateLead, type Lead } from "@/api/sales";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatLeadContactChannelLabel,
  formatLeadSourceLabel,
  LEAD_CONTACT_CHANNEL_PRESETS,
  LEAD_PRIORITY_OPTIONS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
} from "../constants";
import type { LeadPriority, LeadSource, LeadStatus } from "../types";
import { useSalesStaff } from "../use-sales-staff";
import type { User } from "@/api/generated/api.schemas";
import { LeadAddableSelect } from "./LeadAddableSelect";

const optionalEmail = z
  .string()
  .refine((v) => !v.trim() || z.string().email().safeParse(v.trim()).success, {
    message: "Invalid email",
  });

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: optionalEmail,
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  position: z.string().optional(),
  source: z.string(),
  contactChannel: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  assignedTo: z.string(),
  expectedValue: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_CHANNEL_VALUE = "__none__";

const EMPTY_FORM_VALUES: FormValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  position: "",
  source: "website",
  contactChannel: "",
  status: "new",
  priority: "medium",
  assignedTo: "",
  expectedValue: "",
  tags: "",
  description: "",
  notes: "",
};

function parseTags(raw?: string) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function mergeSelectOptions(
  presets: Array<{ value: string; label: string }>,
  configItems: Array<{ value: string; label: string }> = [],
  currentValue?: string | null,
  formatCurrent?: (value: string) => string,
) {
  const seen = new Set<string>();
  const merged: Array<{ value: string; label: string }> = [];
  for (const item of [...presets, ...configItems]) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    merged.push(item);
  }
  if (currentValue?.trim() && !seen.has(currentValue)) {
    merged.push({
      value: currentValue,
      label: formatCurrent?.(currentValue) ?? currentValue,
    });
  }
  return merged;
}

function leadToFormValues(lead: Lead): FormValues {
  return {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    company: lead.company ?? "",
    address: lead.address ?? "",
    position: lead.position ?? "",
    source: lead.source ?? "website",
    contactChannel: lead.contactChannel ?? "",
    status: lead.status,
    priority: lead.priority,
    assignedTo: lead.assignedTo != null ? String(lead.assignedTo) : "",
    expectedValue: lead.expectedValue ? String(lead.expectedValue) : "",
    tags: lead.tags?.join(", ") ?? "",
    description: lead.description ?? "",
    notes: "",
  };
}

function buildLeadPayload(values: FormValues) {
  const contactChannel =
    values.contactChannel && values.contactChannel !== EMPTY_CHANNEL_VALUE
      ? values.contactChannel
      : null;
  const descriptionParts = [values.description?.trim(), values.notes?.trim()].filter(Boolean);

  return {
    name: values.name.trim(),
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    company: values.company?.trim() || null,
    address: values.address?.trim() || null,
    position: values.position?.trim() || null,
    source: values.source,
    contactChannel,
    status: values.status as LeadStatus,
    priority: values.priority as LeadPriority,
    assignedTo: values.assignedTo && values.assignedTo !== "none" ? Number(values.assignedTo) : null,
    expectedValue: Number(values.expectedValue) || 0,
    tags: parseTags(values.tags),
    description: descriptionParts.length ? descriptionParts.join("\n\n") : null,
  };
}

export function LeadFormModal({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSuccess?: () => void;
}) {
  const isEdit = lead != null;
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const isPending = createLead.isPending || updateLead.isPending;
  const { staff } = useSalesStaff();
  const { data: sourceConfig } = useListSalesConfig("lead_source", open);
  const { data: channelConfig } = useListSalesConfig("lead_channel", open);

  const sourceOptions = useMemo(
    () =>
      mergeSelectOptions(
        (Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((value) => ({
          value,
          label: LEAD_SOURCE_LABELS[value],
        })),
        (sourceConfig?.items ?? []).map((item) => ({ value: item.value, label: item.label })),
        lead?.source,
        formatLeadSourceLabel,
      ),
    [sourceConfig?.items, lead?.source],
  );

  const channelOptions = useMemo(
    () =>
      mergeSelectOptions(
        LEAD_CONTACT_CHANNEL_PRESETS.map((item) => ({ value: item.value, label: item.label })),
        (channelConfig?.items ?? []).map((item) => ({ value: item.value, label: item.label })),
        lead?.contactChannel,
        formatLeadContactChannelLabel,
      ),
    [channelConfig?.items, lead?.contactChannel],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(lead ? leadToFormValues(lead) : EMPTY_FORM_VALUES);
  }, [open, lead, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = buildLeadPayload(values);
      if (isEdit && lead) {
        await updateLead.mutateAsync({ id: lead.id, ...payload });
        toast.success(`Lead "${values.name}" updated`);
      } else {
        await createLead.mutateAsync(payload);
        toast.success(`Lead "${values.name}" created`);
      }
      form.reset(EMPTY_FORM_VALUES);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update lead" : "Failed to create lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit lead" : "Add lead"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update lead details, assignment, and qualification fields."
              : "Capture a new sales lead and assign an executive."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Street, city, state…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CEO, Marketing Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <LeadAddableSelect
                        label="Source"
                        value={field.value}
                        onChange={field.onChange}
                        options={sourceOptions}
                        configType="lead_source"
                        placeholder="Select source"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactChannel"
                  render={({ field }) => (
                    <FormItem>
                      <LeadAddableSelect
                        label="Contact channel"
                        value={field.value || EMPTY_CHANNEL_VALUE}
                        onChange={(next) => field.onChange(next === EMPTY_CHANNEL_VALUE ? "" : next)}
                        options={channelOptions}
                        configType="lead_channel"
                        placeholder="Call, web, etc."
                        allowEmpty
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_STATUS_ORDER.map((status) => (
                            <SelectItem key={status} value={status}>
                              {LEAD_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned person</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {staff.map((e: User) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="expectedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead value (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="hot, enterprise" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px]">Comma-separated</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Lead summary, requirements…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isEdit ? (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Initial context…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}