import { useMemo, useState } from "react";
import { IdCard, Eye, Loader2, Printer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { CmsRowActions } from "@/components/cms";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSettings, getGetSettingsQueryKey } from "@/api/generated/api";
import type { CompanySettings } from "@/api/generated/api.schemas";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmRefRefreshButton,
} from "@/modules/hrm/components";
import {
  HrmRefDetailRow,
  HrmRefDetailSection,
} from "@/modules/hrm/hrm-reference-kit";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { useHrmEmployee, useHrmEmployees } from "@/api/hrm";
import {
  HrmIdCardPreview,
  HrmIdCardSheet,
  HrmIdCardViewButton,
  employeeCode,
  type HrmIdCardCompany,
} from "@/modules/hrm/HrmIdCard";
import {
  formatBloodGroup,
  formatEmail,
  formatEmergencyContactLine,
  formatPhone,
  resolveDepartmentLabel,
} from "@/modules/hrm/hrm-id-card-fields";
import type { HrmEmployee, HrmEmployeeDetailResponse } from "@/modules/hrm/types";
import { QUERY_STALE } from "@/lib/query-config";
import { SK_ID_CARD_BRAND } from "@/modules/hrm/hrm-id-card-brand";

function isActiveEmployee(employee: HrmEmployee) {
  const hrStatus = employee.hrEmploymentStatus?.toLowerCase();
  if (hrStatus === "active" || hrStatus === "probation") return true;
  return employee.status === "active";
}

function toCompanyBranding(settings?: CompanySettings | null): HrmIdCardCompany {
  return {
    brandName: settings?.companyName?.trim() || "Company",
    logoUrl: settings?.logoUrl ?? null,
    sealUrl: settings?.sealUrl ?? null,
    address: settings?.address ?? null,
  };
}

function IdCardPreviewDialog({
  employeeId,
  listEmployee,
  company,
  onClose,
}: {
  employeeId: number;
  listEmployee: HrmEmployee;
  company: HrmIdCardCompany;
  onClose: () => void;
}) {
  const { data: employeeDetail, isLoading, isFetching } = useHrmEmployee(employeeId);
  const detail = employeeDetail as HrmEmployeeDetailResponse | undefined;
  const fetchedEmployee =
    detail?.employee?.id === employeeId ? detail.employee : undefined;
  const employee = fetchedEmployee ?? listEmployee;
  const loadingDetail = isLoading && !fetchedEmployee;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto print:max-w-none print:border-0 print:shadow-none print:bg-white">
        <DialogHeader className="print:hidden">
          <DialogTitle>{employee.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Employee ID card · logo & seal from Settings → Organization
          </p>
        </DialogHeader>

        <div id="hrm-id-card-print-area" className="py-1 print:py-4">
          {loadingDetail ? (
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <Skeleton className="h-[214px] w-[338px] rounded-2xl" />
                <Skeleton className="h-[214px] w-[338px] rounded-2xl" />
              </div>
            </div>
          ) : (
            <HrmIdCardSheet employee={employee} company={company} />
          )}
        </div>

        <HrmRefDetailSection title="Employee details" className="print:hidden">
          {loadingDetail ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              <HrmRefDetailRow
                label="Employee ID"
                value={<span className="font-mono font-semibold">{employeeCode(employee)}</span>}
              />
              <HrmRefDetailRow label="Designation" value={employee.designation?.trim() || "Not on file"} />
              <HrmRefDetailRow label="Department" value={resolveDepartmentLabel(employee)} />
              <HrmRefDetailRow label="Phone" value={formatPhone(employee)} />
              <HrmRefDetailRow label="Email" value={formatEmail(employee)} />
              <HrmRefDetailRow label="Blood group" value={formatBloodGroup(employee)} />
              <HrmRefDetailRow label="Emergency" value={formatEmergencyContactLine(employee)} />
            </>
          )}
        </HrmRefDetailSection>

        <DialogFooter className="print:hidden">
          <Button
            className="text-white hover:opacity-90"
            style={{ backgroundColor: SK_ID_CARD_BRAND.blue }}
            disabled={loadingDetail || isFetching}
            onClick={() => window.print()}
          >
            {isFetching ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Printer className="size-3.5 mr-1.5" />
            )}
            Print ID card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HrmIdCardsPage() {
  const {
    data: orgSettings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
    isFetching: settingsFetching,
  } = useGetSettings({
    query: {
      queryKey: getGetSettingsQueryKey(),
      staleTime: QUERY_STALE.reference,
    },
  });

  const company = useMemo(() => toCompanyBranding(orgSettings), [orgSettings]);

  const { data, isLoading, refetch, isFetching } = useHrmEmployees({
    status: "active",
    limit: 500,
  });

  const employees = useMemo(
    () => (data?.employees ?? []).filter(isActiveEmployee),
    [data?.employees],
  );

  const [preview, setPreview] = useState<{ id: number; employee: HrmEmployee } | null>(null);

  const kpiItems = useMemo(() => {
    const departments = new Set(
      employees.map((e) => resolveDepartmentLabel(e)).filter((d) => d !== "—"),
    );
    return [
      {
        label: "Active employees",
        value: employees.length,
        hint: "Eligible for ID cards",
        icon: Users,
        accent: "violet" as const,
      },
      {
        label: "Departments",
        value: departments.size,
        hint: "Represented on cards",
        icon: IdCard,
        accent: "blue" as const,
      },
      {
        label: "Company",
        value: company.brandName,
        hint: company.logoUrl ? "Logo from organization settings" : "Set logo in Settings",
        icon: IdCard,
        accent: "green" as const,
      },
    ];
  }, [employees, company.brandName, company.logoUrl]);

  const openPreview = (employee: HrmEmployee) => setPreview({ id: employee.id, employee });

  const columns = useMemo((): Column<HrmEmployee>[] => [
    {
      id: "id",
      header: "ID",
      cell: (e) => (
        <span className="font-mono text-[11px]">{e.employeeId ?? e.id}</span>
      ),
      exportValue: (e) => e.employeeId ?? String(e.id),
    },
    {
      id: "name",
      header: "Name",
      cell: (e) => (
        <div className="flex items-center gap-2">
          <HrmEmployeeAvatar name={e.name} avatarUrl={e.avatarUrl} className="h-7 w-7" />
          <span className="text-xs font-semibold">{e.name}</span>
        </div>
      ),
      exportValue: (e) => e.name,
    },
    {
      id: "designation",
      header: "Designation",
      cell: (e) => <span className="text-xs">{e.designation ?? "—"}</span>,
      exportValue: (e) => e.designation ?? "—",
    },
    {
      id: "department",
      header: "Department",
      cell: (e) => {
        const dept = resolveDepartmentLabel(e);
        return <span className="text-xs">{dept === "—" ? "—" : dept}</span>;
      },
      exportValue: (e) => resolveDepartmentLabel(e),
    },
    {
      id: "blood",
      header: "Blood",
      cell: (e) => <span className="text-xs font-semibold">{e.bloodGroup || "—"}</span>,
      exportValue: (e) => e.bloodGroup || "—",
    },
    {
      id: "actions",
      header: "",
      hideInDetail: true,
      cell: (e) => (
        <CmsRowActions
          label="ID card actions"
          items={[
            {
              label: "View card",
              icon: Eye,
              onSelect: () => openPreview(e),
            },
          ]}
        />
      ),
    },
  ], []);

  const refreshAll = () => {
    void refetch();
    void refetchSettings();
  };

  return (
    <HrmGate module="id_cards">
      <HrmPageShell className="print:bg-white">
        <div className="print:hidden">
          <HrmPageHero
            title="ID Cards"
            description={`${employees.length} active employees · ${company.brandName}`}
            breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "ID Cards" }]}
            actions={
              <HrmRefRefreshButton
                onClick={refreshAll}
                loading={isFetching || settingsFetching}
              />
            }
          />
          <HrmPageKpiRow items={kpiItems} loading={isLoading || settingsLoading} />
        </div>

        <div className="print:hidden">
          <PortalTablePanel isLoading={isLoading}>
            <AdvancedTable
              data={employees}
              columns={columns}
              searchKey="name"
              searchPlaceholder="Search name, ID, department…"
              onRowClick={openPreview}
              viewStorageKey="hrm-id-cards-view"
              defaultViewMode="grid"
              filename="HrmIdCardsExport"
              renderGridCard={(e) => (
                <div className="space-y-2">
                  <HrmIdCardPreview employee={e} company={company} />
                  <div className="flex justify-center pt-1">
                    <HrmIdCardViewButton onClick={() => openPreview(e)} />
                  </div>
                </div>
              )}
            />
          </PortalTablePanel>
        </div>

        {preview ? (
          <IdCardPreviewDialog
            employeeId={preview.id}
            listEmployee={preview.employee}
            company={company}
            onClose={() => setPreview(null)}
          />
        ) : null}

        <style>{`
          @media print {
            @page {
              size: landscape;
              margin: 12mm;
            }
            body * {
              visibility: hidden !important;
            }
            #hrm-id-card-print-area,
            #hrm-id-card-print-area * {
              visibility: visible !important;
            }
            #hrm-id-card-print-area {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              display: flex !important;
              justify-content: center;
              align-items: flex-start;
              background: white;
            }
          }
        `}</style>
      </HrmPageShell>
    </HrmGate>
  );
}
