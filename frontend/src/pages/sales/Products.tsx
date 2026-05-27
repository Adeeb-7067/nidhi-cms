import { useMemo, useState } from "react";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { mockProducts } from "@/modules/sales/mock-data";

type CatalogProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  taxPercent: number;
  status: "active" | "inactive";
  description?: string;
};
import { formatCurrency } from "@/modules/sales/constants";
import { SalesPageHeader, SalesEmptyState } from "@/modules/sales/components";
import { toast } from "sonner";

export default function Products() {
  const [products, setProducts] = useState<CatalogProduct[]>([...mockProducts]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Services");
  const [price, setPrice] = useState("");
  const [tax, setTax] = useState("18");

  const activeCount = useMemo(() => products.filter((p) => p.status === "active").length, [products]);

  const addProduct = () => {
    if (!name.trim() || !price) {
      toast.error("Name and price are required");
      return;
    }
    setProducts((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        name: name.trim(),
        category,
        price: Number(price),
        taxPercent: Number(tax),
        status: "active",
      },
    ]);
    setName("");
    setPrice("");
    toast.success("Product added (demo)");
  };

  const toggleStatus = (id: number) => {
    setProducts((prev) =>
      prev.map((p): CatalogProduct =>
        p.id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p,
      ),
    );
  };

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Products & services"
        description="Central pricing catalog — products, services, GST, and discount rules."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Products & services" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add product / service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CRM Implementation" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GST %</Label>
                <Input type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={addProduct}>Save product</Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-3">
          <p className="text-xs text-muted-foreground">{activeCount} active · {products.length} total in catalog</p>
          {products.length === 0 ? (
            <SalesEmptyState icon={Package} title="No products" description="Add your first product or service." />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-right">Price</TableHead>
                    <TableHead className="text-xs text-right">Tax</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-xs font-medium">{p.name}</p>
                        {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                      </TableCell>
                      <TableCell className="text-xs">{p.category}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{formatCurrency(p.price)}</TableCell>
                      <TableCell className="text-xs text-right">{p.taxPercent}%</TableCell>
                      <TableCell>
                        <Switch checked={p.status === "active"} onCheckedChange={() => toggleStatus(p.id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </PortalPageShell>
  );
}
