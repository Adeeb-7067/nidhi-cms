import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Plus, Users, Upload, Pencil, Eye, Trash2, Download, Loader2, Phone, UserCheck, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-base";
import { customFetch } from "@/api/custom-fetch";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { API_PAGE_LIMIT_CAP, useTablePagination } from "@/lib/table-pagination";
import { useDeleteLead, useListLeads, useSalesDashboard, salesKeys, type Lead, type LeadStatus } from "@/api/sales";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
  formatCompactCurrency,
  formatLeadSourceLabel,
} from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  LeadFormModal,
  BulkLeadActions,
  LeadImportDialog,
} from "@/modules/sales/components";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadLeadsCsv(leads: Lead[]) {
  const header = ["ID", "Name", "Email", "Company", "Source", "Status", "Priority", "Expected Value", "Created"];
  const rows = leads.map((l) => [
    l.id,
    l.name,
    l.email ?? "",
    l.company ?? "",
    l.source ?? "",
    l.status,
    l.priority,
    l.expectedValue,
    formatSalesDateTime(l.createdAt),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function SalesLeads() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<LeadStatus | "all">("all");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const qc = useQueryClient();

  useEffect(() => { resetPage(); }, [search, statusTab, resetPage]);

  const listParams = {
    search: search || undefined,
    status: statusTab !== "all" ? statusTab : undefined,
    page,
    limit: apiLimit,
  };

  const exportLeads = async () => {
    setExporting(true);
    try {
      const exportParams = { ...listParams, page: 1, limit: API_PAGE_LIMIT_CAP };
      const qs = new URLSearchParams(
        Object.entries(exportParams).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ).toString();
      const result = await qc.fetchQuery({
        queryKey: salesKeys.leads(exportParams),
        queryFn: () => customFetch<{ leads: Lead[]; total: number }>(apiUrl(`/api/sales/leads?${qs}`)),
      });
      downloadLeadsCsv(result.leads);
      toast.success(`Exported ${result.leads.length} lead${result.leads.length === 1 ? "" : "s"}`);
    } catch (err) {
      toastApiError(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const deleteLead = useDeleteLead();

  const openCreateDrawer = () => {
    setEditingLead(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (lead: Lead) => {
    setEditingLead(lead);
    setDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) setEditingLead(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead.mutateAsync(deleteTarget.id);
      toast.success(`Lead "${deleteTarget.name}" deleted`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete lead");
    }
  };

  const { data, isLoading, isError, refetch } = useListLeads(listParams);
  const { data: dashData } = useSalesDashboard();
  const filtered = data?.leads ?? [];

  const totalCount = data?.total ?? 0;
  const leadsKpi = dashData?.leads;
  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chipItems = [
    {
      value: "all",
      label: "All",
      count: statusTab === "all" ? totalCount : undefined,
    },
    ...LEAD_STATUS_ORDER.map((s) => ({
      value: s,
      label: LEAD_STATUS_LABELS[s],
      count: statusTab === s ? totalCount : undefined,
    })),
  ];

  const columns: CmsColumn<Lead>[] = [
    {
      id: "select",
      header: <Checkbox checked={allSelected} onCheckedChange={toggleAll} />,
      headerClassName: "w-10",
      cell: (lead) => (
        <Checkbox
          checked={selected.has(lead.id)}
          onCheckedChange={() => toggleOne(lead.id)}
        />
      ),
    },
    {
      id: "id",
      header: "ID",
      cell: (lead) => <span className="font-mono text-muted-foreground">#{lead.id}</span>,
    },
    {
      id: "contact",
      header: "Contact",
      cell: (lead) => (
        <div className="min-w-0">
          <Link
            href={`/sales/leads/${lead.id}`}
            className="font-medium hover:text-primary hover:underline transition-colors"
          >
            {lead.name}
          </Link>
          <p className="text-[10px] text-muted-foreground">{lead.email ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "company",
      header: "Company",
      className: "max-w-[140px] truncate",
      cell: (lead) => lead.company ?? "—",
    },
    {
      id: "source",
      header: "Source",
      cell: (lead) => formatLeadSourceLabel(lead.source),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (lead) => <SalesStatusBadge variant="lead" value={lead.status} />,
    },
    {
      id: "priority",
      header: "Priority",
      chip: true,
      cell: (lead) => <SalesStatusBadge variant="priority" value={lead.priority} />,
    },
    {
      id: "assigned",
      header: "Assigned to",
      cell: (lead) =>
        lead.assignedToUser ? (
          <ExecutiveAvatar name={lead.assignedToUser.name} avatarUrl={lead.assignedToUser.avatarUrl} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "createdBy",
      header: "Created by",
      cell: (lead) =>
        lead.createdByUser ? (
          <ExecutiveAvatar name={lead.createdByUser.name} avatarUrl={lead.createdByUser.avatarUrl} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "expected",
      header: "Expected value",
      align: "right",
      cell: (lead) => (
        <span className="font-medium tabular-nums">{formatCompactCurrency(lead.expectedValue)}</span>
      ),
    },
    {
      id: "reminder",
      header: "Next reminder",
      cell: (lead) => (
        <span className="text-muted-foreground">
          {lead.reminder?.date ? format(new Date(lead.reminder.date), "MMM d, yyyy") : "—"}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (lead) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatSalesDateTime(lead.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-[108px]",
      cell: (lead) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="View lead" asChild>
            <Link href={`/sales/leads/${lead.id}`}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit lead"
            onClick={() => openEditDrawer(lead)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete lead"
            disabled={lead.status === "converted" && !!lead.customerId}
            onClick={() => setDeleteTarget(lead)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Lead management"
        description="View, assign, and manage all leads across sources."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Lead management" },
        ]}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              disabled={exporting || isLoading}
              onClick={() => void exportLeads()}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreateDrawer}>
              <Plus className="h-3.5 w-3.5" />
              Add lead
            </Button>
          </>
        }
      />

      <PortalKpiGrid
        items={[
          {
            title: "Total leads",
            value: leadsKpi?.total ?? totalCount,
            icon: Users,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Added today",
            value: leadsKpi?.today ?? 0,
            icon: TrendingUp,
            accent: "green",
            delay: 1,
          },
          {
            title: "This week",
            value: leadsKpi?.thisWeek ?? 0,
            icon: UserCheck,
            accent: "violet",
            delay: 2,
          },
          {
            title: "Active follow-ups",
            value: dashData?.activeFollowUps ?? 0,
            icon: Phone,
            accent: "amber",
            delay: 3,
          },
        ]}
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, company, email…"
        onExport={() => void exportLeads()}
      />

      <CmsChipTabs
        value={statusTab}
        onValueChange={(v) => setStatusTab(v as LeadStatus | "all")}
        items={chipItems}
      />

      {selected.size > 0 && (
        <motion.div
          className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-medium">{selected.size} selected</span>
          <BulkLeadActions
            selectedIds={[...selected]}
            onClear={() => setSelected(new Set())}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </motion.div>
      )}

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(lead) => lead.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: Users,
          title: "No leads found",
          description: "Try adjusting your search or status filter, or add a new lead.",
          actionLabel: "Add lead",
          onAction: openCreateDrawer,
        }}
        getRowClassName={(lead) => (selected.has(lead.id) ? "bg-primary/[0.03]" : undefined)}
        pagination={{
          page,
          total: totalCount,
          limit,
          loadedRowCount: filtered.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />

      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <LeadFormModal
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        lead={editingLead}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove "${deleteTarget.name}" and its activity history. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLead.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLead.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteLead.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalPageShell>
  );
}
