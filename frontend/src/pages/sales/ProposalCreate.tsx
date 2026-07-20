import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Input } from "@/components/ui/input";
import { DecimalInput, decimalInputClass } from "@/components/ui/decimal-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProposal, useUpdateProposal, useGetProposal, useSendProposal, useListLeads, useListCustomers, useListProducts, useSalesSettings, type SalesProduct } from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import type { ProposalLineItem } from "@/modules/sales/types";
import { SalesPageHeader } from "@/modules/sales/components";
import { useSalesStaff } from "@/modules/sales/use-sales-staff";
import type { User } from "@/api/generated/api.schemas";
import { readSearchParam, resolveFinalTotal, calcProposalTotal, formatDiscountPercent } from "@/modules/sales/utils";
import { TotalAmountAdjustFields, proposalAdjustPayload } from "@/modules/sales/components";

function calcTotals(items: ProposalLineItem[], discount: number) {
  return calcProposalTotal({
    items: items.map((i) => ({ ...i, itemId: i.id })),
    discount,
  });
}

const emptyItem = (): ProposalLineItem => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxPercent: 18,
});

const lineItemNumberInputClass = `h-8 text-xs ${decimalInputClass}`;

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
    const product = products.find((p) => String(p.id) === productId);
    if (!product) return;
    onChange({
      name: product.name,
      description: product.description ?? "",
      unitPrice: product.price,
      taxPercent: product.taxPercent,
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border text-xs font-mono text-muted-foreground">
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
            <Input
              className="h-8 text-xs"
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. UI Design"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Description</Label>
            <Input
              className="h-8 text-xs"
              value={item.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Brief description"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remove line item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pl-0 sm:pl-11">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</Label>
          <DecimalInput
            integer
            min={1}
            fallback={1}
            hideZero={false}
            className={lineItemNumberInputClass}
            value={item.quantity}
            onChange={(quantity) => onChange({ quantity })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit price</Label>
          <DecimalInput
            min={0}
            className={lineItemNumberInputClass}
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
            className={lineItemNumberInputClass}
            value={item.taxPercent}
            onChange={(taxPercent) => onChange({ taxPercent })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Line total</Label>
          <div className="flex h-8 items-center justify-end rounded-md border border-border/60 bg-background px-2 text-xs font-semibold tabular-nums">
            {formatCurrency(lineTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProposalCreate() {
  const [, navigate] = useLocation();
  const submitMode = useRef<"draft" | "send">("draft");
  const editIdStr = readSearchParam("editId");
  const editId = editIdStr ? Number(editIdStr) : null;
  const isEditing = editId !== null;

  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const sendProposal = useSendProposal();
  const { staff } = useSalesStaff();
  const { data: leadsData } = useListLeads({ limit: 200 });
  const { data: customersData } = useListCustomers({ limit: 200 });
  const { data: productsData } = useListProducts({ status: "active" });
  const { data: appSettings } = useSalesSettings(!isEditing);
  const catalogProducts = productsData?.products ?? [];
  const { data: editData, isLoading: editLoading } = useGetProposal(editId ?? 0, isEditing);

  const prefillLeadId = readSearchParam("leadId");
  const prefillCustomerId = readSearchParam("customerId");

  const [title, setTitle] = useState("");
  const [clientType, setClientType] = useState<"lead" | "customer">(
    prefillCustomerId ? "customer" : "lead",
  );
  const [clientId, setClientId] = useState(prefillLeadId ?? prefillCustomerId ?? "");
  const [items, setItems] = useState<ProposalLineItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(null);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [taxRate, setTaxRate] = useState(18);
  const [validUntil, setValidUntil] = useState(
    () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [terms, setTerms] = useState("Net 30. Standard payment terms apply.");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isEditing || !appSettings) return;
    setTaxRate(appSettings.defaultTax);
    setItems((prev) =>
      prev.length === 1 && !prev[0].name
        ? [{ ...emptyItem(), taxPercent: appSettings.defaultTax }]
        : prev,
    );
  }, [appSettings, isEditing]);

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditing && editData && !hydrated) {
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
        setItems(editData.items.map((item: { name?: string; description: string; quantity: number; unitPrice: number; taxPercent: number }) => ({
          id: crypto.randomUUID(),
          name: item.name ?? "",
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxPercent: item.taxPercent ?? 18,
        })));
        setTaxRate(editData.items[0]?.taxPercent ?? 18);
      }
      setHydrated(true);
    }
  }, [isEditing, editData, hydrated]);

  useEffect(() => {
    if (!isEditing) {
      if (prefillLeadId) { setClientType("lead"); setClientId(prefillLeadId); }
      else if (prefillCustomerId) { setClientType("customer"); setClientId(prefillCustomerId); }
    }
  }, [isEditing, prefillLeadId, prefillCustomerId]);

  const leads = leadsData?.leads ?? [];
  const customers = customersData?.customers ?? [];
  const totals = useMemo(() => calcTotals(items, discount), [items, discount]);
  const finalTotal = useMemo(
    () =>
      resolveFinalTotal(
        totals.total,
        totalAdjustment,
        useCustomTotal ? adjustedTotal : null,
      ),
    [totals.total, totalAdjustment, useCustomTotal, adjustedTotal],
  );

  const updateItem = (id: string, patch: Partial<ProposalLineItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeRow = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!clientId) { toast.error("Select a lead or customer"); return; }
    const validItems = items.filter((i) => i.name.trim() || i.description.trim());
    if (validItems.length === 0) { toast.error("Add at least one line item with a description"); return; }
    const payload = {
      title: title.trim(),
      leadId: clientType === "lead" ? (clientId ? Number(clientId) : null) : null,
      customerId: clientType === "customer" ? (clientId ? Number(clientId) : null) : null,
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
    const shouldSend = submitMode.current === "send";
    try {
      let savedId: number;
      if (isEditing && editId) {
        await updateProposal.mutateAsync({ id: editId, ...payload });
        savedId = editId;
        if (!shouldSend) toast.success("Proposal updated");
      } else {
        const proposal = await createProposal.mutateAsync({
          ...payload,
          leadId: clientType === "lead" ? Number(clientId) : undefined,
          customerId: clientType === "customer" ? Number(clientId) : undefined,
        });
        savedId = proposal.id;
        if (!shouldSend) toast.success(`Proposal ${proposal.number} created`);
      }

      if (shouldSend) {
        const result = await sendProposal.mutateAsync({ id: savedId });
        const emailSent = (result as { emailSent?: boolean; sentToEmail?: string })?.emailSent;
        const to = (result as { sentToEmail?: string })?.sentToEmail;
        toast.success(isEditing ? "Proposal updated & sent" : "Proposal created & sent", {
          description: emailSent ? `Email delivered to ${to}` : "Status updated — no email on file for this client.",
        });
      }

      navigate(`/sales/proposals/${savedId}`);
    } catch (err) {
      toastApiError(err, shouldSend
        ? "Failed to save & send proposal"
        : isEditing ? "Failed to update proposal" : "Failed to create proposal"
      );
    }
  };

  if (isEditing && editLoading && !hydrated) {
    return (
      <PortalPageShell>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading proposal…</div>
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <motion.form
        className="space-y-4"
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <SalesPageHeader
          title={isEditing ? "Edit proposal" : "Create proposal"}
          description={isEditing ? "Update line items, pricing, and details." : "Build a new proposal with line items, tax, and discounts."}
          breadcrumbs={[
            { label: "Sales", href: "/sales" },
            { label: "Proposals", href: "/sales/proposals" },
            ...(isEditing && editId ? [{ label: `#${editId}`, href: `/sales/proposals/${editId}` }] : []),
            { label: isEditing ? "Edit" : "Create" },
          ]}
          actions={
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href={isEditing && editId ? `/sales/proposals/${editId}` : "/sales/proposals"}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Link>
            </Button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Proposal details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mobile App MVP"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Client type</Label>
                    <Select
                      value={clientType}
                      onValueChange={(v) => {
                        setClientType(v as "lead" | "customer");
                        setClientId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{clientType === "lead" ? "Lead" : "Customer"}</Label>
                    <Select value={clientId} onValueChange={setClientId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientType === "lead"
                          ? leads.map((l) => (
                              <SelectItem key={l.id} value={String(l.id)}>
                                {l.company ? `${l.company} — ${l.name}` : l.name}
                              </SelectItem>
                            ))
                          : customers.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.companyName}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid until</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
                {staff.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Assigned to</Label>
                    <Select value={assignedTo || "default"} onValueChange={(v) => setAssignedTo(v === "default" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Current user (default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Current user (default)</SelectItem>
                        {staff.map((s: User) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">Line items</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={addRow}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add row
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="terms">Terms</Label>
                  <Textarea id="terms" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Client notes</Label>
                  <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Internal notes</Label>
                  <Textarea
                    id="internalNotes"
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Visible to sales team only"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default tax %</Label>
                  <DecimalInput
                    min={0}
                    max={100}
                    hideZero={false}
                    value={taxRate}
                    onChange={(v) => {
                      setTaxRate(v);
                      setItems((prev) => prev.map((i) => ({ ...i, taxPercent: v })));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <DecimalInput
                    min={0}
                    max={100}
                    hideZero={false}
                    value={discount}
                    onChange={setDiscount}
                  />
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">{formatCurrency(totals.grossSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium tabular-nums">{formatCurrency(totals.grossTax)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount ({formatDiscountPercent(discount)}%)</span>
                      <span className="font-medium tabular-nums text-emerald-600">− {formatCurrency(totals.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total (before adjustments)</span>
                    <span className="tabular-nums">{formatCurrency(totals.total)}</span>
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
                  />
                </div>
                <div className="space-y-2">
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    onClick={() => { submitMode.current = "draft"; }}
                    disabled={createProposal.isPending || updateProposal.isPending || sendProposal.isPending}
                  >
                    {(createProposal.isPending || updateProposal.isPending) && submitMode.current === "draft"
                      ? "Saving…"
                      : isEditing ? "Save changes" : "Save draft"}
                  </Button>
                  <Button
                    type="submit"
                    className="w-full gap-1.5"
                    onClick={() => { submitMode.current = "send"; }}
                    disabled={createProposal.isPending || updateProposal.isPending || sendProposal.isPending}
                  >
                    {sendProposal.isPending || ((createProposal.isPending || updateProposal.isPending) && submitMode.current === "send")
                      ? "Sending…"
                      : <><Send className="h-3.5 w-3.5" />Save & Send</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.form>
    </PortalPageShell>
  );
}
