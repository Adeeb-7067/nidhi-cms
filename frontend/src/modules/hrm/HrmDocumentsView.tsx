import type { ReactNode } from "react";
import { format } from "date-fns";
import { Check, Download, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { HrmEmployeeAvatar } from "./dashboard-sections";
import type { HrmEmployeeDocument } from "./types";
import {
  HrmRefDetailHeader,
  HrmRefDetailRow,
  HrmRefDetailSection,
  HrmRefListItemContent,
  HrmRefMasterDetail,
  HrmRefPdfPanel,
  HrmRefStatusPill,
} from "./hrm-reference-kit";

function DocReviewActions({
  disabled,
  onApprove,
  onReject,
}: {
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={disabled} onClick={onReject}>
        <X className="mr-1 h-3.5 w-3.5" />
        Reject
      </Button>
      <Button size="sm" disabled={disabled} onClick={onApprove}>
        <Check className="mr-1 h-3.5 w-3.5" />
        Approve
      </Button>
    </div>
  );
}

function statusTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "danger";
  return "muted";
}

export function HrmDocumentLibrary({
  documents,
  selectedId,
  onSelect,
  loading,
  canViewAll,
  canReview,
  reviewPending,
  onApprove,
  onReject,
  onDownload,
  emptyState,
}: {
  documents: HrmEmployeeDocument[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  loading?: boolean;
  canViewAll?: boolean;
  canReview?: boolean;
  reviewPending?: boolean;
  onApprove?: (doc: HrmEmployeeDocument) => void;
  onReject?: (doc: HrmEmployeeDocument) => void;
  onDownload?: (doc: HrmEmployeeDocument) => void;
  emptyState?: ReactNode;
}) {
  const selected = documents.find((d) => d.id === selectedId) ?? null;
  const fileUrl = selected?.fileUrl ? resolveFileUrl(selected.fileUrl) : null;
  const isPdf = selected?.fileUrl?.toLowerCase().includes(".pdf");

  return (
    <HrmRefMasterDetail
      listTitle="Document list"
      list={documents}
      selectedId={selectedId}
      onSelect={(id) => onSelect(Number(id))}
      getId={(item) => (item as HrmEmployeeDocument).id}
      loading={loading}
      emptyList={emptyState}
      renderListItem={(item, active) => {
        const doc = item as HrmEmployeeDocument;
        return (
          <HrmRefListItemContent
            icon={FileText}
            title={doc.name}
            subtitle={
              doc.source === "profile"
                ? `${doc.category} · from profile`
                : doc.category
            }
            active={active}
          />
        );
      }}
      detail={
        selected ? (
          <>
            <HrmRefDetailHeader
              title={selected.name}
              subtitle={selected.category}
              actions={
                <>
                  {onDownload && (
                    <Button size="sm" variant="outline" onClick={() => onDownload(selected)}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </Button>
                  )}
                  {canReview && selected.status === "pending" && selected.source !== "profile" && onApprove && onReject && (
                    <DocReviewActions
                      disabled={reviewPending}
                      onApprove={() => onApprove(selected)}
                      onReject={() => onReject(selected)}
                    />
                  )}
                </>
              }
            />
            <div className="flex flex-1 flex-col gap-4 p-5">
              <HrmRefDetailSection title="Details">
                <div className="space-y-3">
                  {canViewAll && (
                    <HrmRefDetailRow
                      label="Employee"
                      value={
                        <div className="flex items-center gap-2">
                          <HrmEmployeeAvatar
                            name={selected.userName ?? `#${selected.userId}`}
                            avatarUrl={selected.avatarUrl}
                            className="h-6 w-6"
                          />
                          <span>
                            {selected.userName ?? `#${selected.userId}`}
                            {selected.employeeId ? ` (${selected.employeeId})` : ""}
                          </span>
                        </div>
                      }
                    />
                  )}
                  <HrmRefDetailRow
                    label="Source"
                    value={selected.source === "profile" ? "Employee profile" : "Document library"}
                  />
                  <HrmRefDetailRow
                    label="Status"
                    value={<HrmRefStatusPill tone={statusTone(selected.status)}>{selected.status}</HrmRefStatusPill>}
                  />
                  {selected.createdAt ? (
                    <HrmRefDetailRow
                      label="Uploaded"
                      value={format(new Date(selected.createdAt), "PPP")}
                    />
                  ) : null}
                  {selected.reviewNote && (
                    <HrmRefDetailRow label="Review note" value={selected.reviewNote} />
                  )}
                </div>
              </HrmRefDetailSection>
              {isPdf ? (
                <HrmRefPdfPanel fileUrl={fileUrl} title={selected.name} />
              ) : fileUrl ? (
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-center">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Open attached file
                  </a>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Select a document from the list
          </div>
        )
      }
    />
  );
}
