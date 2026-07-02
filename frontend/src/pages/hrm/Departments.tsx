import { useMemo, useState } from "react";
import { Plus, Building2, Pencil, Trash2, Users, CheckCircle, Hash, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListUsers, getListUsersQueryKey } from "@/api/generated/api";
import type { User } from "@/api/generated/api.schemas";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmField,
  HrmConfirmDialog,
  portalActionButtonClass,
  HrmDetailDrawer,
  HrmDetailSection,
  HrmDetailRow,
  HrmPersonChip,
} from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useCreateDepartment, useDeleteDepartment, useHrmDepartments, useUpdateDepartment } from "@/api/hrm";
import type { HrmDepartment } from "@/modules/hrm/types";

export default function HrmDepartmentsPage() {
  const { data, isLoading } = useHrmDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const staffParams = { staff: "true" as const, limit: 300 };
  const { data: staffData } = useListUsers(staffParams, {
    query: { queryKey: getListUsersQueryKey(staffParams) },
  });
  const staffOptions = useMemo(
    () =>
      (staffData?.users ?? [])
        .filter((u) => u.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staffData?.users],
  );

  const [open, setOpen] = useState(false);
  const [detailDept, setDetailDept] = useState<HrmDepartment | null>(null);
  const [editing, setEditing] = useState<HrmDepartment | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [managerId, setManagerId] = useState<string>("none");

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

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setManagerId("none");
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (d: HrmDepartment) => {
    setEditing(d);
    setName(d.name);
    setCode(d.code ?? "");
    setDescription(d.description ?? "");
    setManagerId(d.managerId != null ? String(d.managerId) : "none");
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
      id: "manager",
      header: "Manager",
      cell: (d) =>
        d.managerName ? (
          <span className="text-sm">{d.managerName}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      exportValue: (d) => d.managerName ?? "",
    },
    {
      id: "description",
      header: "Description",
      cell: (d) => (
        <span className="block max-w-[200px] truncate text-muted-foreground" title={d.description ?? undefined}>
          {d.description ?? "—"}
        </span>
      ),
      detailCell: (d) => (
        <span className="whitespace-pre-wrap break-words text-muted-foreground">{d.description ?? "—"}</span>
      ),
      exportValue: (d) => d.description ?? "",
    },
    {
      id: "headcount",
      header: "Headcount",
      accessorKey: "headcount",
      cell: (d) => d.headcount ?? 0,
    },
    {
      id: "roles",
      header: "Designations",
      cell: (d) => (
        <span className="text-xs text-muted-foreground">
          {(d.designations ?? []).slice(0, 2).join(", ") || "—"}
          {(d.designations?.length ?? 0) > 2 ? ` +${(d.designations?.length ?? 0) - 2}` : ""}
        </span>
      ),
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
      className: "text-right w-[140px]",
      cell: (d) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetailDept(d)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
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
    const headUserId = managerId !== "none" ? Number(managerId) : null;
    try {
      if (editing) {
        await updateDept.mutateAsync({
          id: editing.id,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          headUserId,
        });
        toast.success("Department updated");
      } else {
        await createDept.mutateAsync({
          name: name.trim(),
          code: code.trim() || undefined,
          headUserId: headUserId ?? undefined,
          description: description.trim() || undefined,
        });
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
            onRowClick={(d) => setDetailDept(d)}
          />
        </PortalTablePanel>

        <HrmDetailDrawer
          open={detailDept != null}
          onOpenChange={(v) => !v && setDetailDept(null)}
          title={detailDept?.name ?? "Department"}
          subtitle={detailDept?.code ? `Code ${detailDept.code}` : undefined}
          actions={
            detailDept ? (
              <Button size="sm" variant="outline" onClick={() => openEdit(detailDept)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
            ) : null
          }
        >
          {detailDept && (
            <>
              <HrmDetailSection title="Overview">
                <div className="space-y-3">
                  <HrmDetailRow label="Manager" value={detailDept.managerName ?? "Not assigned"} />
                  <HrmDetailRow label="Headcount" value={detailDept.headcount ?? 0} />
                  <HrmDetailRow label="Description" value={detailDept.description?.trim() || "—"} />
                  <HrmDetailRow
                    label="Common designations"
                    value={(detailDept.designations ?? []).join(", ") || "—"}
                  />
                </div>
              </HrmDetailSection>
              <HrmDetailSection title="Team">
                {(detailDept.members ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active members in this department.</p>
                ) : (
                  <div className="grid gap-2">
                    {(detailDept.members ?? []).map((m) => (
                      <HrmPersonChip
                        key={m.userId}
                        name={m.userName}
                        subtitle={m.designation ?? m.employeeId ?? undefined}
                        avatarUrl={m.avatarUrl}
                        href={`/hrm/employees/${m.userId}`}
                      />
                    ))}
                  </div>
                )}
              </HrmDetailSection>
            </>
          )}
        </HrmDetailDrawer>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit department" : "New department"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update department details and manager." : "Add a department for employee assignments and reporting."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
              </HrmField>
              <HrmField label="Code" hint="Required for new departments">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ENG" />
              </HrmField>
              <HrmField label="Manager">
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {staffOptions.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              <HrmField label="Description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
