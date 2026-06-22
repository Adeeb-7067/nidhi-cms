import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { MultiFileUploader } from "@/components/ui/multi-file-uploader";
import type { BugAttachment } from "@/api";
import {
  listProjectDescriptionResources,
  type DescriptionResourceAttachment,
} from "@/lib/inventory-api";

export function ProjectDescriptionResourcesField({
  projectId,
  value,
  onChange,
  onBaselineChange,
}: {
  projectId?: number | null;
  value: DescriptionResourceAttachment[];
  onChange: (attachments: DescriptionResourceAttachment[]) => void;
  onBaselineChange: (baseline: Map<string, number>) => void;
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      onBaselineChange(new Map());
      return;
    }

    let cancelled = false;
    setLoading(true);
    listProjectDescriptionResources(projectId)
      .then((resources) => {
        if (cancelled) return;
        const baseline = new Map<string, number>();
        const attachments: DescriptionResourceAttachment[] = resources
          .map((r) => {
            const url = r.fileUrl || r.url;
            if (!url) return null;
            baseline.set(url, r.id);
            return {
              url,
              name: r.name,
              mimeType: r.mimeType,
              resourceId: r.id,
            };
          })
          .filter(Boolean) as DescriptionResourceAttachment[];
        onBaselineChange(baseline);
        onChange(attachments);
      })
      .catch(() => {
        if (!cancelled) onBaselineChange(new Map());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when project changes only
  }, [projectId]);

  const uploaderValue: BugAttachment[] = value.map((v) => ({
    url: v.url,
    name: v.name,
    mimeType: v.mimeType ?? null,
  }));

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">Description files (visible to client)</Label>
      <p className="text-[11px] text-muted-foreground">
        Upload briefs, specs, or reference docs — clients see these in the project overview.
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground py-2">Loading existing files…</p>
      ) : (
        <MultiFileUploader
          value={uploaderValue}
          onChange={(attachments) =>
            onChange(
              attachments.map((a) => ({
                url: a.url,
                name: a.name || "Project document",
                mimeType: a.mimeType,
              })),
            )
          }
          category="inventory"
          maxFiles={12}
          maxSizeMB={50}
          accept="image/*,video/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
          label="Drag & drop files or click to upload"
        />
      )}
    </div>
  );
}
