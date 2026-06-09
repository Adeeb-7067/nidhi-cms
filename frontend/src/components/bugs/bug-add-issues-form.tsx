import React, { useState } from "react";
import { useUpdateBug } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  MAX_BATCH_BUGS,
  parseLinesToRows,
  rowsToBatchItems,
} from "@/lib/bug-batch";

export function BugAddIssuesForm({
  bugId,
  existingCount,
  onAdded,
}: {
  bugId: number;
  existingCount: number;
  onAdded: () => void;
}) {
  const updateMutation = useUpdateBug();
  const [open, setOpen] = useState(false);
  const [lineText, setLineText] = useState("");

  const remaining = Math.max(0, MAX_BATCH_BUGS - existingCount);

  const handleSubmit = async () => {
    const rows = parseLinesToRows(lineText);
    if (rows.length === 0) {
      toast.error("Enter at least one issue (one per line).");
      return;
    }
    if (rows.length > remaining) {
      toast.error(`You can add up to ${remaining} more issue${remaining === 1 ? "" : "s"}.`);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: bugId,
        data: { addIssues: rowsToBatchItems(rows) },
      });
      toast.success(
        rows.length === 1 ? "Issue added" : `${rows.length} issues added`,
      );
      setLineText("");
      setOpen(false);
      onAdded();
    } catch (err) {
      toastApiError(err, "Failed to add issues");
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs w-full sm:w-auto"
        disabled={remaining === 0}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add issues
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2">
      <p className="text-xs font-medium text-foreground">Add more issues</p>
      <p className="text-[10px] text-muted-foreground">
        One issue per line. Up to {remaining} more can be added to this report.
      </p>
      <Textarea
        value={lineText}
        onChange={(e) => setLineText(e.target.value)}
        placeholder={"Profile upload option is missing\nPhone number field needs validation"}
        rows={4}
        className="text-sm resize-y min-h-[88px]"
      />
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          disabled={updateMutation.isPending}
          onClick={() => {
            setOpen(false);
            setLineText("");
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={updateMutation.isPending || !lineText.trim()}
          onClick={() => void handleSubmit()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-1" />
          )}
          Add to report
        </Button>
      </div>
    </div>
  );
}
