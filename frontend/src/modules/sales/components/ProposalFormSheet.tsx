import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  useCreateProposal,
  useUpdateProposal,
  useGetProposal,
  useSendProposal,
  useListLeads,
  useListCustomers,
  useListProducts,
  useSalesSettings,
  type SalesProduct,
} from "@/api/sales";
import type { ProposalLineItem } from "@/modules/sales/types";
import { formatCurrency } from "@/modules/sales/constants";
import { TotalAmountAdjustFields, proposalAdjustPayload } from "@/modules/sales/components/total-amount-adjust";
import { calcProposalTotal, formatDiscountPercent, resolveFinalTotal } from "@/modules/sales/utils";
import { useSalesStaff } from "@/modules/sales/use-sales-staff";
import type { User } from "@/api/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput, decimalInputClass } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

// ── helpers ───────────────────────────────────────────────────────────────────

const emptyItem = (defaultTax = 18): ProposalLineItem => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxPercent: defaultTax,
});

const numInputClass = `h-8 text-xs ${decimalInputClass}`;

// ── ProposalLineItemCard ──────────────────────────────────────────────────────

function ProposalLineItemCard({
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
    const p = products.find((p) => String(p.id) === productId);
    if (!p) return;
    onChange({ name: p.name, description: p.description ?? "", unitPrice: p.price, taxPercent: p.taxPercent });
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
      <div className="grid grid-cols-4 gap-2 pl-9">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</Label>
          <DecimalInput
            integer
            min={1}
            fallback={1}
            hideZero={false}
            className={numInputClass}
            value={item.quantity}
            onChange={(quantity) => onChange({ quantity })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit price</Label>
          <DecimalInput
            min={0}
            className={numInputClass}
            value={item.unitPrice}
            onChange={(unitPrice) => onChange({ unitPrice })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Tax %</Label>
          <DecimalInput
            min={0}
            max={100}
            hideZero={false}
            className={numInputClass}
            value={item.taxPercent}
            onChange={(taxPercent) => onChange({ taxPercent })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Line total</Label>
          <div className="flex h-8 items-center justify-end rounded-md border bg-background px-2 text-xs font-semibold tabular-nums">
            {formatCurrency(Math.round(lineTotal))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ProposalFormSheet ─────────────────────────────────────────────────────────

export function ProposalFormSheet({
  open,
  onOpenChange,
  editId,
  defaultLeadId,
  defaultCustomerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: number | null;
  defaultLeadId?: number | null;
  defaultCustomerId?: number | null;
}) {
  const isEdit = editId != null;
  const [, navigate] = useLocation();
  const submitMode = useRef<"draft" | "send">("draft");

  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const sendProposal = useSendProposal();
  const { staff } = useSalesStaff();
  const { data: leadsData } = useListLeads({ limit: 200 }, open);
  const { data: customersData } = useListCustomers({ limit: 200 }, open);
  const { data: productsData } = useListProducts({ status: "active" }, open);
  const { data: appSettings } = useSalesSettings(!isEdit && open);
  const { data: editData, isLoading: editLoading } = useGetProposal(editId ?? 0, isEdit && open);

  const catalogProducts = (productsData?.products ?? []).filter((p) => p.status === "active");

  // Form state
  const [title, setTitle] = useState("");
  const [clientType, setClientType] = useState<"lead" | "customer">(defaultCustomerId ? "customer" : "lead");
  const [clientId, setClientId] = useState(defaultLeadId ? String(defaultLeadId) : defaultCustomerId ? String(defaultCustomerId) : "");
  const [items, setItems] = useState<ProposalLineItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [taxRate, setTaxRate] = useState(18);
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [terms, setTerms] = useState("Net 30. Standard payment terms apply.");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Reset when sheet closes or opens fresh
  useEffect(() => {
    if (!open) { setHydrated(false); return; }
    if (!isEdit) {
      setTitle("");
      setClientType(defaultCustomerId ? "customer" : "lead");
      setClientId(defaultLeadId ? String(defaultLeadId) : defaultCustomerId ? String(defaultCustomerId) : "");
      setItems([emptyItem(appSettings?.defaultTax ?? 18)]);
      setDiscount(0);
      setTotalAdjustment(0);
      setAdjustedTotal(null);
      setUseCustomTotal(false);
      setValidUntil(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setTerms("Net 30. Standard payment terms apply.");
      setNotes("");
      setInternalNotes("");
      setAssignedTo("");
    }
  }, [open, isEdit, editId]);

  // Apply app settings default tax for new proposals
  useEffect(() => {
    if (isEdit || !appSettings || !open) return;
    setTaxRate(appSettings.defaultTax);
    setItems((prev) =>
      prev.length === 1 && !prev[0].name
        ? [{ ...emptyItem(), taxPercent: appSettings.defaultTax }]
        : prev
    );
  }, [appSettings, isEdit, open]);

  // Pre-fill from existing proposal when editing
  useEffect(() => {
    if (!isEdit || !editData || hydrated || !open) return;
    setTitle(editData.title ?? "");
    if (editData.leadId) { setClientType("lead"); setClientId(String(editData.leadId)); }
    else if (editData.customerId) { setClientType("customer"); setClientId(String(editData.customerId)); }
    setDiscount(editData.discount ?? 0);
    setTotalAdjustment(editData.totalAdjustment ?? 0);
    setAdjustedTotal(editData.adjustedTotal ?? null);
    setUseCustomTotal(editData.adjustedTotal != null);
    setValidUntil(editData.validUntil ? new Date(editData.validUntil).toISOString().slice(0, 10) : "");
    setTerms(editData.terms ?? "");
    setNotes(editData.clientNote ?? "");
    setInternalNotes(editData.internalNotes ?? "");
    setAssignedTo(editData.assignedTo ? String(editData.assignedTo) : "");
    if (editData.items?.length) {
      setTaxRate(editData.items[0]?.taxPercent ?? 18);
      setItems(editData.items.map((item: { name?: string; description: string; quantity: number; unitPrice: number; taxPercent: number }) => ({
        id: crypto.randomUUID(),
        name: item.name ?? "",
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent ?? 18,
      })));
    }
    setHydrated(true);
  }, [isEdit, editData, hydrated, open]);

  const totals = useMemo(
    () => calcProposalTotal({ items: items.map((i) => ({ ...i, itemId: i.id })), discount }),
    [items, discount],
  );
  const finalTotal = useMemo(
    () => resolveFinalTotal(totals.total, totalAdjustment, useCustomTotal ? adjustedTotal : null),
    [totals.total, totalAdjustment, useCustomTotal, adjustedTotal]
  );

  const updateItem = (id: string, patch: Partial<ProposalLineItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const addRow = () => setItems((prev) => [...prev, emptyItem(taxRate)]);
  const removeRow = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const handleSubmit = async (mode: "draft" | "send") => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!clientId && !isEdit) { toast.error("Select a lead or customer"); return; }
    const validItems = items.filter((i) => i.name.trim() || i.description.trim());
    if (validItems.length === 0) { toast.error("Add at least one line item"); return; }

    const payload = {
      title: title.trim(),
      items: validItems.map((i, idx) => ({
        itemId: String(idx + 1),
        name: i.name.trim(),
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxPercent: i.taxPercent,
      })),
      discount,
      ...proposalAdjustPayload(totalAdjustment, useCustomTotal, adjustedTotal),
      validUntil: validUntil || undefined,
      clientNote: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      assignedTo: assignedTo ? Number(assignedTo) : undefined,
    };

    try {
      let savedId: number;
      if (isEdit && editId) {
        await updateProposal.mutateAsync({ id: editId, ...payload });
        savedId = editId;
        if (mode === "draft") toast.success("Proposal updated");
      } else {
        const proposal = await createProposal.mutateAsync({
          ...payload,
          leadId: clientType === "lead" ? Number(clientId) : undefined,
          customerId: clientType === "customer" ? Number(clientId) : undefined,
        });
        savedId = proposal.id;
        if (mode === "draft") toast.success(`Proposal ${proposal.number} created`);
      }

      if (mode === "send") {
        const result = await sendProposal.mutateAsync({ id: savedId });
        const emailSent = (result as { emailSent?: boolean; sentToEmail?: string })?.emailSent;
        const to = (result as { sentToEmail?: string })?.sentToEmail;
        toast.success(isEdit ? "Proposal updated & sent" : "Proposal created & sent", {
          description: emailSent ? `Email delivered to ${to}` : "Status updated — no email on file.",
        });
      }

      onOpenChange(false);
      navigate(`/sales/proposals/${savedId}`);
    } catch (err) {
      toastApiError(err, mode === "send" ? "Failed to save & send" : isEdit ? "Failed to update" : "Failed to create");
    }
  };

  const isSaving = createProposal.isPending || updateProposal.isPending;
  const isSending = sendProposal.isPending;
  const isPending = isSaving || isSending;
  const loadingEdit = isEdit && editLoading && !hydrated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 flex flex-col max-h-[92vh] gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle>{isEdit ? "Edit proposal" : "New proposal"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update line items, pricing, and details." : "Build a proposal with line items and send it to your client."}
          </DialogDescription>
        </DialogHeader>

        {loadingEdit ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground py-16">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading proposal…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
              <Input className="h-8 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mobile App MVP" />
            </div>

            {/* Client */}
            {!isEdit && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Client type</Label>
                  <Select value={clientType} onValueChange={(v) => { setClientType(v as "lead" | "customer"); setClientId(""); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead" className="text-xs">Lead</SelectItem>
                      <SelectItem value="customer" className="text-xs">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{clientType === "lead" ? "Lead" : "Customer"} <span className="text-destructive">*</span></Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {clientType === "lead"
                        ? (leadsData?.leads ?? []).map((l) => (
                            <SelectItem key={l.id} value={String(l.id)} className="text-xs">
                              {l.company ? `${l.company} — ${l.name}` : l.name}
                            </SelectItem>
                          ))
                        : (customersData?.customers ?? []).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.companyName}</SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Valid until + Assigned to */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valid until</Label>
                <Input type="date" className="h-8 text-xs" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
              {staff.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Assigned to</Label>
                  <Select value={assignedTo || "default"} onValueChange={(v) => setAssignedTo(v === "default" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Current user" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-xs">Current user (default)</SelectItem>
                      {staff.map((s: User) => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Line items</Label>
                <Badge variant="secondary" className="text-[10px]">{items.length} item{items.length !== 1 ? "s" : ""}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <ProposalLineItemCard
                    key={item.id}
                    index={idx}
                    item={item}
                    products={catalogProducts}
                    onChange={(patch) => updateItem(item.id, patch)}
                    onRemove={() => removeRow(item.id)}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addRow}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add row
              </Button>
            </div>

            {/* Discount + Tax rate */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Discount %</Label>
                <DecimalInput
                  min={0}
                  max={100}
                  hideZero={false}
                  className={numInputClass}
                  value={discount}
                  onChange={setDiscount}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default tax % (applies to all rows)</Label>
                <DecimalInput
                  min={0}
                  max={100}
                  hideZero={false}
                  className={numInputClass}
                  value={taxRate}
                  onChange={(v) => {
                    setTaxRate(v);
                    setItems((prev) => prev.map((i) => ({ ...i, taxPercent: v })));
                  }}
                />
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(totals.grossSubtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><span className="tabular-nums">{formatCurrency(totals.grossTax)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount ({formatDiscountPercent(discount)}%)</span>
                  <span className="tabular-nums text-emerald-600">− {formatCurrency(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Total (before adjustments)</span>
                <span className="tabular-nums">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <TotalAmountAdjustFields
              calculatedTotal={totals.total}
              totalAdjustment={totalAdjustment}
              onTotalAdjustmentChange={setTotalAdjustment}
              adjustedTotal={adjustedTotal}
              onAdjustedTotalChange={setAdjustedTotal}
              useCustomTotal={useCustomTotal}
              onUseCustomTotalChange={setUseCustomTotal}
              finalTotal={finalTotal}
              compact
            />

            <Separator />

            {/* Notes */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Terms</Label>
                <Textarea rows={2} className="text-xs resize-none" value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Client notes</Label>
                <Textarea rows={2} className="text-xs resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible to client" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Internal notes</Label>
                <Textarea rows={2} className="text-xs resize-none" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Visible to sales team only" />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">
            Final: <span className="text-primary tabular-nums">{formatCurrency(finalTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button variant="outline" size="sm" onClick={() => handleSubmit("draft")} disabled={isPending || loadingEdit}>
              {isSaving && submitMode.current === "draft" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Save draft"}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { submitMode.current = "send"; handleSubmit("send"); }} disabled={isPending || loadingEdit}>
              {isSending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {isSending ? "Sending…" : "Save & Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
