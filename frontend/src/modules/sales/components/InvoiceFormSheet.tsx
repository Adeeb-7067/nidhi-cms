import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  useCreateInvoice,
  useUpdateInvoice,
  useListCustomers,
  useListInstallments,
  useListProducts,
  useSalesSettings,
  type SalesInvoice,
  type SalesProduct,
} from "@/api/sales";
import type { ProposalLineItem } from "@/modules/sales/types";
import { formatCurrency } from "@/modules/sales/constants";
import { TotalAmountAdjustFields, totalAdjustPayload } from "@/modules/sales/components/total-amount-adjust";
import { useListProjects, getListProjectsQueryKey } from "@/api/generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── helpers ──────────────────────────────────────────────────────────────────

function calcTotals(items: ProposalLineItem[]) {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    tax += line * (item.taxPercent / 100);
  }
  return { subtotal, tax, total: Math.round(subtotal + tax) };
}

const emptyItem = (defaultTax = 0): ProposalLineItem => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxPercent: defaultTax,
});

const numInputClass =
  "h-8 text-xs tabular-nums text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// ── LineItemCard ──────────────────────────────────────────────────────────────

function LineItemCard({
  index,
  item,
  products,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  item: ProposalLineItem;
  products: SalesProduct[];
  onChange: (patch: Partial<ProposalLineItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const line = item.quantity * item.unitPrice;
  const lineTotal = line + line * (item.taxPercent / 100);

  const applyProduct = (productId: string) => {
    if (productId === "custom") return;
    const product = products.find((p) => String(p.id) === productId);
    if (!product) return;
    onChange({ name: product.name, description: product.description ?? "", unitPrice: product.price, taxPercent: product.taxPercent });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background border text-xs font-mono text-muted-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          {products.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">From catalog</Label>
              <Select onValueChange={applyProduct}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pick a product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" className="text-xs">Custom line item</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.name} — {formatCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Item name</Label>
            <Input className="h-8 text-xs" value={item.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. UI Design" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Description</Label>
            <Input className="h-8 text-xs" value={item.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Brief description (optional)" />
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove} disabled={!canRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 pl-9">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</Label>
          <Input type="number" min={0.01} step="any" className={numInputClass} value={item.quantity} onChange={(e) => onChange({ quantity: Number(e.target.value) || 1 })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit price</Label>
          <Input type="number" min={0} step="any" className={numInputClass} value={item.unitPrice} onChange={(e) => onChange({ unitPrice: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Tax %</Label>
          <Input type="number" min={0} max={100} step="any" className={numInputClass} value={item.taxPercent} onChange={(e) => onChange({ taxPercent: Number(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="pl-9 text-right">
        <span className="text-xs text-muted-foreground tabular-nums">Line total: {formatCurrency(Math.round(lineTotal))}</span>
      </div>
    </div>
  );
}

// ── InvoiceFormSheet ──────────────────────────────────────────────────────────

export function InvoiceFormSheet({
  open,
  onOpenChange,
  invoice,
  defaultCustomerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: SalesInvoice | null;
  defaultCustomerId?: number;
}) {
  const isEdit = invoice != null;
  const [, setLocation] = useLocation();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const { data: customersData } = useListCustomers({ limit: 200 }, open);
  const { data: installmentsData } = useListInstallments({ limit: 200 }, open);
  const { data: productsData } = useListProducts({ status: "active" }, open);
  const { data: settings } = useSalesSettings(open);
  const projectParams = { limit: 200 };
  const { data: projectsData } = useListProjects(projectParams, {
    query: { queryKey: getListProjectsQueryKey(projectParams), enabled: open },
  });

  const defaultTax = settings?.defaultTax ?? 0;
  const products = (productsData?.products ?? []).filter((p) => p.status === "active");

  // Form state
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<ProposalLineItem[]>([emptyItem(defaultTax)]);
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);

  // Seed from existing invoice when editing
  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setTitle(invoice.title ?? "");
      setCustomerId(String(invoice.customerId));
      setDueDate(invoice.dueDate.slice(0, 10));
      setProjectId(invoice.projectId ? String(invoice.projectId) : "");
      setInstallmentId(invoice.installmentId ? String(invoice.installmentId) : "");
      setNotes(invoice.notes ?? "");
      setTerms(invoice.terms ?? "");
      const seedItems = (invoice.lineItems ?? []).map((li) => ({
        id: li.itemId ?? crypto.randomUUID(),
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxPercent: li.taxPercent,
      }));
      setItems(seedItems.length > 0 ? seedItems : [emptyItem(defaultTax)]);
      setTotalAdjustment(invoice.totalAdjustment ?? 0);
      setAdjustedTotal(invoice.adjustedTotal ?? null);
      setUseCustomTotal(invoice.adjustedTotal != null);
    } else {
      setTitle("");
      setCustomerId(defaultCustomerId ? String(defaultCustomerId) : "");
      setDueDate("");
      setProjectId("");
      setInstallmentId("");
      setNotes("");
      setTerms("");
      setItems([emptyItem(defaultTax)]);
      setTotalAdjustment(0);
      setAdjustedTotal(null);
      setUseCustomTotal(false);
    }
  }, [open, invoice?.id, defaultCustomerId]);

  const { subtotal, tax, total: calculatedAmount } = useMemo(() => calcTotals(items), [items]);

  const payload = totalAdjustPayload(calculatedAmount, totalAdjustment, useCustomTotal, adjustedTotal);
  const finalAmount = payload.amount;

  const updateItem = (index: number, patch: Partial<ProposalLineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const addItem = () => setItems((prev) => [...prev, emptyItem(defaultTax)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error("Customer is required"); return; }
    if (!dueDate) { toast.error("Due date is required"); return; }
    if (items.some((it) => !it.name.trim())) { toast.error("All line items need a name"); return; }

    const lineItemsPayload = items.map((it) => ({
      itemId: it.id,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxPercent: it.taxPercent,
    }));

    const body = {
      title: title.trim() || null,
      customerId: Number(customerId),
      dueDate,
      projectId: projectId ? Number(projectId) : null,
      installmentId: installmentId ? Number(installmentId) : null,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      lineItems: lineItemsPayload,
      calculatedAmount: payload.calculatedAmount,
      totalAdjustment: payload.totalAdjustment ?? 0,
      adjustedTotal: payload.adjustedTotal,
    };

    try {
      if (isEdit) {
        await updateInvoice.mutateAsync({ id: invoice.id, ...body });
        toast.success("Invoice updated");
        onOpenChange(false);
      } else {
        const inv = await createInvoice.mutateAsync(body);
        toast.success(`Invoice ${inv.number} created`);
        onOpenChange(false);
        setLocation(`/sales/invoices/${inv.id}`);
      }
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update invoice" : "Failed to create invoice");
    }
  };

  const isPending = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 flex flex-col max-h-[92vh] gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle>{isEdit ? `Edit ${invoice.number}` : "New invoice"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update invoice details, line items, and linked records." : "Create an invoice with product line items."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs">Title (optional)</Label>
            <Input className="h-8 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website Design — Phase 1" />
          </div>

          {/* Customer + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Customer <span className="text-destructive">*</span></Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {(customersData?.customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due date <span className="text-destructive">*</span></Label>
              <Input type="date" className="h-8 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Project + Installment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Project (optional)</Label>
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {((projectsData as { projects?: { id: number; name: string }[] })?.projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Installment (optional)</Label>
              <Select value={installmentId || "none"} onValueChange={(v) => setInstallmentId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {(installmentsData?.installments ?? []).map((inst) => (
                    <SelectItem key={inst.id} value={String(inst.id)} className="text-xs">
                      {inst.name} — {formatCurrency(inst.dueAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Line items</Label>
              <Badge variant="secondary" className="text-[10px]">{items.length} item{items.length !== 1 ? "s" : ""}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <LineItemCard
                  key={item.id}
                  index={index}
                  item={item}
                  products={products}
                  onChange={(patch) => updateItem(index, patch)}
                  onRemove={() => removeItem(index)}
                  canRemove={items.length > 1}
                />
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add line item
            </Button>
          </div>

          {/* Totals summary */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="tabular-nums">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1 mt-1">
              <span>Total (before adjustments)</span>
              <span className="tabular-nums">{formatCurrency(calculatedAmount)}</span>
            </div>
          </div>

          {/* Total adjustments */}
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

          {/* Notes & terms */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Shown on the invoice — payment instructions, bank reference, or a message to the client.
              </p>
              <Textarea
                rows={4}
                className="text-xs resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please remit to the bank account listed below. Mention invoice number in the transfer reference."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Terms &amp; conditions (optional)</Label>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Legal or commercial terms. If left blank, standard payment terms apply on the PDF.
              </p>
              <Textarea
                rows={4}
                className="text-xs resize-none"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="e.g. Goods once sold will not be taken back. Disputes subject to Indore jurisdiction."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">
            Final: <span className="text-primary tabular-nums">{formatCurrency(finalAmount)}</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
