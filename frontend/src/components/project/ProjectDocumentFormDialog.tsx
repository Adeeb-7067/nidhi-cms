import { useEffect, useState } from "react";
import { Bell, Copy, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/ui/file-uploader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGetProjectDocument,
  useCreateProjectDocument,
  useUpdateProjectDocument,
  useProjectsWithoutDocument,
  type ProjectDocument,
  type ProjectDocumentField,
  type ProjectDocumentFieldType,
  type ProjectDocumentRenewal,
  type ProjectDocumentRenewalKind,
} from "@/api/project-documents";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const FIELD_TYPE_LABELS: Record<ProjectDocumentFieldType, string> = {
  text: "Text",
  password: "Password / secret",
  url: "Link (URL)",
  file: "File upload",
  textarea: "Long notes",
  image: "Image / screenshot",
};

const QUICK_PRESETS: { label: string; type: ProjectDocumentFieldType }[] = [
  { label: "Figma link", type: "url" },
  { label: "Server host", type: "text" },
  { label: "Server username", type: "text" },
  { label: "Server password", type: "password" },
  { label: "Firebase email", type: "text" },
  { label: "Firebase password", type: "password" },
  { label: "Google Maps API key", type: "password" },
  { label: "Play Store keystore", type: "file" },
  { label: "Play Store key", type: "file" },
  { label: "Source code archive", type: "file" },
  { label: "Handover notes", type: "textarea" },
  { label: "Screenshot", type: "image" },
];

const RENEWAL_KIND_LABELS: Record<ProjectDocumentRenewalKind, string> = {
  domain: "Domain",
  hosting: "Hosting",
  ssl: "SSL certificate",
  other: "Other",
};

const RENEWAL_PRESETS: { kind: ProjectDocumentRenewalKind; label: string }[] = [
  { kind: "domain", label: "" },
  { kind: "hosting", label: "" },
];

function newRenewalId() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function daysUntilFromInput(endDate: string) {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

function emptyRenewal(partial?: Partial<ProjectDocumentRenewal>): ProjectDocumentRenewal {
  return {
    id: newRenewalId(),
    kind: "domain",
    label: "",
    provider: null,
    startDate: "",
    endDate: "",
    notes: null,
    ...partial,
  };
}

function newFieldId() {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyField(partial?: Partial<ProjectDocumentField>): ProjectDocumentField {
  return {
    id: newFieldId(),
    label: "",
    type: "text",
    value: null,
    ...partial,
  };
}

function CopyFieldButton({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
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

function FieldValueInput({
  field,
  onChange,
}: {
  field: ProjectDocumentField;
  onChange: (value: string | null) => void;
}) {
  const value = field.value ?? "";

  if (field.type === "textarea") {
    return (
      <Textarea
        className="text-sm min-h-[80px]"
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Enter notes…"
      />
    );
  }

  if (field.type === "file" || field.type === "image") {
    return (
      <FileUploader
        category="inventory"
        accept={field.type === "image" ? "image/*" : "*"}
        value={value}
        onUploadComplete={(url) => onChange(url)}
        variant="choose-file"
      />
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end">
        <CopyFieldButton value={value} />
      </div>
      <Input
        type="text"
        className={`h-9 text-sm ${field.type === "password" ? "font-mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={
          field.type === "url"
            ? "https://…"
            : field.type === "password"
              ? "Secret value"
              : "Value"
        }
      />
    </div>
  );
}

export function ProjectDocumentFormDialog({
  open,
  onOpenChange,
  document,
  fixedProjectId,
  fixedProjectName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: ProjectDocument | null;
  fixedProjectId?: number;
  fixedProjectName?: string;
  onSuccess?: () => void;
}) {
  const isEdit = !!document?.id;
  const { data, isLoading } = useGetProjectDocument(document?.id ?? 0, open && isEdit);
  const { data: projectsData } = useProjectsWithoutDocument(open && !isEdit && !fixedProjectId);
  const createDoc = useCreateProjectDocument();
  const updateDoc = useUpdateProjectDocument();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [fields, setFields] = useState<ProjectDocumentField[]>([]);
  const [renewals, setRenewals] = useState<ProjectDocumentRenewal[]>([]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && data?.document) {
      setFields(data.document.fields.map((f) => ({ ...f })));
      setRenewals(
        (data.document.renewals ?? []).map((r) => ({
          ...r,
          startDate: toDateInputValue(r.startDate),
          endDate: toDateInputValue(r.endDate),
        })),
      );
      setProjectId(data.document.projectId);
      return;
    }
    if (!isEdit) {
      setFields([]);
      setRenewals([]);
      setProjectId(fixedProjectId ?? null);
    }
  }, [open, isEdit, data?.document, fixedProjectId]);

  const updateField = (id: string, patch: Partial<ProjectDocumentField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const addField = (preset?: { label: string; type: ProjectDocumentFieldType }) => {
    setFields((prev) => [...prev, emptyField(preset)]);
  };

  const updateRenewal = (id: string, patch: Partial<ProjectDocumentRenewal>) => {
    setRenewals((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRenewal = (id: string) => {
    setRenewals((prev) => prev.filter((r) => r.id !== id));
  };

  const addRenewal = (preset?: Partial<ProjectDocumentRenewal>) => {
    setRenewals((prev) => [...prev, emptyRenewal(preset)]);
  };

  const handleSave = async () => {
    if (!isEdit && !projectId) {
      toast.error("Select a project");
      return;
    }
    const normalizedFields = fields
      .map((f) => ({ ...f, label: f.label.trim() }))
      .filter((f) => f.label.length > 0);
    const normalizedRenewals = renewals
      .filter((r) => r.startDate && r.endDate)
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        label: r.label.trim(),
        provider: r.provider?.trim() || null,
        startDate: r.startDate,
        endDate: r.endDate,
        notes: r.notes?.trim() || null,
      }));

    if (!normalizedFields.length && !normalizedRenewals.length) {
      toast.error("Add at least one field or a renewal with start and end dates");
      return;
    }

    const payload = { fields: normalizedFields, renewals: normalizedRenewals };
    try {
      if (isEdit && document) {
        await updateDoc.mutateAsync({ id: document.id, ...payload });
        toast.success("Project document updated");
      } else {
        await createDoc.mutateAsync({ projectId: projectId!, ...payload });
        toast.success("Project document created");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastApiError(err, "Failed to save");
    }
  };

  const saving = createDoc.isPending || updateDoc.isPending;
  const title = isEdit
    ? `Edit — ${document?.projectName ?? fixedProjectName ?? "Project document"}`
    : fixedProjectName
      ? `New — ${fixedProjectName}`
      : "New project document";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Add custom fields and domain/hosting renewals. Daily reminders start 15 days before expiry.
          </DialogDescription>
        </DialogHeader>

        {isEdit && isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[calc(92vh-8rem)]">
            <div className="px-5 py-4 space-y-4">
              {!isEdit && !fixedProjectId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Project</Label>
                  <Select
                    value={projectId ? String(projectId) : ""}
                    onValueChange={(v) => setProjectId(Number(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select project…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projectsData?.projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Quick add</Label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2"
                      onClick={() => addField(preset)}
                    >
                      + {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Fields ({fields.length})</Label>
                <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => addField()}>
                  <Plus className="h-3 w-3 mr-1" />
                  Custom field
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No fields yet. Use quick-add chips above or add a custom field.
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.id} className="rounded-lg border bg-muted/15 p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-2 shrink-0" />
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Label</Label>
                            <Input
                              className="h-9 text-sm"
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              placeholder="e.g. AWS access key"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(v) =>
                                updateField(field.id, {
                                  type: v as ProjectDocumentFieldType,
                                  value: null,
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(FIELD_TYPE_LABELS) as ProjectDocumentFieldType[]).map((t) => (
                                  <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive shrink-0"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="pl-6">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Value</Label>
                        <FieldValueInput
                          field={field}
                          onChange={(value) => updateField(field.id, { value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Label className="text-xs flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5" />
                      Renewals & reminders ({renewals.length})
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Team gets a daily in-app reminder from 15 days before the end date.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {RENEWAL_PRESETS.map((preset) => (
                      <Button
                        key={preset.kind}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] px-2"
                        onClick={() => addRenewal(preset)}
                      >
                        + {RENEWAL_KIND_LABELS[preset.kind]}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => addRenewal()}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Other
                    </Button>
                  </div>
                </div>

                {renewals.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No renewals yet. Add domain or hosting to track expiry dates.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {renewals.map((renewal) => {
                      const daysLeft = daysUntilFromInput(renewal.endDate);
                      return (
                        <div key={renewal.id} className="rounded-lg border bg-muted/15 p-3 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={renewal.kind}
                                  onValueChange={(v) =>
                                    updateRenewal(renewal.id, { kind: v as ProjectDocumentRenewalKind })
                                  }
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(RENEWAL_KIND_LABELS) as ProjectDocumentRenewalKind[]).map((k) => (
                                      <SelectItem key={k} value={k}>{RENEWAL_KIND_LABELS[k]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Label</Label>
                                <Input
                                  className="h-9 text-sm"
                                  value={renewal.label}
                                  onChange={(e) => updateRenewal(renewal.id, { label: e.target.value })}
                                  placeholder={
                                    renewal.kind === "domain"
                                      ? "e.g. acme.com"
                                      : renewal.kind === "hosting"
                                        ? "e.g. AWS production"
                                        : "Name"
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Provider (optional)</Label>
                                <Input
                                  className="h-9 text-sm"
                                  value={renewal.provider ?? ""}
                                  onChange={(e) =>
                                    updateRenewal(renewal.id, { provider: e.target.value || null })
                                  }
                                  placeholder="GoDaddy, Hostinger…"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Notes (optional)</Label>
                                <Textarea
                                  className="min-h-[64px] text-sm resize-y"
                                  rows={2}
                                  value={renewal.notes ?? ""}
                                  onChange={(e) =>
                                    updateRenewal(renewal.id, { notes: e.target.value || null })
                                  }
                                  placeholder="Login email, account ID…"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Start date</Label>
                                <Input
                                  type="date"
                                  className="h-9 text-sm"
                                  value={renewal.startDate}
                                  onChange={(e) => updateRenewal(renewal.id, { startDate: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">End date</Label>
                                <Input
                                  type="date"
                                  className="h-9 text-sm"
                                  value={renewal.endDate}
                                  min={renewal.startDate || undefined}
                                  onChange={(e) => updateRenewal(renewal.id, { endDate: e.target.value })}
                                />
                                {renewal.endDate && daysLeft != null && (
                                  <p
                                    className={`text-[10px] ${
                                      daysLeft <= 15
                                        ? daysLeft <= 0
                                          ? "text-destructive"
                                          : "text-amber-600 dark:text-amber-400"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {daysLeft <= 0
                                      ? "Expired — update dates after renewal"
                                      : daysLeft <= 15
                                        ? `Reminders active · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                                        : `${daysLeft} days until reminder window`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive shrink-0"
                              onClick={() => removeRenewal(renewal.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={saving || (isEdit && isLoading)} onClick={handleSave}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "Save changes" : "Create document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
