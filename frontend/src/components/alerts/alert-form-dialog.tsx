import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/ui/file-uploader";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";
import { AlertAudienceField } from "./alert-audience-field";
import {
  useCreateAlert,
  useUpdateAlert,
  type Alert,
  type AlertAudienceType,
} from "@/api/alerts";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

const EMPTY_FORM = {
  title: "",
  description: "",
  photoUrl: "" as string,
  scheduledAt: "",
  audienceType: "all" as AlertAudienceType,
  targetUserIds: [] as number[],
  targetRoles: [] as string[],
};

type AlertFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert?: Alert | null;
};

export function AlertFormDialog({ open, onOpenChange, alert }: AlertFormDialogProps) {
  const isEdit = Boolean(alert);
  const [form, setForm] = useState(EMPTY_FORM);
  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();
  const isSaving = createAlert.isPending || updateAlert.isPending;

  useEffect(() => {
    if (!open) return;
    if (alert) {
      setForm({
        title: alert.title,
        description: alert.description,
        photoUrl: alert.photoUrl ?? "",
        scheduledAt: toDatetimeLocal(alert.scheduledAt),
        audienceType: alert.audienceType,
        targetUserIds: alert.targetUserIds ?? (alert.targetUserId != null ? [alert.targetUserId] : []),
        targetRoles: alert.targetRoles ?? (alert.targetRole ? [alert.targetRole] : []),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, alert]);

  // Seed display names for users already attached to the alert being edited.
  const initialUserLabels = useMemo(() => {
    if (!alert?.targetUserIds?.length || !alert.targetUserNames?.length) return undefined;
    const map: Record<number, string> = {};
    alert.targetUserIds.forEach((id, i) => {
      const name = alert.targetUserNames[i];
      if (name) map[id] = name;
    });
    return map;
  }, [alert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (!form.scheduledAt) {
      toast.error("Pick a date and time to send this alert.");
      return;
    }
    const scheduledAt = new Date(form.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      toast.error("Scheduled date and time must be in the future.");
      return;
    }
    if (form.audienceType === "user" && form.targetUserIds.length === 0) {
      toast.error("Select at least one user to target.");
      return;
    }
    if (form.audienceType === "role" && form.targetRoles.length === 0) {
      toast.error("Select at least one role to target.");
      return;
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      photoUrl: form.photoUrl || null,
      scheduledAt: scheduledAt.toISOString(),
      audienceType: form.audienceType,
      targetUserIds: form.audienceType === "user" ? form.targetUserIds : [],
      targetRoles: form.audienceType === "role" ? form.targetRoles : [],
    };

    try {
      if (isEdit && alert) {
        await updateAlert.mutateAsync({ id: alert.id, ...body });
        toast.success("Alert updated");
      } else {
        await createAlert.mutateAsync(body);
        toast.success("Alert scheduled");
      }
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update alert" : "Failed to create alert");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit alert" : "New alert"}</DialogTitle>
          <DialogDescription>
            Schedule an announcement that pops up as a modal for the selected audience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Scheduled maintenance"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="What should the audience know?"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Photo (optional)</Label>
            <FileUploader
              category="misc"
              accept="image/*"
              label="Upload a photo"
              value={form.photoUrl}
              onUploadComplete={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
            />
            {form.photoUrl ? (
              <img
                src={resolveFileUrl(form.photoUrl)}
                alt="Alert preview"
                className="max-h-40 rounded-md border border-border object-cover"
              />
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Scheduled at</Label>
            <Input
              type="datetime-local"
              className="h-10"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              required
            />
          </div>

          <AlertAudienceField
            audienceType={form.audienceType}
            targetUserIds={form.targetUserIds}
            targetRoles={form.targetRoles}
            initialUserLabels={initialUserLabels}
            onChange={({ audienceType, targetUserIds, targetRoles }) =>
              setForm((f) => ({ ...f, audienceType, targetUserIds, targetRoles }))
            }
          />

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Schedule alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
