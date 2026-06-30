import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/ui/file-uploader";
import { HrmField } from "@/modules/hrm/components";
import { HRM_DOCUMENT_CATEGORIES, documentCategoryLabel } from "@/modules/hrm/document-constants";
import { useCreateDocument, useDeleteDocument, useHrmDocuments } from "@/api/hrm";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import type { HrmEmployeeDocument } from "@/modules/hrm/types";
import { cn } from "@/lib/utils";

export function EmployeeDocumentsPanel({
  userId,
  canUpload = true,
  canDelete = true,
  fetchEnabled = true,
  documents: documentsProp,
  documentsLoading,
  className,
}: {
  userId: number;
  canUpload?: boolean;
  canDelete?: boolean;
  /** When false, skips the documents API until the panel is visible (e.g. inactive tab). */
  fetchEnabled?: boolean;
  /** Preloaded list from the parent edit dialog (keeps in sync with profile hydration). */
  documents?: HrmEmployeeDocument[];
  documentsLoading?: boolean;
  className?: string;
}) {
  const useInternalFetch = documentsProp == null;
  const {
    data,
    isLoading: queryLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useHrmDocuments(userId, {
    enabled: fetchEnabled && useInternalFetch && userId > 0,
  });
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState("id_proof");
  const [fileUrl, setFileUrl] = useState("");

  const documents = documentsProp ?? data?.documents ?? [];
  const loading = documentsLoading ?? (useInternalFetch && queryLoading);

  const handleUpload = async () => {
    if (!docName.trim() || !fileUrl) {
      toast.error("Document name and file are required");
      return;
    }
    try {
      await createDocument.mutateAsync({
        userId,
        name: docName.trim(),
        category,
        fileUrl,
      });
      toast.success("Document uploaded");
      setDocName("");
      setCategory("id_proof");
      setFileUrl("");
      void refetch();
    } catch {
      // mutation toast
    }
  };

  const handleDelete = async (doc: HrmEmployeeDocument) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    try {
      await deleteDocument.mutateAsync(doc.id);
      toast.success("Document deleted");
      void refetch();
    } catch {
      // mutation toast
    }
  };

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Employee documents</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Saved files for this employee appear below. Use the form at the bottom to add more.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Saved documents{documents.length ? ` (${documents.length})` : ""}
        </p>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-center text-xs text-destructive">
            Could not load documents{error instanceof Error && error.message ? `: ${error.message}` : "."}
          </p>
        ) : documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-5 text-center text-xs text-muted-foreground">
            No documents yet. Upload below, or attach Resume / ID proof in the fields above and save the
            employee — they will appear here too.
          </p>
        ) : (
          documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              canDelete={canDelete && doc.source !== "profile"}
              deleting={deleteDocument.isPending}
              onDelete={() => void handleDelete(doc)}
            />
          ))
        )}
        {isFetching && !loading ? (
          <p className="text-center text-[10px] text-muted-foreground">Refreshing…</p>
        ) : null}
      </div>

      {canUpload ? (
        <div className="mt-5 space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Add new document
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <HrmField label="Document name">
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Aadhaar card"
                className="h-9 text-xs"
              />
            </HrmField>
            <HrmField label="Type">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HRM_DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrmField>
          </div>
          <HrmField label="File (PDF or image)">
            <FileUploader
              variant="choose-file"
              category="hrm"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              value={fileUrl}
              maxSizeMB={10}
              onUploadComplete={(url) => setFileUrl(url)}
            />
          </HrmField>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            disabled={createDocument.isPending || !fileUrl || !docName.trim()}
            onClick={() => void handleUpload()}
          >
            {createDocument.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            Upload document
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DocumentRow({
  doc,
  canDelete,
  deleting,
  onDelete,
}: {
  doc: HrmEmployeeDocument;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const href = doc.fileUrl ? resolveFileUrl(doc.fileUrl) : "";
  const dateLabel = doc.createdAt ? format(new Date(doc.createdAt), "d MMM yyyy") : "—";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{doc.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {documentCategoryLabel(doc.category)}
          {doc.source === "profile" ? " · from profile" : ""} · {dateLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {href ? (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" />
              View
            </a>
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={deleting}
            onClick={onDelete}
          >
            <Trash2 className="size-3" />
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
