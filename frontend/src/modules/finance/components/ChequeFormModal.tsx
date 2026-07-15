import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/ui/file-uploader";
import { useListClients } from "@/api/generated/api";
import { useHrmEmployees } from "@/api/hrm";
import {
  useCreateCheque,
  useUpdateCheque,
  useListVendors,
  type FinanceCheque,
  type ChequePayeeType,
  type ChequePurpose,
} from "@/api/finance";
import {
  CHEQUE_PAYEE_TYPE_LABELS,
  CHEQUE_PURPOSE_LABELS,
} from "../constants";

const chequeSchema = z
  .object({
    payeeType: z.enum(["vendor", "client", "employee"]),
    vendorId: z.string().optional(),
    clientId: z.string().optional(),
    employeeId: z.string().optional(),
    purpose: z.enum(["normal", "security_deposit"]),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((v) => Number(v) > 0, "Amount must be greater than zero"),
    chequeNumber: z.string().min(1, "Cheque number is required"),
    issueDate: z.string().min(1, "Issue date is required"),
    clearanceDate: z.string().min(1, "Clearance date is required"),
    bankName: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.payeeType === "vendor" && !values.vendorId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vendor is required", path: ["vendorId"] });
    }
    if (values.payeeType === "client" && !values.clientId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Client is required", path: ["clientId"] });
    }
    if (values.payeeType === "employee" && !values.employeeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Employee is required", path: ["employeeId"] });
    }
    if (values.clearanceDate && values.issueDate && values.clearanceDate < values.issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clearance date cannot be before issue date",
        path: ["clearanceDate"],
      });
    }
  });

type ChequeFormValues = z.infer<typeof chequeSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  cheque?: FinanceCheque | null;
};

export function ChequeFormModal({ open, onOpenChange, onSuccess, cheque }: Props) {
  const isEdit = cheque != null;
  const createCheque = useCreateCheque();
  const updateCheque = useUpdateCheque();
  const isPending = createCheque.isPending || updateCheque.isPending;
  const { data: vendorsData } = useListVendors(undefined, open);
  const { data: clientsData } = useListClients({ limit: 200 }, { query: { enabled: open } });
  const { data: employeesData } = useHrmEmployees({ limit: 200, status: "active" }, { enabled: open });
  const [attachments, setAttachments] = useState<{ name: string; url: string; key?: string; mimetype?: string; size?: number }[]>([]);

  const blankDefaults: ChequeFormValues = {
    payeeType: "vendor",
    vendorId: "",
    clientId: "",
    employeeId: "",
    purpose: "normal",
    amount: "",
    chequeNumber: "",
    issueDate: new Date().toISOString().slice(0, 10),
    clearanceDate: "",
    bankName: "",
    notes: "",
  };

  const form = useForm<ChequeFormValues>({
    resolver: zodResolver(chequeSchema),
    defaultValues: blankDefaults,
  });

  const payeeType = form.watch("payeeType");

  useEffect(() => {
    if (!open) return;
    form.reset(
      cheque
        ? {
            payeeType: cheque.payeeType,
            vendorId: cheque.vendorId ? String(cheque.vendorId) : "",
            clientId: cheque.clientId ? String(cheque.clientId) : "",
            employeeId: cheque.employeeId ? String(cheque.employeeId) : "",
            purpose: cheque.purpose,
            amount: String(cheque.amount),
            chequeNumber: cheque.chequeNumber,
            issueDate: cheque.issueDate.slice(0, 10),
            clearanceDate: cheque.clearanceDate.slice(0, 10),
            bankName: cheque.bankName ?? "",
            notes: cheque.notes ?? "",
          }
        : blankDefaults,
    );
    setAttachments(
      cheque?.attachments?.map((a) => ({
        name: a.name,
        url: a.url,
        key: a.key,
        mimetype: a.mimetype,
        size: a.size,
      })) ?? [],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cheque, form]);

  const onSubmit = async (values: ChequeFormValues) => {
    try {
      if (isEdit && cheque) {
        await updateCheque.mutateAsync({
          id: cheque.id,
          chequeNumber: values.chequeNumber.trim(),
          issueDate: values.issueDate,
          clearanceDate: values.clearanceDate,
          bankName: values.bankName?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          amount: Number(values.amount),
          attachments,
        });
        toast.success("Cheque updated");
      } else {
        await createCheque.mutateAsync({
          payeeType: values.payeeType as ChequePayeeType,
          vendorId: values.payeeType === "vendor" ? Number(values.vendorId) : null,
          clientId: values.payeeType === "client" ? Number(values.clientId) : null,
          employeeId: values.payeeType === "employee" ? Number(values.employeeId) : null,
          purpose: values.purpose as ChequePurpose,
          amount: Number(values.amount),
          chequeNumber: values.chequeNumber.trim(),
          issueDate: values.issueDate,
          clearanceDate: values.clearanceDate,
          bankName: values.bankName?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          attachments,
        });
        toast.success("Cheque issued — linked expense created");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update cheque" : "Failed to issue cheque");
    }
  };

  const vendors = vendorsData?.vendors ?? [];
  const clients = clientsData?.clients ?? [];
  const employees = employeesData?.employees ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{isEdit ? "Edit cheque" : "Issue cheque"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update dates, photo, or notes while the cheque is still issued."
              : "Creates an unpaid cheque expense immediately. Clear the cheque later to settle payment."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {!isEdit && (
                <>
                  <FormField
                    control={form.control}
                    name="payeeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payee type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(CHEQUE_PAYEE_TYPE_LABELS) as ChequePayeeType[]).map((k) => (
                              <SelectItem key={k} value={k}>
                                {CHEQUE_PAYEE_TYPE_LABELS[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {payeeType === "vendor" && (
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors.map((v) => (
                                <SelectItem key={v.id} value={String(v.id)}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {payeeType === "client" && (
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.companyName || `Client #${c.id}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {payeeType === "employee" && (
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map((e) => (
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
                  )}

                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(CHEQUE_PURPOSE_LABELS) as ChequePurpose[]).map((k) => (
                              <SelectItem key={k} value={k}>
                                {CHEQUE_PURPOSE_LABELS[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chequeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 004521" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clearanceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clearance date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label className="mb-2 block text-sm font-medium">Cheque photo</Label>
                <FileUploader
                  accept="image/*,.pdf"
                  category="finance"
                  onUploadComplete={(url, meta) => {
                    if (!url) return;
                    setAttachments((prev) => [
                      ...prev,
                      {
                        name: meta?.fileName ?? "Cheque",
                        url,
                      },
                    ]);
                    toast.success("Cheque image uploaded");
                  }}
                />
                {attachments.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {attachments.map((a) => (
                      <li key={a.url} className="truncate">
                        {a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DialogBody>
            <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Issue cheque"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
