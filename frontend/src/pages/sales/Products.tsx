import { useMemo, useState } from "react";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type SalesProduct,
} from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { SalesPageHeader, SalesEmptyState } from "@/modules/sales/components";
import { usePermissions } from "@/modules/permissions/usePermission";

type ProductForm = {
  name: string;
  category: string;
  price: string;
  tax: string;
  description: string;
};

const emptyForm = (): ProductForm => ({
  name: "",
  category: "Services",
  price: "",
  tax: "18",
  description: "",
});

export default function Products() {
  const { can } = usePermissions();
  const canManageCatalog = can("sales_products", "edit");
  const { data, isLoading, isError, refetch } = useListProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = data?.products ?? [];
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SalesProduct | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<SalesProduct | null>(null);

  const activeCount = useMemo(() => products.filter((p) => p.status === "active").length, [products]);

  const addProduct = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    try {
      await createProduct.mutateAsync({
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        taxPercent: Number(form.tax),
        description: form.description.trim() || undefined,
      });
      toast.success("Product added");
      setForm(emptyForm());
    } catch (err) {
      toastApiError(err, "Failed to add product");
    }
  };

  const openEdit = (product: SalesProduct) => {
    setEditing(product);
    setEditForm({
      name: product.name,
      category: product.category ?? "Services",
      price: String(product.price),
      tax: String(product.taxPercent),
      description: product.description ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.name.trim() || !editForm.price) {
      toast.error("Name and price are required");
      return;
    }
    try {
      await updateProduct.mutateAsync({
        id: editing.id,
        name: editForm.name.trim(),
        category: editForm.category,
        price: Number(editForm.price),
        taxPercent: Number(editForm.tax),
        description: editForm.description.trim() || null,
      });
      toast.success("Product updated");
      setEditOpen(false);
      setEditing(null);
    } catch (err) {
      toastApiError(err, "Failed to update product");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct.mutateAsync(deleteTarget.id);
      toast.success("Product deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete product");
    }
  };

  const toggleStatus = async (id: number, current: "active" | "inactive") => {
    try {
      await updateProduct.mutateAsync({
        id,
        status: current === "active" ? "inactive" : "active",
      });
    } catch (err) {
      toastApiError(err, "Failed to update product");
    }
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
        {canManageCatalog ? (
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
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="CRM Implementation" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GST %</Label>
                <Input type="number" value={form.tax} onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional details" />
            </div>
            <Button size="sm" className="w-full" onClick={addProduct} disabled={createProduct.isPending}>
              {createProduct.isPending ? "Saving…" : "Save product"}
            </Button>
          </CardContent>
        </Card>
        ) : null}

        <div className={canManageCatalog ? "lg:col-span-8 space-y-3" : "lg:col-span-12 space-y-3"}>
          <p className="text-xs text-muted-foreground">{activeCount} active · {products.length} total in catalog</p>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : isError ? (
            <SalesEmptyState icon={Package} title="Failed to load products" actionLabel="Retry" onAction={() => refetch()} />
          ) : products.length === 0 ? (
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
                    <TableHead className="text-xs">Created</TableHead>
                    {canManageCatalog ? (
                      <TableHead className="text-xs text-right w-[100px]">Actions</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-xs font-medium">{p.name}</p>
                        {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                      </TableCell>
                      <TableCell className="text-xs">{p.category ?? "—"}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{formatCurrency(p.price)}</TableCell>
                      <TableCell className="text-xs text-right">{p.taxPercent}%</TableCell>
                      <TableCell>
                        {canManageCatalog ? (
                          <Switch
                            checked={p.status === "active"}
                            onCheckedChange={() => toggleStatus(p.id, p.status)}
                            disabled={updateProduct.isPending}
                          />
                        ) : (
                          <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatSalesDateTime(p.createdAt)}
                      </TableCell>
                      {canManageCatalog ? (
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit product"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete product"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹)</Label>
                <Input type="number" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">GST %</Label>
                <Input type="number" value={editForm.tax} onChange={(e) => setEditForm((f) => ({ ...f, tax: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={updateProduct.isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveEdit} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove "${deleteTarget.name}" from the catalog. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProduct.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProduct.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteProduct.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalPageShell>
  );
}
