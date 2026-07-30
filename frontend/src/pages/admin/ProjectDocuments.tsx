import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Bell, FolderOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTablePagination } from "@/lib/table-pagination";
import { ProjectDocumentFormDialog } from "@/components/project/ProjectDocumentFormDialog";
import {
  useListProjectDocuments,
  useDeleteProjectDocument,
  type ProjectDocument,
} from "@/api/project-documents";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
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

export default function ProjectDocumentsPage() {
  const [search, setSearch] = useState("");
  const { page, setPage, resetPage, limit, apiLimit } = useTablePagination(20);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDocument | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectDocument | null>(null);

  const params = useMemo(
    () => ({ page, limit: apiLimit, search: search || undefined }),
    [page, apiLimit, search],
  );
  const { data, isLoading, isError, refetch } = useListProjectDocuments(params);
  const deleteDoc = useDeleteProjectDocument();

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const avgComplete =
    documents.length > 0
      ? Math.round(documents.reduce((s, d) => s + (d.completeness?.percent ?? 0), 0) / documents.length)
      : 0;

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (doc: ProjectDocument) => {
    setEditTarget(doc);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc.mutateAsync(deleteTarget.id);
      toast.success(`Deleted dossier for ${deleteTarget.projectName}`);
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete");
    }
  };

  const columns: CmsColumn<ProjectDocument>[] = [
    {
      id: "project",
      header: "Project",
      cell: (doc) => (
        <button
          type="button"
          className="font-medium hover:text-primary text-left"
          onClick={() => openEdit(doc)}
        >
          {doc.projectName ?? `Project #${doc.projectId}`}
        </button>
      ),
    },
    {
      id: "fields",
      header: "Fields",
      chip: true,
      cell: (doc) => (
        <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
          {doc.completeness?.filled ?? 0}/{doc.completeness?.total ?? doc.fields?.length ?? 0} filled
        </Badge>
      ),
    },
    {
      id: "renewal",
      header: "Renewal",
      chip: true,
      cell: (doc) =>
        doc.nearestRenewal ? (
          <Badge
            variant={
              (doc.nearestRenewal.daysUntilExpiry ?? 99) <= 7
                ? "destructive"
                : (doc.nearestRenewal.daysUntilExpiry ?? 99) <= 15
                  ? "secondary"
                  : "outline"
            }
            className="text-[10px] font-normal gap-1"
          >
            <Bell className="h-2.5 w-2.5" />
            {doc.nearestRenewal.label?.trim() || doc.nearestRenewal.kind}
            {" · "}
            {(doc.nearestRenewal.daysUntilExpiry ?? 0) <= 0
              ? "expired"
              : `${doc.nearestRenewal.daysUntilExpiry}d`}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "completeness",
      header: "Completeness",
      className: "min-w-[140px]",
      cell: (doc) => (
        <div className="flex items-center gap-2">
          <Progress value={doc.completeness?.percent ?? 0} className="h-1.5 flex-1" />
          <span className="text-[10px] tabular-nums text-muted-foreground w-8">
            {doc.completeness?.percent ?? 0}%
          </span>
        </div>
      ),
    },
    {
      id: "updated",
      header: "Updated",
      cell: (doc) => (
        <span className="text-muted-foreground">{format(new Date(doc.updatedAt), "MMM d, yyyy")}</span>
      ),
    },
    {
      id: "by",
      header: "By",
      cell: (doc) => <span className="text-muted-foreground">{doc.updatedByName ?? "—"}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (doc) => (
        <CmsRowActions
          label="Document actions"
          onEdit={() => openEdit(doc)}
          onDelete={() => setDeleteTarget(doc)}
        />
      ),
    },
  ];

  return (
    <PortalPageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Project documents</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Handover vault with custom fields plus domain/hosting renewals — daily reminders start 15 days before expiry.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Add project document
        </Button>
      </div>

      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Total dossiers", value: total, icon: FolderOpen, accent: "blue", delay: 0 },
          { title: "On this page", value: documents.length, icon: FolderOpen, accent: "violet", delay: 1 },
          { title: "Avg completeness", value: `${avgComplete}%`, icon: FolderOpen, accent: "green", delay: 2 },
        ]}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-8 text-sm"
          placeholder="Search by project name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
        />
      </div>

      <CmsDataTable
        columns={columns}
        rows={documents}
        rowKey={(doc) => doc.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: FolderOpen,
          title: "No project documents yet",
          description: "Create a dossier and add the fields your team needs.",
          actionLabel: "Add first document",
          onAction: openCreate,
        }}
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
      />

      <ProjectDocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editTarget}
        onSuccess={() => refetch()}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project document?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the handover dossier for <strong>{deleteTarget?.projectName}</strong>. Credentials and file links stored here will be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalPageShell>
  );
}
