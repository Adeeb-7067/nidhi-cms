import { useEffect, useState } from "react";
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
  targetUserId: null as number | null,
  targetRole: null as string | null,
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
        targetUserId: alert.targetUserId,
        targetRole: alert.targetRole,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, alert]);

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
    if (form.audienceType === "user" && !form.targetUserId) {
      toast.error("Select a user to target.");
      return;
    }
    if (form.audienceType === "role" && !form.targetRole) {
      toast.error("Select a role to target.");
      return;
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      photoUrl: form.photoUrl || null,
      scheduledAt: scheduledAt.toISOString(),
      audienceType: form.audienceType,
      targetUserId: form.audienceType === "user" ? form.targetUserId : null,
      targetRole: form.audienceType === "role" ? form.targetRole : null,
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
            targetUserId={form.targetUserId}
            targetRole={form.targetRole}
            onChange={({ audienceType, targetUserId, targetRole }) =>
              setForm((f) => ({ ...f, audienceType, targetUserId, targetRole }))
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
