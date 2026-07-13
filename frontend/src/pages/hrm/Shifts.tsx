import { useCallback, useMemo, useState } from "react";
import { Clock, Pencil, Plus, Users, Timer, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { useClientPagination } from "@/lib/table-pagination";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmField,
  HrmFilterRow,
  HrmQueryErrorPanel,
  HrmTabsList,
  HrmTabsTrigger,
  portalActionButtonClass,
} from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { LEGACY_EMPLOYEE_LABELS } from "@/modules/hrm/hrm-legacy-labels";
import {
  useAssignShift,
  useCreateShiftTemplate,
  useHrmDepartments,
  useHrmEmployees,
  useHrmShiftAssignments,
  useHrmShiftTemplates,
  usePatchUserHrmProfile,
  useUpdateShiftTemplate,
} from "@/api/hrm";
import type { HrmEmployee, HrmShiftTemplate } from "@/modules/hrm/types";

function formatShiftWindow(t: HrmShiftTemplate | undefined) {
  if (!t?.startTime || !t?.endTime) return "—";
  const startMins =
    parseInt(t.startTime.slice(0, 2), 10) * 60 + parseInt(t.startTime.slice(3, 5) || "0", 10);
  let endMins =
    parseInt(t.endTime.slice(0, 2), 10) * 60 + parseInt(t.endTime.slice(3, 5) || "0", 10);
  if (endMins <= startMins) endMins += 24 * 60;
  const expected = Math.max(0, endMins - startMins - (t.breakMinutes ?? 0));
  const expectedH = Math.round((expected / 60) * 10) / 10;
  return `${t.startTime} – ${t.endTime} · ${expectedH}h expected`;
}

function assignmentDateKey(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function assignmentCoversToday(
  effectiveFrom: string | Date,
  effectiveTo?: string | null,
  today = new Date().toISOString().slice(0, 10),
) {
  const from = assignmentDateKey(effectiveFrom);
  const to = effectiveTo ? assignmentDateKey(effectiveTo) : null;
  return from <= today && (!to || to >= today);
}

export default function HrmShiftsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [assigningUserId, setAssigningUserId] = useState<number | null>(null);

  const { data: tplData, isLoading: tplLoading } = useHrmShiftTemplates();
  const { data: assignData, isLoading: assignLoading } = useHrmShiftAssignments();
  const { data: deptData } = useHrmDepartments();
  const {
    data: staffData,
    isLoading: staffLoading,
    isError: staffError,
    error: staffLoadError,
    refetch: refetchStaff,
  } = useHrmEmployees({
    search: search.trim() || undefined,
    departmentId: departmentId !== "all" ? Number(departmentId) : undefined,
    status: "active",
    limit: 500,
  });

  const createTemplate = useCreateShiftTemplate();
  const updateTemplate = useUpdateShiftTemplate();
  const assignShift = useAssignShift();
  const patchProfile = usePatchUserHrmProfile();

  const templates = tplData?.templates ?? [];
  const employees = staffData?.employees ?? [];
  const departments = deptData?.departments ?? [];
  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  const currentShiftByUserId = useMemo(() => {
    const map = new Map<number, number>();
    const sorted = [...(assignData?.assignments ?? [])].sort((a, b) =>
      assignmentDateKey(b.effectiveFrom).localeCompare(assignmentDateKey(a.effectiveFrom)),
    );
    for (const row of sorted) {
      if (map.has(row.userId)) continue;
      if (assignmentCoversToday(row.effectiveFrom, row.effectiveTo, today)) {
        map.set(row.userId, row.shiftTemplateId);
      }
    }
    return map;
  }, [assignData?.assignments, today]);

  const resolveEmployeeShiftId = useCallback(
    (employee: HrmEmployee) =>
      currentShiftByUserId.get(employee.id) ?? employee.shiftId ?? null,
    [currentShiftByUserId],
  );

  const assignedCount = useMemo(
    () => employees.filter((e) => resolveEmployeeShiftId(e) != null).length,
    [employees, resolveEmployeeShiftId],
  );

  const kpiItems = useMemo(() => {
    const nightShifts = templates.filter((t) => {
      const start = parseInt(t.startTime?.slice(0, 2) ?? "0", 10);
      return start >= 18 || start < 6;
    }).length;
    return [
      { label: "Active staff", value: employees.length, icon: Users, accent: "green" as const },
      { label: "Shift assigned", value: assignedCount, icon: Building2, accent: "blue" as const },
      { label: "Shift templates", value: templates.length, icon: Clock, accent: "violet" as const },
      { label: "Night / late shifts", value: nightShifts, icon: Timer, accent: "amber" as const },
    ];
  }, [templates, employees.length, assignedCount]);

  const { pagination, setPage } = useClientPagination(employees);

  const [tplOpen, setTplOpen] = useState(false);
  const [editing, setEditing] = useState<HrmShiftTemplate | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("18:00");
  const [graceMinutesIn, setGraceMinutesIn] = useState("15");
  const [breakMinutes, setBreakMinutes] = useState("30");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setStartTime("09:30");
    setEndTime("18:00");
    setGraceMinutesIn("15");
    setBreakMinutes("30");
    setTplOpen(true);
  };

  const openEdit = (t: HrmShiftTemplate) => {
    setEditing(t);
    setName(t.name);
    setStartTime(t.startTime);
    setEndTime(t.endTime);
    setGraceMinutesIn(String(t.graceMinutesIn ?? 15));
    setBreakMinutes(String(t.breakMinutes ?? 30));
    setTplOpen(true);
  };

  const saveTemplate = async () => {
    if (!name.trim()) return;
    const body = {
      name: name.trim(),
      startTime,
      endTime,
      graceMinutesIn: Number(graceMinutesIn) || 0,
      breakMinutes: Number(breakMinutes) || 0,
    };
    try {
      if (editing) {
        await updateTemplate.mutateAsync({ id: editing.id, ...body });
        toast.success("Shift updated");
      } else {
        await createTemplate.mutateAsync(body);
        toast.success("Shift created");
      }
      setTplOpen(false);
    } catch {
      // Error toast handled by useHrmMutation
    }
  };

  const handleShiftAssign = useCallback(
    async (employee: HrmEmployee, value: string) => {
      setAssigningUserId(employee.id);
      try {
        if (value === "default") {
          await patchProfile.mutateAsync({ userId: employee.id, shiftId: null });
          toast.success(`${employee.name} will use the company default shift`);
          return;
        }
        const shiftTemplateId = Number(value);
        await assignShift.mutateAsync({
          userId: employee.id,
          shiftTemplateId,
          effectiveFrom: today,
        });
        toast.success(`Shift assigned to ${employee.name}`);
      } catch {
        // Error toast handled by mutation hooks
      } finally {
        setAssigningUserId(null);
      }
    },
    [assignShift, patchProfile, today],
  );

  const employeeColumns = useMemo((): Column<HrmEmployee>[] => {
    return [
      {
        id: "name",
        header: "Employee",
        accessorKey: "name",
        cell: (e) => (
          <div className="flex items-center gap-2.5">
            <HrmEmployeeAvatar name={e.name} avatarUrl={e.avatarUrl} className="h-8 w-8" />
            <div>
              <span className="font-medium">{e.name}</span>
              <div className="text-xs text-muted-foreground">{e.email}</div>
            </div>
          </div>
        ),
        exportValue: (e) => `${e.name} (${e.email})`,
      },
      {
        id: "employeeId",
        header: LEGACY_EMPLOYEE_LABELS.employeeId,
        accessorKey: "employeeId",
        cell: (e) => <span className="text-muted-foreground">{e.employeeId ?? "—"}</span>,
        exportValue: (e) => e.employeeId ?? "",
      },
      {
        id: "department",
        header: LEGACY_EMPLOYEE_LABELS.department,
        cell: (e) => e.departmentName ?? e.department ?? "—",
        exportValue: (e) => e.departmentName ?? e.department ?? "",
      },
      {
        id: "currentShift",
        header: "Current shift",
        cell: (e) => {
          const shiftId = resolveEmployeeShiftId(e);
          const tpl = shiftId ? templateById.get(shiftId) : undefined;
          if (!tpl) {
            return (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Company default
              </Badge>
            );
          }
          return (
            <div>
              <span className="text-sm">{tpl.name}</span>
              <div className="text-xs text-muted-foreground">{formatShiftWindow(tpl)}</div>
            </div>
          );
        },
        exportValue: (e) => {
          const shiftId = resolveEmployeeShiftId(e);
          const tpl = shiftId ? templateById.get(shiftId) : undefined;
          return tpl ? `${tpl.name} (${formatShiftWindow(tpl)})` : "Company default";
        },
      },
      {
        id: "assign",
        header: LEGACY_EMPLOYEE_LABELS.shiftTemplate,
        className: "min-w-[200px]",
        cell: (e) => {
          const shiftId = resolveEmployeeShiftId(e);
          const hasTemplate = shiftId != null && templateById.has(shiftId);
          const selectValue = hasTemplate ? String(shiftId) : "default";
          const busy = assigningUserId === e.id;
          const selectDisabled =
            busy || assignShift.isPending || patchProfile.isPending || tplLoading || assignLoading;
          return (
            <div onClick={(ev) => ev.stopPropagation()}>
              <Select
                value={selectValue}
                onValueChange={(v) => void handleShiftAssign(e, v)}
                disabled={selectDisabled}
              >
                <SelectTrigger className="h-9 w-full min-w-[180px] bg-background">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Company default</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({formatShiftWindow(t)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        },
        exportValue: (e) => {
          const shiftId = resolveEmployeeShiftId(e);
          return shiftId != null ? templateById.get(shiftId)?.name ?? String(shiftId) : "Company default";
        },
      },
    ];
  }, [
    assignShift.isPending,
    assigningUserId,
    assignLoading,
    handleShiftAssign,
    patchProfile.isPending,
    resolveEmployeeShiftId,
    templateById,
    templates,
    tplLoading,
  ]);

  const templateColumns = useMemo((): Column<HrmShiftTemplate>[] => [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      cell: (t) => <span className="font-medium">{t.name}</span>,
    },
    {
      id: "hours",
      header: "Work window",
      cell: (t) => <span className="text-muted-foreground">{formatShiftWindow(t)}</span>,
      exportValue: (t) => formatShiftWindow(t),
    },
    {
      id: "grace",
      header: "Grace in",
      cell: (t) => `${t.graceMinutesIn} min`,
      exportValue: (t) => String(t.graceMinutesIn),
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right w-[80px]",
      cell: (t) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const employeesLoading = staffLoading || assignLoading;
  const pageLoading = employeesLoading || tplLoading;

  return (
    <HrmGate module="shifts">
      <HrmPageShell>
        <HrmPageHero
          title="Shifts"
          description="Assign work schedules to employees and manage shift templates"
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Shifts" }]}
          actions={
            <Button
              size="sm"
              className={portalActionButtonClass("bg-primary text-primary-foreground hover:bg-primary/90")}
              onClick={openCreate}
            >
              <Plus className="h-4 w-4 mr-1" /> Add template
            </Button>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={pageLoading} />

        <Tabs defaultValue="employees" className="space-y-4">
          <HrmTabsList>
            <HrmTabsTrigger value="employees">Employee assignments</HrmTabsTrigger>
            <HrmTabsTrigger value="templates">Shift templates</HrmTabsTrigger>
          </HrmTabsList>

          <TabsContent value="employees" className="space-y-4">
            {staffError ? (
              <HrmQueryErrorPanel
                error={staffLoadError}
                onRetry={refetchStaff}
                title="Could not load employees"
              />
            ) : (
              <>
                <HrmFilterRow
                  search={search}
                  onSearchChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  searchPlaceholder="Filter employees…"
                >
                  <Select
                    value={departmentId}
                    onValueChange={(v) => {
                      setDepartmentId(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[180px] bg-background">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmFilterRow>

                <PortalTablePanel isLoading={employeesLoading}>
                  <AdvancedTable
                    data={employees}
                    columns={employeeColumns}
                    clientPagination={pagination}
                    filename="HrmShiftAssignmentsExport"
                    viewStorageKey="hrm-shift-assignments"
                  />
                </PortalTablePanel>
              </>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <PortalTablePanel isLoading={tplLoading}>
              <AdvancedTable
                data={templates}
                columns={templateColumns}
                searchKey="name"
                searchPlaceholder="Filter templates…"
                filename="HrmShiftTemplatesExport"
                viewStorageKey="hrm-shift-templates"
              />
            </PortalTablePanel>
          </TabsContent>
        </Tabs>

        <Dialog open={tplOpen} onOpenChange={setTplOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit shift template" : "New shift template"}</DialogTitle>
              <DialogDescription>Define work hours and grace period used by the attendance engine.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Default Office" />
              </HrmField>
              <div className="grid grid-cols-2 gap-4">
                <HrmField label="Start time">
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </HrmField>
                <HrmField label="End time">
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </HrmField>
              </div>
              <HrmField label="Grace minutes (late threshold)">
                <Input type="number" min={0} value={graceMinutesIn} onChange={(e) => setGraceMinutesIn(e.target.value)} />
              </HrmField>
              <HrmField label="Break minutes (deducted from expected hours)">
                <Input type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
              </HrmField>
            </div>
            <DialogFooter>
              <Button className={portalActionButtonClass()} onClick={saveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending}>
                {editing ? "Save changes" : "Create template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
