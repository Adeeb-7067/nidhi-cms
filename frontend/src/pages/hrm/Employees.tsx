import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { ExternalLink, Users, UserCheck, UserX, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { useClientPagination } from "@/lib/table-pagination";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmFilterRow,
  HrmQueryErrorPanel,
  portalActionButtonClass,
} from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useHrmDepartments, useHrmEmployees } from "@/api/hrm";
import { getHrmEmployeeDetailHref } from "@/lib/employee-routes";
import type { HrmEmployee } from "@/modules/hrm/types";

export default function HrmEmployeesPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: deptData } = useHrmDepartments();
  const { data, isLoading, isError, error, refetch } = useHrmEmployees({
    search: search.trim() || undefined,
    departmentId: departmentId !== "all" ? Number(departmentId) : undefined,
    status: status !== "all" ? status : undefined,
    limit: 200,
  });

  const employees = data?.employees ?? [];
  const departments = deptData?.departments ?? [];

  const { pagination, setPage } = useClientPagination(employees);

  const deptOptions = useMemo(
    () => departments.map((d) => ({ id: d.id, name: d.name })),
    [departments],
  );

  const kpiItems = useMemo(() => {
    const active = employees.filter((e) => e.status === "active").length;
    const inactive = employees.filter((e) => e.status === "inactive").length;
    const deptCount = new Set(employees.map((e) => e.departmentId).filter(Boolean)).size;
    return [
      { label: "Employees", value: data?.total ?? employees.length, hint: "Staff directory", icon: Users, accent: "violet" as const },
      { label: "Active", value: active, hint: "Currently employed", icon: UserCheck, accent: "green" as const },
      { label: "Departments", value: deptCount, hint: "With assigned staff", icon: Building2, accent: "blue" as const },
      { label: "Inactive", value: inactive, hint: "Offboarded or paused", icon: UserX, accent: "amber" as const, alert: inactive > 0 },
    ];
  }, [employees, data?.total]);

  const columns = useMemo((): Column<HrmEmployee>[] => [
    {
      id: "name",
      header: "Employee",
      accessorKey: "name",
      cell: (e) => (
        <>
          <span className="font-medium">{e.name}</span>
          <div className="text-xs text-muted-foreground">{e.email}</div>
        </>
      ),
      exportValue: (e) => `${e.name} (${e.email})`,
    },
    {
      id: "employeeId",
      header: "ID",
      accessorKey: "employeeId",
      cell: (e) => <span className="text-muted-foreground">{e.employeeId ?? "—"}</span>,
      exportValue: (e) => e.employeeId ?? "",
    },
    {
      id: "department",
      header: "Department",
      cell: (e) => e.departmentName ?? e.department ?? "—",
      exportValue: (e) => e.departmentName ?? e.department ?? "",
    },
    {
      id: "manager",
      header: "Manager",
      cell: (e) => <span className="text-muted-foreground">{e.reportingManagerName ?? "—"}</span>,
      exportValue: (e) => e.reportingManagerName ?? "",
    },
    {
      id: "status",
      header: "Status",
      cell: (e) => (
        <Badge variant={e.status === "active" ? "outline" : "secondary"} className="text-[10px] capitalize">
          {e.status}
        </Badge>
      ),
      exportValue: (e) => e.status,
    },
    {
      id: "joined",
      header: "Joined",
      cell: (e) => (
        <span className="text-muted-foreground text-sm">
          {e.joiningDate ? format(new Date(e.joiningDate), "MMM d, yyyy") : "—"}
        </span>
      ),
      exportValue: (e) => (e.joiningDate ? format(new Date(e.joiningDate), "MMM d, yyyy") : ""),
    },
  ], []);

  return (
    <HrmGate module="employees">
      <HrmPageShell>
        <HrmPageHero
          title="Employees"
          description="Search the staff directory, open profiles, and manage org assignments"
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Employees" }]}
          actions={
            <Button size="sm" className={portalActionButtonClass("bg-primary text-primary-foreground")} asChild>
              <Link href="/admin/employees">
                <ExternalLink className="mr-2 h-4 w-4" /> Create / manage
              </Link>
            </Button>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        {isError ? (
          <HrmQueryErrorPanel
            error={error}
            onRetry={refetch}
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
              <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {deptOptions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-full sm:w-[140px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </HrmFilterRow>
            <PortalTablePanel isLoading={isLoading}>
              <AdvancedTable
                data={employees}
                columns={columns}
                filename="HrmEmployeesExport"
                viewStorageKey="hrm-employees"
                onRowClick={(e) => setLocation(getHrmEmployeeDetailHref(e.id))}
                clientPagination={pagination}
              />
            </PortalTablePanel>
          </>
        )}
      </HrmPageShell>
    </HrmGate>
  );
}
