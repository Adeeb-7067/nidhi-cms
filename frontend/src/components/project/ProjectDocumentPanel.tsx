import { useState } from "react";
import { format } from "date-fns";
import { Bell, Copy, ExternalLink, FileText, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectDocumentFormDialog } from "@/components/project/ProjectDocumentFormDialog";
import {
  useGetProjectDocumentByProjectId,
  type ProjectDocument,
  type ProjectDocumentField,
  type ProjectDocumentRenewal,
} from "@/api/project-documents";
import { ApiError } from "@/api/custom-fetch";
import { usePermission } from "@/modules/permissions/usePermission";
import { toast } from "sonner";

function CopyButton({ value }: { value: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs shrink-0"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success("Copied");
      }}
    >
      <Copy className="h-3 w-3 mr-1" />
      Copy
    </Button>
  );
}

function FieldValue({ field }: { field: ProjectDocumentField }) {
  const value = field.value?.trim();
  if (!value) {
    return <span className="text-xs text-muted-foreground italic">Not set</span>;
  }

  if (field.type === "url") {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary hover:underline inline-flex items-center gap-1 break-all"
      >
        {value}
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }

  if (field.type === "file" || field.type === "image") {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary hover:underline break-all"
      >
        {field.type === "image" ? "View image" : "Download file"}
      </a>
    );
  }

  if (field.type === "textarea") {
    return <p className="text-xs whitespace-pre-wrap break-words">{value}</p>;
  }

  return (
    <div className="flex items-start gap-2 min-w-0">
      <code
        className={`text-xs break-all flex-1 ${field.type === "password" ? "font-mono" : ""}`}
      >
        {value}
      </code>
      <CopyButton value={value} />
    </div>
  );
}

function RenewalRow({ renewal }: { renewal: ProjectDocumentRenewal }) {
  const days = renewal.daysUntilExpiry;
  const kindLabel =
    renewal.kind === "domain"
      ? "Domain"
      : renewal.kind === "hosting"
        ? "Hosting"
        : renewal.kind === "ssl"
          ? "SSL"
          : "Other";

  return (
    <div className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between min-w-0">
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">
          {renewal.label?.trim() || kindLabel}
          {renewal.provider ? (
            <span className="text-muted-foreground font-normal"> · {renewal.provider}</span>
          ) : null}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {format(new Date(renewal.startDate), "MMM d, yyyy")} →{" "}
          {format(new Date(renewal.endDate), "MMM d, yyyy")}
        </p>
      </div>
      {days != null && days <= 15 && (
        <Badge
          variant={days <= 7 ? "destructive" : "secondary"}
          className="text-[10px] gap-1 shrink-0 w-fit"
        >
          <Bell className="h-2.5 w-2.5" />
          {days <= 0 ? "Expired" : `${days}d left`}
        </Badge>
      )}
    </div>
  );
}

export function ProjectDocumentPanel({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName?: string | null;
}) {
  const canEdit = usePermission("admin_project_documents", "edit");
  const canCreate = usePermission("admin_project_documents", "create");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useGetProjectDocumentByProjectId(projectId);
  const notFound = isError && error instanceof ApiError && error.status === 404;
  const doc = data?.document;

  const openCreate = () => setFormOpen(true);
  const openEdit = () => setFormOpen(true);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError && !notFound) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-destructive">
          Could not load project document.
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!doc) {
    return (
      <>
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No handover document yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
              Store credentials, links, files, and domain/hosting renewals for this project in one place.
            </p>
            {canCreate && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create document dossier
              </Button>
            )}
          </CardContent>
        </Card>

        <ProjectDocumentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          fixedProjectId={projectId}
          fixedProjectName={projectName ?? undefined}
          onSuccess={() => refetch()}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                Handover document
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-1">
                Updated {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                {doc.updatedByName ? ` · ${doc.updatedByName}` : ""}
              </p>
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={openEdit}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-3 max-w-xs">
              <Progress value={doc.completeness?.percent ?? 0} className="h-1.5 flex-1" />
              <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
                {doc.completeness?.filled ?? 0}/{doc.completeness?.total ?? 0} · {doc.completeness?.percent ?? 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {doc.fields.length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Fields ({doc.fields.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {doc.fields.map((field) => (
                <div key={field.id} className="border rounded-lg p-3 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium truncate">{field.label}</p>
                    <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                      {field.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <FieldValue field={field} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(doc.renewals ?? []).length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Renewals & reminders ({doc.renewals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {doc.renewals.map((renewal) => (
                <RenewalRow key={renewal.id} renewal={renewal} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <ProjectDocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        document={doc as ProjectDocument}
        fixedProjectId={projectId}
        fixedProjectName={projectName ?? undefined}
        onSuccess={() => refetch()}
      />
    </>
  );
}
