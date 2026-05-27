import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockLeads, mockCustomers } from "@/modules/sales/mock-data";
import { formatCurrency } from "@/modules/sales/constants";
import type { ProposalLineItem } from "@/modules/sales/types";
import { SalesPageHeader } from "@/modules/sales/components";
import { toast } from "sonner";

function calcTotals(items: ProposalLineItem[], discount: number) {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    tax += line * (item.taxPercent / 100);
  }
  const discountAmt = subtotal * (discount / 100);
  subtotal -= discountAmt;
  tax = tax * (1 - discount / 100);
  return { subtotal, tax, total: subtotal + tax };
}

const emptyItem = (): ProposalLineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxPercent: 18,
});

export default function ProposalCreate() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [clientType, setClientType] = useState<"lead" | "customer">("lead");
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<ProposalLineItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [validUntil, setValidUntil] = useState("2026-06-30");
  const [terms, setTerms] = useState("Net 30. Standard payment terms apply.");
  const [notes, setNotes] = useState("");

  const totals = useMemo(() => calcTotals(items, discount), [items, discount]);

  const updateItem = (id: string, patch: Partial<ProposalLineItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeRow = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Proposal saved (demo)");
    navigate("/sales/proposals");
  };

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
        title="Create proposal"
        description="Build a new proposal with line items, tax, and discounts."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Proposals", href: "/sales/proposals" },
          { label: "Create" },
        ]}
        actions={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/sales/proposals">
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
                        ? mockLeads.map((l) => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              {l.company} — {l.name}
                            </SelectItem>
                          ))
                        : mockCustomers.map((c) => (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Line items</CardTitle>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" />
                Add row
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs min-w-[200px]">Description</TableHead>
                      <TableHead className="text-xs w-20">Qty</TableHead>
                      <TableHead className="text-xs w-28">Unit price</TableHead>
                      <TableHead className="text-xs w-20">Tax %</TableHead>
                      <TableHead className="text-xs w-28 text-right">Line total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const line = item.quantity * item.unitPrice;
                      const lineTax = line * (item.taxPercent / 100);
                      const lineTotal = line + lineTax;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              className="h-8 text-xs"
                              value={item.description}
                              onChange={(e) =>
                                updateItem(item.id, { description: e.target.value })
                              }
                              placeholder="Service description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-xs"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.id, { quantity: Number(e.target.value) })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-xs"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItem(item.id, { unitPrice: Number(e.target.value) })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="h-8 text-xs"
                              value={item.taxPercent}
                              onChange={(e) =>
                                updateItem(item.id, { taxPercent: Number(e.target.value) })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium tabular-nums">
                            {formatCurrency(lineTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeRow(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="terms">Terms</Label>
                <Textarea id="terms" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTaxRate(v);
                    setItems((prev) => prev.map((i) => ({ ...i, taxPercent: v })));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium tabular-nums">{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1 border-t">
                  <span>Total</span>
                  <span className="tabular-nums text-primary">{formatCurrency(totals.total)}</span>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Save proposal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.form>
    </PortalPageShell>
  );
}
