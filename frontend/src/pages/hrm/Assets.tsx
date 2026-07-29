import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Laptop, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmField,
  portalActionButtonClass,
  HrmRefRefreshButton,
  hrmRefCountSubtitle,
} from "@/modules/hrm/components";
import {
  HrmRefDetailRow,
  HrmRefDetailSection,
  HrmRefStatusPill,
} from "@/modules/hrm/hrm-reference-kit";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  assetStatusTone,
} from "@/modules/hrm/asset-constants";
import {
  useCreateAsset,
  useDeleteAsset,
  useHrmAssets,
  useHrmEmployees,
  useUpdateAsset,
} from "@/api/hrm";
import { inrMoney } from "@/modules/hrm/payslip-view-model";
import type { HrmAsset } from "@/modules/hrm/types";

type AssetForm = {
  tag: string;
  category: string;
  brand: string;
  serial: string;
  cost: string;
  condition: string;
  status: string;
  assignedUserId: string;
  notes: string;
};

const emptyForm = (): AssetForm => ({
  tag: "",
  category: "Laptop",
  brand: "",
  serial: "",
  cost: "",
  condition: "good",
  status: "in_stock",
  assignedUserId: "none",
  notes: "",
});

function toForm(asset: HrmAsset): AssetForm {
  return {
    tag: asset.tag,
    category: asset.category,
    brand: asset.brand,
    serial: asset.serial ?? "",
    cost: String(asset.cost ?? 0),
    condition: asset.condition ?? "good",
    status: asset.status ?? "in_stock",
    assignedUserId: asset.assignedUserId ? String(asset.assignedUserId) : "none",
    notes: asset.notes ?? "",
  };
}

export default function HrmAssetsPage() {
  const canCreate = useHrmPermission("assets", "create");
  const canEdit = useHrmPermission("assets", "edit");
  const canDelete = useHrmPermission("assets", "delete");

  const { data, isLoading, refetch, isFetching } = useHrmAssets();
  const { data: employeesData } = useHrmEmployees({ status: "active", limit: 500 });
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const assets = data?.assets ?? [];
  const employees = employeesData?.employees ?? [];

  const [detailAsset, setDetailAsset] = useState<HrmAsset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HrmAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrmAsset | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);

  const kpiItems = useMemo(() => {
    const assigned = assets.filter((a) => a.status === "assigned").length;
    const inStock = assets.filter((a) => a.status === "in_stock").length;
    const inRepair = assets.filter((a) => a.status === "in_repair").length;
    const totalValue = assets.reduce((sum, a) => sum + (a.cost ?? 0), 0);
    return [
      { label: "Total assets", value: assets.length, hint: "Inventory items", icon: Package, accent: "violet" as const },
      { label: "Assigned", value: assigned, hint: "With employees", icon: Laptop, accent: "green" as const },
      { label: "In stock", value: inStock, hint: "Available", icon: Package, accent: "blue" as const },
      { label: "Asset value", value: inrMoney(totalValue), hint: inRepair ? `${inRepair} in repair` : "Book value", icon: Package, accent: "amber" as const },
    ];
  }, [assets]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (asset: HrmAsset) => {
    setEditing(asset);
    setForm(toForm(asset));
    setFormOpen(true);
  };

  const openDetail = (asset: HrmAsset) => {
    setDetailAsset(asset);
  };

  const submitForm = async () => {
    if (!form.brand.trim()) {
      toast.error("Brand is required");
      return;
    }
    const payload = {
      tag: form.tag.trim() || undefined,
      category: form.category,
      brand: form.brand.trim(),
      serial: form.serial.trim(),
      cost: form.cost ? Number(form.cost) : 0,
      condition: form.condition,
      status: form.status,
      assignedUserId: form.assignedUserId === "none" ? null : Number(form.assignedUserId),
      notes: form.notes.trim(),
    };
    try {
      if (editing) {
        const updated = await updateAsset.mutateAsync({ id: editing.id, ...payload });
        toast.success("Asset updated");
        if (detailAsset?.id === editing.id) setDetailAsset(updated);
      } else {
        const created = await createAsset.mutateAsync(payload);
        toast.success("Asset added");
        setDetailAsset(created);
      }
      setFormOpen(false);
    } catch {
      // mutation toast
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAsset.mutateAsync(deleteTarget.id);
      toast.success("Asset removed");
      if (detailAsset?.id === deleteTarget.id) setDetailAsset(null);
      setDeleteTarget(null);
    } catch {
      // mutation toast
    }
  };

  const columns = useMemo((): Column<HrmAsset>[] => [
    {
      id: "tag",
      header: "Tag",
      className: "w-28",
      cell: (a) => <span className="font-mono text-[11px]">{a.tag}</span>,
      exportValue: (a) => a.tag,
    },
    {
      id: "category",
      header: "Category",
      className: "w-32",
      cell: (a) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <Laptop className="size-3.5 shrink-0 text-muted-foreground" />
          {a.category}
        </span>
      ),
      exportValue: (a) => a.category,
    },
    {
      id: "brand",
      header: "Brand / model",
      cell: (a) => <span className="text-xs font-medium">{a.brand}</span>,
      exportValue: (a) => a.brand,
    },
    {
      id: "assigned",
      header: "Assigned to",
      cell: (a) =>
        a.assignedToName ? (
          <div className="flex items-center gap-2">
            <HrmEmployeeAvatar name={a.assignedToName} avatarUrl={a.assignedAvatarUrl} className="h-6 w-6" />
            <span className="text-xs">{a.assignedToName}</span>
          </div>
        ) : (
          <span className="text-xs">—</span>
        ),
      exportValue: (a) => a.assignedToName ?? "—",
    },
    {
      id: "condition",
      header: "Condition",
      className: "w-28",
      cell: (a) => <span className="text-xs">{ASSET_CONDITION_LABELS[a.condition] ?? a.condition}</span>,
      exportValue: (a) => ASSET_CONDITION_LABELS[a.condition] ?? a.condition,
    },
    {
      id: "cost",
      header: "Cost",
      className: "w-28 text-right",
      cell: (a) => <span className="text-xs tabular-nums">{inrMoney(a.cost ?? 0)}</span>,
      exportValue: (a) => inrMoney(a.cost ?? 0),
    },
    {
      id: "status",
      header: "Status",
      className: "w-28",
      cell: (a) => (
        <HrmRefStatusPill tone={assetStatusTone(a.status)}>
          {ASSET_STATUS_LABELS[a.status] ?? a.status}
        </HrmRefStatusPill>
      ),
      exportValue: (a) => ASSET_STATUS_LABELS[a.status] ?? a.status,
    },
  ], []);

  return (
    <HrmGate module="assets">
      <HrmPageShell>
        <HrmPageHero
          title="Assets"
          description={hrmRefCountSubtitle(assets.length, "asset")}
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Assets" }]}
          actions={
            <>
              <HrmRefRefreshButton onClick={() => refetch()} loading={isFetching} />
              {canCreate ? (
                <Button className={portalActionButtonClass()} onClick={openCreate}>
                  <Plus className="size-4" />
                  Add asset
                </Button>
              ) : null}
            </>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={assets}
            columns={columns}
            searchKey="brand"
            searchPlaceholder="Search tag, brand, serial…"
            onRowClick={openDetail}
            viewStorageKey="hrm-assets-view"
            defaultViewMode="table"
            filename="HrmAssetsExport"
            renderGridCard={(a) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{a.tag}</span>
                  <HrmRefStatusPill tone={assetStatusTone(a.status)}>
                    {ASSET_STATUS_LABELS[a.status] ?? a.status}
                  </HrmRefStatusPill>
                </div>
                <div className="text-sm font-semibold">{a.brand}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.category} · {ASSET_CONDITION_LABELS[a.condition] ?? a.condition}
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Assigned:</span>
                  {a.assignedToName ? (
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <HrmEmployeeAvatar name={a.assignedToName} avatarUrl={a.assignedAvatarUrl} className="h-5 w-5" />
                      {a.assignedToName}
                    </span>
                  ) : (
                    <span className="font-medium text-foreground">—</span>
                  )}
                </div>
              </div>
            )}
          />
        </PortalTablePanel>

        <Dialog open={detailAsset != null} onOpenChange={(open) => !open && setDetailAsset(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {detailAsset ? (
              <>
                <DialogHeader>
                  <DialogTitle>{detailAsset.brand}</DialogTitle>
                  <p className="text-sm text-muted-foreground font-mono">{detailAsset.tag}</p>
                </DialogHeader>
                <HrmRefDetailSection title="Asset">
                  <HrmRefDetailRow label="Tag" value={<span className="font-mono">{detailAsset.tag}</span>} />
                  <HrmRefDetailRow label="Category" value={detailAsset.category} />
                  <HrmRefDetailRow label="Brand" value={detailAsset.brand} />
                  <HrmRefDetailRow label="Serial" value={<span className="font-mono">{detailAsset.serial || "—"}</span>} />
                  <HrmRefDetailRow label="Cost" value={inrMoney(detailAsset.cost ?? 0)} />
                  <HrmRefDetailRow
                    label="Condition"
                    value={ASSET_CONDITION_LABELS[detailAsset.condition] ?? detailAsset.condition}
                  />
                </HrmRefDetailSection>
                <HrmRefDetailSection title="Assignment">
                  <HrmRefDetailRow
                    label="Status"
                    value={
                      <HrmRefStatusPill tone={assetStatusTone(detailAsset.status)}>
                        {ASSET_STATUS_LABELS[detailAsset.status] ?? detailAsset.status}
                      </HrmRefStatusPill>
                    }
                  />
                  <HrmRefDetailRow
                    label="Assigned to"
                    value={
                      detailAsset.assignedToName ? (
                        <div className="flex items-center gap-2">
                          <HrmEmployeeAvatar
                            name={detailAsset.assignedToName}
                            avatarUrl={detailAsset.assignedAvatarUrl}
                            className="h-6 w-6"
                          />
                          {detailAsset.assignedToName}
                        </div>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <HrmRefDetailRow
                    label="Assigned on"
                    value={
                      detailAsset.assignedOn
                        ? format(new Date(detailAsset.assignedOn), "MMM d, yyyy")
                        : "—"
                    }
                  />
                </HrmRefDetailSection>
                {detailAsset.notes ? (
                  <HrmRefDetailSection title="Notes">
                    <p className="text-sm text-muted-foreground">{detailAsset.notes}</p>
                  </HrmRefDetailSection>
                ) : null}
                <DialogFooter className="gap-2 sm:gap-0">
                  {canDelete ? (
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTarget(detailAsset);
                        setDetailAsset(null);
                      }}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Delete
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button
                      className={portalActionButtonClass()}
                      onClick={() => {
                        openEdit(detailAsset);
                        setDetailAsset(null);
                      }}
                    >
                      Edit asset
                    </Button>
                  ) : null}
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit asset" : "Add asset"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <HrmField label="Tag (optional)">
                <Input
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </HrmField>
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label="Category">
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
                <HrmField label="Condition">
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{ASSET_CONDITION_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
              </div>
              <HrmField label="Brand / model">
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
              </HrmField>
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label="Serial number">
                  <Input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} />
                </HrmField>
                <HrmField label="Cost (INR)">
                  <Input
                    type="number"
                    min={0}
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  />
                </HrmField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{ASSET_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
                <HrmField label="Assign to">
                  <Select
                    value={form.assignedUserId}
                    onValueChange={(v) => setForm({ ...form, assignedUserId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name} {e.employeeId ? `(${e.employeeId})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
              </div>
              <HrmField label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button
                className={portalActionButtonClass()}
                onClick={submitForm}
                disabled={createAsset.isPending || updateAsset.isPending}
              >
                {editing ? "Save changes" : "Add asset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete asset?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove {deleteTarget?.tag} from inventory. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HrmPageShell>
    </HrmGate>
  );
}
