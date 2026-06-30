import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Plus, Users, Upload, Pencil, Eye, Trash2, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-base";
import { customFetch } from "@/api/custom-fetch";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { useDeleteLead, useListLeads, salesKeys, type Lead, type LeadStatus } from "@/api/sales";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
  formatCompactCurrency,
  formatLeadSourceLabel,
} from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  SalesEmptyState,
  LeadFormModal,
  BulkLeadActions,
  LeadImportDialog,
} from "@/modules/sales/components";

const PAGE_SIZE = 20;

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
    format(new Date(l.createdAt), "yyyy-MM-dd"),
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
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const qc = useQueryClient();

  useEffect(() => { setPage(1); }, [search, statusTab]);

  const listParams = {
    search: search || undefined,
    status: statusTab !== "all" ? statusTab : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const exportLeads = async () => {
    setExporting(true);
    try {
      const exportParams = { ...listParams, page: 1, limit: 1000 };
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
  const filtered = data?.leads ?? [];

  const totalCount = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
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

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, company, email…"
        onExport={() => void exportLeads()}
      />

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as LeadStatus | "all")}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">
            All ({statusTab === "all" ? totalCount : "…"})
          </TabsTrigger>
          {LEAD_STATUS_ORDER.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs data-[state=active]:bg-primary/10">
              {LEAD_STATUS_LABELS[s]}{statusTab === s ? ` (${totalCount})` : ""}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SalesEmptyState
          icon={Users}
          title="Failed to load leads"
          description="Could not fetch leads from the server."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <SalesEmptyState
          icon={Users}
          title="No leads found"
          description="Try adjusting your search or status filter, or add a new lead."
          actionLabel="Add lead"
          onAction={openCreateDrawer}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto print:overflow-visible">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Executive</TableHead>
                  <TableHead className="text-xs text-right">Expected value</TableHead>
                  <TableHead className="text-xs">Next reminder</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs text-right w-[108px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      "hover:bg-muted/30",
                      selected.has(lead.id) && "bg-primary/[0.03]",
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(lead.id)}
                        onCheckedChange={() => toggleOne(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      #{lead.id}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <Link href={`/sales/leads/${lead.id}`} className="text-xs font-medium hover:text-primary hover:underline transition-colors">
                          {lead.name}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">{lead.email ?? "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">{lead.company ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {formatLeadSourceLabel(lead.source)}
                    </TableCell>
                    <TableCell>
                      <SalesStatusBadge variant="lead" value={lead.status} />
                    </TableCell>
                    <TableCell>
                      <SalesStatusBadge variant="priority" value={lead.priority} />
                    </TableCell>
                    <TableCell>
                      {lead.assignedToUser ? (
                        <ExecutiveAvatar name={lead.assignedToUser.name} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">
                      {formatCompactCurrency(lead.expectedValue)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.reminder?.date
                        ? format(new Date(lead.reminder.date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(lead.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View lead"
                          asChild
                        >
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {totalCount} lead{totalCount === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
