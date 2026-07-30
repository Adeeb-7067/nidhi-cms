import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsConfirmDialog, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import {
  useLegalCases,
  useDeleteLegalCase,
} from "@/api/legal";
import type { EmployeeLegalCase } from "@/modules/legal/types";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER, CASE_TYPE_LABELS } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
  LegalCaseFormModal,
} from "@/modules/legal/components";
import { useLegalListCrud } from "@/modules/legal/hooks/use-legal-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function LegalCases() {
  const { can } = usePermissions();
  const canCreate = can("legal", "create");
  const canEdit = can("legal", "edit");
  const canDelete = can("legal", "delete");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const { data, isLoading, isError, refetch } = useLegalCases({
    q: search || undefined,
    limit: 500,
  });
  const deleteCase = useDeleteLegalCase();
  const crud = useLegalListCrud<EmployeeLegalCase>();
  const rows = data?.cases ?? [];

  const filtered = useMemo(
    () => (statusTab === "all" ? rows : rows.filter((c) => c.status === statusTab)),
    [rows, statusTab],
  );

  const chipItems = useMemo(
    () => [
      { value: "all", label: "All", count: rows.length },
      ...CASE_STATUS_ORDER.map((s) => ({
        value: s,
        label: CASE_STATUS_LABELS[s],
        count: rows.filter((c) => c.status === s).length,
      })),
    ],
    [rows],
  );

  const columns = useMemo<CmsColumn<EmployeeLegalCase>[]>(
    () => [
      {
        id: "caseNumber",
        header: "Case #",
        cell: (c) => (
          <Link href={`/legal/cases/${c.id}`} className="font-mono text-primary hover:underline">
            {c.caseNumber}
          </Link>
        ),
      },
      {
        id: "employee",
        header: "Employee",
        cell: (c) => <span className="font-medium">{c.employeeName}</span>,
      },
      { id: "department", header: "Department", cell: (c) => c.department },
      { id: "type", header: "Type", cell: (c) => CASE_TYPE_LABELS[c.type] },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (c) => <LegalStatusBadge variant="case" value={c.status} />,
      },
      {
        id: "risk",
        header: "Risk",
        chip: true,
        cell: (c) => <LegalRiskBadge level={c.risk} />,
      },
      {
        id: "counsel",
        header: "Counsel",
        cell: (c) => <CounselAvatar name={c.assignedTo?.name ?? "—"} />,
      },
      {
        id: "opened",
        header: "Opened",
        cell: (c) => (
          <span className="text-muted-foreground">{format(new Date(c.openedAt), "MMM d, yyyy")}</span>
        ),
      },
      {
        id: "hearing",
        header: "Next hearing",
        cell: (c) => (
          <span className="text-muted-foreground">
            {c.nextHearing ? format(new Date(c.nextHearing), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (c) => (
          <CmsRowActions
            label="Case actions"
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(c)}
            onEdit={() => crud.openEdit(c)}
            onDelete={() => crud.setDeleteTarget(c)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Employee legal cases"
        description="Internal matters — harassment, policy violations, termination, and IP disputes."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Employee cases" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Open case
            </Button>
          ) : null
        }
      />

      <LegalFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search cases, employees, departments…"
      />

      <CmsChipTabs value={statusTab} onValueChange={setStatusTab} items={chipItems} />

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Briefcase,
          title: "No cases found",
          description: "Adjust filters or open a new case.",
        }}
      />

      <LegalCaseFormModal
        open={crud.dialogOpen}
        onOpenChange={crud.closeDialog}
        editing={crud.editing}
        readOnly={crud.readOnly}
      />

      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete case?"
        description={
          crud.deleteTarget
            ? `Soft-delete ${crud.deleteTarget.caseNumber}. This can be restored from the database if needed.`
            : undefined
        }
        confirmLabel="Delete"
        loading={deleteCase.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteCase.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Case deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete case"),
          });
        }}
      />
    </PortalPageShell>
  );
}
