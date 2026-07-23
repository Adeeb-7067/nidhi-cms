import type { ReactNode } from "react";
import { FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-base";
import type { HrmHrKit } from "./types";
import {
  HrmRefDetailHeader,
  HrmRefListItemContent,
  HrmRefMasterDetail,
  HrmRefPdfPanel,
} from "./hrm-reference-kit";

function resolveFileUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return apiUrl(url.startsWith("/") ? url : `/${url}`);
}

export const HRM_HR_KIT_CATEGORIES = [
  "Templates",
  "Guidelines",
  "Forms",
  "Handbooks",
  "Onboarding Kit",
  "General",
] as const;

export function HrmHrKitLibrary({
  kits,
  selectedId,
  onSelect,
  loading,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onUploadPdf,
  emptyState,
}: {
  kits: HrmHrKit[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  loading?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (kit: HrmHrKit) => void;
  onDelete?: (kit: HrmHrKit) => void;
  onUploadPdf?: (kit: HrmHrKit) => void;
  emptyState?: ReactNode;
}) {
  const selected = kits.find((p) => p.id === selectedId) ?? null;
  const fileUrl = selected?.fileUrl ? resolveFileUrl(selected.fileUrl) : null;

  return (
    <HrmRefMasterDetail
      listTitle="HR Kit list"
      list={kits}
      selectedId={selectedId}
      onSelect={(id) => onSelect(Number(id))}
      getId={(item) => (item as HrmHrKit).id}
      loading={loading}
      emptyList={emptyState}
      renderListItem={(item, active) => {
        const kit = item as HrmHrKit;
        return (
          <HrmRefListItemContent
            icon={FileText}
            title={kit.title}
            subtitle={kit.category ?? "General"}
            active={active}
          />
        );
      }}
      detail={
        selected ? (
          <>
            <HrmRefDetailHeader
              title={selected.title}
              subtitle={[selected.category ?? "General", selected.version ? `v${selected.version}` : ""]
                .filter(Boolean)
                .join(" · ")}
              actions={
                <>
                  {canEdit && onEdit && (
                    <Button size="sm" variant="outline" onClick={() => onEdit(selected)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                  {canDelete && onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(selected)}
                    >
                      Delete
                    </Button>
                  )}
                </>
              }
            >
              {selected.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
              ) : null}
            </HrmRefDetailHeader>
            <div className="flex flex-1 flex-col p-5">
              <HrmRefPdfPanel
                fileUrl={fileUrl}
                title={selected.title}
                emptyAction={
                  canEdit && onUploadPdf ? (
                    <Button size="sm" variant="outline" onClick={() => onUploadPdf(selected)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Upload document
                    </Button>
                  ) : undefined
                }
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Select an HR Kit item from the list
          </div>
        )
      }
    />
  );
}
