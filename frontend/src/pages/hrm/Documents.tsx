import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileStack, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUploader } from "@/components/ui/file-uploader";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageHero, HrmPageShell, HrmField, portalActionButtonClass } from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import {
  HrmRefEmptyState,
  HrmRefRefreshButton,
  hrmRefCountSubtitle,
} from "@/modules/hrm/hrm-reference-kit";
import { HrmDocumentLibrary } from "@/modules/hrm/HrmDocumentsView";
import { useCreateDocument, useHrmDocuments, useReviewDocument } from "@/api/hrm";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import type { HrmEmployeeDocument } from "@/modules/hrm/types";

export default function HrmDocumentsPage() {
  const canReview = useHrmPermission("documents", "approve");
  const canViewAll = useHrmPermission("documents", "view");
  const { data, isLoading, refetch, isFetching } = useHrmDocuments();
  const createDocument = useCreateDocument();
  const reviewDocument = useReviewDocument();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState("general");
  const [fileUrl, setFileUrl] = useState("");

  const documents = data?.documents ?? [];

  useEffect(() => {
    if (!documents.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !documents.some((d) => d.id === selectedId)) {
      setSelectedId(documents[0].id);
    }
  }, [documents, selectedId]);

  const kpiItems = useMemo(() => {
    const pending = documents.filter((d) => d.status === "pending").length;
    const approved = documents.filter((d) => d.status === "approved").length;
    return [
      { label: "Documents", value: documents.length, hint: "Uploaded files", icon: FileStack, accent: "violet" as const },
      { label: "Pending review", value: pending, hint: "Awaiting HR", icon: Upload, accent: "amber" as const, alert: pending > 0 },
      { label: "Approved", value: approved, hint: "Verified", icon: FileStack, accent: "green" as const },
      { label: "Categories", value: new Set(documents.map((d) => d.category)).size, hint: "Unique types", icon: FileStack, accent: "blue" as const },
    ];
  }, [documents]);

  const handleUpload = async () => {
    if (!docName.trim() || !fileUrl) {
      toast.error("Document name and file are required");
      return;
    }
    try {
      const created = await createDocument.mutateAsync({
        name: docName.trim(),
        category: category.trim() || "general",
        fileUrl,
      });
      setSelectedId(created.id);
      toast.success("Document submitted for review");
      setUploadOpen(false);
      setDocName("");
      setCategory("general");
      setFileUrl("");
    } catch {
      // mutation toast
    }
  };

  const handleDownload = (doc: HrmEmployeeDocument) => {
    if (doc.fileUrl) window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <HrmGate module="documents">
      <HrmPageShell className="space-y-4">
        <HrmPageHero
          title="Document center"
          description={
            isLoading
              ? "Loading documents…"
              : `${hrmRefCountSubtitle(documents.length, "document")} · employee uploads and HR files`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />
              <Button size="sm" className={portalActionButtonClass("h-8")} onClick={() => setUploadOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Upload
              </Button>
            </div>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <HrmDocumentLibrary
          documents={documents}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={isLoading}
          canViewAll={canViewAll}
          canReview={canReview}
          reviewPending={reviewDocument.isPending}
          onDownload={handleDownload}
          onApprove={(doc) =>
            reviewDocument.mutate(
              { id: doc.id, status: "approved" },
              { onSuccess: () => toast.success("Document approved") },
            )
          }
          onReject={(doc) =>
            reviewDocument.mutate(
              { id: doc.id, status: "rejected" },
              { onSuccess: () => toast.success("Document rejected") },
            )
          }
          emptyState={
            <HrmRefEmptyState
              icon={FileStack}
              title="No documents yet"
              description="Upload employee documents for HR review and approval."
              action={
                <Button size="sm" className={portalActionButtonClass()} onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload document
                </Button>
              }
            />
          }
        />

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Document name">
                <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Aadhar card" />
              </HrmField>
              <HrmField label="Category">
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="general" />
              </HrmField>
              <HrmField label="File">
                <FileUploader
                  category="misc"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  value={fileUrl}
                  onUploadComplete={(url) => setFileUrl(url)}
                  label="Upload PDF or image"
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                disabled={createDocument.isPending || !fileUrl}
                onClick={() => void handleUpload()}
              >
                Submit for review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
