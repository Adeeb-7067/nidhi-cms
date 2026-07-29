import { useMemo, useState } from "react";
import { Plus, Package, PackageCheck, Pencil, Trash2, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SalesPageHeader } from "@/modules/sales/components";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
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
  const inactiveCount = products.length - activeCount;
  const avgPrice = useMemo(() => {
    if (!products.length) return 0;
    return Math.round(products.reduce((s, p) => s + p.price, 0) / products.length);
  }, [products]);

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

  const columns: CmsColumn<SalesProduct>[] = [
    {
      id: "name",
      header: "Name",
      cell: (p) => (
        <>
          <p className="font-medium">{p.name}</p>
          {p.description ? <p className="text-[10px] text-muted-foreground">{p.description}</p> : null}
        </>
      ),
    },
    { id: "category", header: "Category", cell: (p) => p.category ?? "—" },
    {
      id: "price",
      header: "Price",
      align: "right",
      cell: (p) => <span className="tabular-nums">{formatCurrency(p.price)}</span>,
    },
    {
      id: "tax",
      header: "Tax",
      align: "right",
      cell: (p) => `${p.taxPercent}%`,
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (p) =>
        canManageCatalog ? (
          <Switch
            checked={p.status === "active"}
            onCheckedChange={() => toggleStatus(p.id, p.status)}
            disabled={updateProduct.isPending}
          />
        ) : (
          <CmsStatusChip label={p.status} tone={p.status === "active" ? "success" : "muted"} />
        ),
    },
    {
      id: "created",
      header: "Created",
      cell: (p) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatSalesDateTime(p.createdAt)}</span>
      ),
    },
    ...(canManageCatalog
      ? [
          {
            id: "actions",
            header: "Actions",
            align: "right" as const,
            headerClassName: "w-[100px]",
            cell: (p: SalesProduct) => (
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
            ),
          } satisfies CmsColumn<SalesProduct>,
        ]
      : []),
  ];

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

      <PortalKpiGrid
        items={[
          { title: "Catalog size", value: products.length, icon: Package, accent: "blue", delay: 0 },
          { title: "Active", value: activeCount, icon: PackageCheck, accent: "green", delay: 1 },
          { title: "Inactive", value: inactiveCount, icon: Package, accent: "amber", delay: 2 },
          {
            title: "Avg price",
            value: formatCurrency(avgPrice),
            icon: IndianRupee,
            accent: "violet",
            delay: 3,
          },
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
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional details"
                rows={3}
              />
            </div>
            <Button size="sm" className="w-full" onClick={addProduct} disabled={createProduct.isPending}>
              {createProduct.isPending ? "Saving…" : "Save product"}
            </Button>
          </CardContent>
        </Card>
        ) : null}

        <div className={canManageCatalog ? "lg:col-span-8 space-y-3" : "lg:col-span-12 space-y-3"}>
          <CmsDataTable
            columns={columns}
            rows={products}
            rowKey={(p) => p.id}
            isLoading={isLoading}
            error={isError}
            onRetry={() => refetch()}
            empty={{
              icon: Package,
              title: "No products",
              description: "Add your first product or service.",
            }}
          />
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
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
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
