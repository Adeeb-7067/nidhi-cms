import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsConfirmDialog, CmsDataTable, type CmsColumn } from "@/components/cms";
import { useCaCalendarEvents, useDeleteCaCalendarEvent, type CaCalendarEventDto } from "@/api/ca";
import { CAPageHeader, CAFilterBar, ComplianceStatusBadge, CaRowActions, CaCalendarFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function ComplianceCalendar() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const { data, isLoading, isError, refetch } = useCaCalendarEvents({ limit: 200 });
  const deleteEvent = useDeleteCaCalendarEvent();
  const crud = useCaListCrud<CaCalendarEventDto>();
  const events = data?.events ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter((c) => {
      const matchesSearch =
        !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
      const matchesTab = tab === "all" || c.status === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab, events]);

  const counts = useMemo(() => {
    return {
      all: events.length,
      completed: events.filter((c) => c.status === "completed").length,
      upcoming: events.filter((c) => c.status === "upcoming").length,
      overdue: events.filter((c) => c.status === "overdue").length,
    };
  }, [events]);

  const columns = useMemo<CmsColumn<CaCalendarEventDto>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        cell: (c) => <span className="font-medium">{c.title}</span>,
      },
      { id: "category", header: "Category", cell: (c) => c.category },
      {
        id: "due",
        header: "Due date",
        cell: (c) => (c.dueDate ? format(new Date(c.dueDate), "MMM d, yyyy") : "—"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (c) => <ComplianceStatusBadge status={c.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: (c) => (
          <CaRowActions
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
      <CAPageHeader
        title="Compliance calendar"
        description="GST, TDS, ROC, ITR, and audit due dates"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Compliance calendar" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add event
            </Button>
          ) : null
        }
      />
      <CAFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search compliance items…"
      />
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: counts.all },
          { value: "completed", label: "Completed", count: counts.completed },
          { value: "upcoming", label: "Upcoming", count: counts.upcoming },
          { value: "overdue", label: "Overdue", count: counts.overdue },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: CalendarDays,
          title: "No compliance items found",
          description: "Add a calendar event to track due dates.",
          actionLabel: canCreate ? "Add event" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaCalendarFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete calendar event?"
        description="This soft-deletes the compliance calendar event."
        loading={deleteEvent.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteEvent.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Calendar event deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete calendar event"),
          });
        }}
      />
    </PortalPageShell>
  );
}
