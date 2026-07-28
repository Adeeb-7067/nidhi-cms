import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsConfirmDialog, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useCaNotices, useDeleteCaNotice, type CaNoticeDto } from "@/api/ca";
import { NOTICE_DEPARTMENT_LABELS, NOTICE_WORKFLOW_LABELS } from "@/modules/ca/constants";
import type { NoticeWorkflowStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CaRowActions, CaNoticeFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const workflowOrder: NoticeWorkflowStatus[] = ["received", "assigned", "replied", "closed"];
const departmentOptions = Object.keys(NOTICE_DEPARTMENT_LABELS);

const workflowTone: Record<NoticeWorkflowStatus, "info" | "warning" | "accent" | "success"> = {
  received: "info",
  assigned: "warning",
  replied: "accent",
  closed: "success",
};

export default function Notices() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") ?? "";
  });
  const [department, setDepartment] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("department") ?? "all";
  });
  const [tab, setTab] = useState("all");
  const { data, isLoading, isError, refetch } = useCaNotices({
    limit: 200,
    department: department !== "all" ? department : undefined,
  });
  const deleteNotice = useDeleteCaNotice();
  const crud = useCaListCrud<CaNoticeDto>();
  const notices = data?.notices ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notices.filter((n) => {
      const matchesSearch =
        !q || n.reference.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q);
      const matchesTab = tab === "all" || n.workflowStatus === tab;
      const matchesDept = department === "all" || n.department === department;
      return matchesSearch && matchesTab && matchesDept;
    });
  }, [search, tab, department, notices]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: notices.length };
    for (const s of workflowOrder) {
      base[s] = notices.filter((n) => n.workflowStatus === s).length;
    }
    return base;
  }, [notices]);

  const columns = useMemo<CmsColumn<CaNoticeDto>[]>(
    () => [
      {
        id: "department",
        header: "Department",
        cell: (n) => (
          <span className="font-medium">{NOTICE_DEPARTMENT_LABELS[n.department] ?? n.department}</span>
        ),
      },
      {
        id: "reference",
        header: "Reference",
        cell: (n) => <span className="font-mono">{n.reference}</span>,
      },
      {
        id: "subject",
        header: "Subject",
        cell: (n) => <span className="max-w-[200px] block truncate">{n.subject}</span>,
      },
      {
        id: "received",
        header: "Received",
        cell: (n) => (
          <span className="text-muted-foreground">
            {n.receivedAt ? format(new Date(n.receivedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "due",
        header: "Due",
        cell: (n) => (n.dueDate ? format(new Date(n.dueDate), "MMM d, yyyy") : "—"),
      },
      {
        id: "workflow",
        header: "Workflow",
        chip: true,
        cell: (n) => (
          <CmsStatusChip
            label={NOTICE_WORKFLOW_LABELS[n.workflowStatus]}
            tone={workflowTone[n.workflowStatus]}
          />
        ),
      },
      { id: "assignee", header: "Assigned to", cell: (n) => n.assignedTo },
      {
        id: "actions",
        header: "",
        cell: (n) => (
          <CaRowActions
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(n)}
            onEdit={() => crud.openEdit(n)}
            onDelete={() => crud.setDeleteTarget(n)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Notices & correspondence"
        description="GST, Income Tax, MCA, PF, and ESIC notices"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Notices" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add notice
            </Button>
          ) : null
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search notices…">
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departmentOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {NOTICE_DEPARTMENT_LABELS[d as keyof typeof NOTICE_DEPARTMENT_LABELS]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CAFilterBar>
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: counts.all },
          ...workflowOrder.map((s) => ({
            value: s,
            label: NOTICE_WORKFLOW_LABELS[s],
            count: counts[s] ?? 0,
          })),
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(n) => n.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Mail,
          title: "No notices found",
          description: "Add a notice to track correspondence.",
          actionLabel: canCreate ? "Add notice" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaNoticeFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete notice?"
        description="This soft-deletes the notice record."
        loading={deleteNotice.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteNotice.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Notice deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete notice"),
          });
        }}
      />
    </PortalPageShell>
  );
}
