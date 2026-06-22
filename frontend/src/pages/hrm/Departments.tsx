import { useMemo, useState } from "react";
import { Plus, Building2, Pencil, Trash2, Users, CheckCircle, Hash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmField,
  HrmConfirmDialog,
  portalActionButtonClass,
} from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useCreateDepartment, useDeleteDepartment, useHrmDepartments, useUpdateDepartment } from "@/api/hrm";
import type { HrmDepartment } from "@/modules/hrm/types";

export default function HrmDepartmentsPage() {
  const { data, isLoading } = useHrmDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HrmDepartment | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const departments = data?.departments ?? [];
  const deleteTarget = departments.find((d) => d.id === deleteId);

  const kpiItems = useMemo(() => {
    const headcount = departments.reduce((n, d) => n + (d.headcount ?? 0), 0);
    const active = departments.filter((d) => d.status === "active").length;
    const largest = departments.reduce((max, d) => Math.max(max, d.headcount ?? 0), 0);
    return [
      { label: "Departments", value: departments.length, hint: "Organizational units", icon: Building2, accent: "violet" as const },
      { label: "Total headcount", value: headcount, hint: "Across all units", icon: Users, accent: "green" as const },
      { label: "Active units", value: active, hint: "Currently in use", icon: CheckCircle, accent: "blue" as const },
      { label: "Largest team", value: largest, hint: "Max members in one dept", icon: Hash, accent: "amber" as const },
    ];
  }, [departments]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setOpen(true);
  };

  const openEdit = (d: HrmDepartment) => {
    setEditing(d);
    setName(d.name);
    setCode(d.code ?? "");
    setOpen(true);
  };

  const columns: Column<HrmDepartment>[] = [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: (d) => <span className="font-medium">{d.name}</span>,
      },
      {
        id: "code",
        header: "Code",
        accessorKey: "code",
        cell: (d) => <span className="text-muted-foreground">{d.code ?? "—"}</span>,
        exportValue: (d) => d.code ?? "",
      },
      {
        id: "headcount",
        header: "Headcount",
        accessorKey: "headcount",
        cell: (d) => d.headcount ?? 0,
      },
      {
        id: "status",
        header: "Status",
        cell: (d) => (
          <Badge variant="outline" className="text-[10px] capitalize">
            {d.status}
          </Badge>
        ),
        exportValue: (d) => d.status ?? "",
      },
      {
        id: "actions",
        header: "Actions",
        className: "text-right w-[120px]",
        cell: (d) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(d.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
  ];

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editing) {
        await updateDept.mutateAsync({ id: editing.id, name: name.trim(), code: code.trim() || undefined });
        toast.success("Department updated");
      } else {
        await createDept.mutateAsync({ name: name.trim(), code: code.trim() || undefined });
        toast.success("Department created");
      }
      setOpen(false);
    } catch {
      // Error toast handled by useHrmMutation
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteDept.mutateAsync(deleteId);
      toast.success("Department deleted");
      setDeleteId(null);
    } catch {
      // Error toast handled by useHrmMutation
    }
  };

  return (
    <HrmGate module="departments">
      <HrmPageShell>
        <HrmPageHero
          title="Departments"
          description="Organizational units for HRM reporting, attendance filters, and assignments"
          actions={
            <Button size="sm" className={portalActionButtonClass("bg-primary text-primary-foreground")} onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add department
            </Button>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={departments}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Filter departments…"
            filename="HrmDepartmentsExport"
            viewStorageKey="hrm-departments"
          />
        </PortalTablePanel>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit department" : "New department"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update department name and code." : "Add a department for employee assignments and reporting."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
              </HrmField>
              <HrmField label="Code" hint="Optional short code for reports">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ENG" />
              </HrmField>
            </div>
            <DialogFooter>
              <Button className={portalActionButtonClass()} onClick={handleSave} disabled={createDept.isPending || updateDept.isPending}>
                {editing ? "Save changes" : "Create department"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <HrmConfirmDialog
          open={deleteId != null}
          onOpenChange={(v) => !v && setDeleteId(null)}
          title="Delete department?"
          description={deleteTarget ? `Remove "${deleteTarget.name}" from the org chart. Employees must be reassigned first.` : undefined}
          onConfirm={handleDelete}
          loading={deleteDept.isPending}
        />
      </HrmPageShell>
    </HrmGate>
  );
}
