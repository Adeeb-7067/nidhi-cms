import { useEffect, useMemo, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/ui/file-uploader";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageHero, HrmPageShell, HrmField, portalActionButtonClass } from "@/modules/hrm/components";
import {
  HrmRefEmptyState,
  HrmRefRefreshButton,
  hrmRefCountSubtitle,
} from "@/modules/hrm/hrm-reference-kit";
import { HRM_HR_KIT_CATEGORIES, HrmHrKitLibrary } from "@/modules/hrm/HrmHrKitView";
import type { HrmHrKit } from "@/modules/hrm/types";
import { useCreateHrKit, useDeleteHrKit, useHrmHrKits, useUpdateHrKit } from "@/api/hrm";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";

type HrKitFormState = {
  title: string;
  description: string;
  category: string;
  version: string;
  fileUrl: string;
};

const emptyForm = (): HrKitFormState => ({
  title: "",
  description: "",
  category: "General",
  version: "1.0",
  fileUrl: "",
});

export default function HrmHrKitPage() {
  const canCreate = useHrmPermission("hr_kit", "create");
  const canEdit = useHrmPermission("hr_kit", "edit");
  const canDelete = useHrmPermission("hr_kit", "delete");

  const { data, isLoading, refetch, isFetching } = useHrmHrKits();
  const createHrKit = useCreateHrKit();
  const updateHrKit = useUpdateHrKit();
  const deleteHrKit = useDeleteHrKit();

  const kits = data?.kits ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HrmHrKit | null>(null);
  const [editing, setEditing] = useState<HrmHrKit | null>(null);
  const [form, setForm] = useState<HrKitFormState>(emptyForm);

  const selectedKit = useMemo(
    () => kits.find((p) => p.id === selectedId) ?? null,
    [kits, selectedId],
  );

  useEffect(() => {
    if (!kits.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !kits.some((p) => p.id === selectedId)) {
      setSelectedId(kits[0].id);
    }
  }, [kits, selectedId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (kit: HrmHrKit) => {
    setEditing(kit);
    setForm({
      title: kit.title,
      description: kit.description ?? "",
      category: kit.category ?? "General",
      version: kit.version ?? "1.0",
      fileUrl: kit.fileUrl ?? "",
    });
    setDialogOpen(true);
  };

  const saveKit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editing) {
        await updateHrKit.mutateAsync({
          id: editing.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          version: form.version.trim() || "1.0",
          fileUrl: form.fileUrl || null,
        });
        toast.success("HR Kit item updated");
      } else {
        const created = await createHrKit.mutateAsync({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          version: form.version.trim() || "1.0",
          fileUrl: form.fileUrl || undefined,
        });
        setSelectedId(created.id);
        toast.success("HR Kit item added");
      }
      setDialogOpen(false);
    } catch {
      // mutation toast
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteHrKit.mutateAsync(deleteTarget.id);
      toast.success("HR Kit item deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // mutation toast
    }
  };

  return (
    <HrmGate module="hr_kit">
      <HrmPageShell className="space-y-4">
        <HrmPageHero
          title="HR Kit"
          description={
            isLoading ? "Loading HR Kit items…" : hrmRefCountSubtitle(kits.length, "kit item", "kit items")
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />
              {canCreate && (
                <Button size="sm" className={portalActionButtonClass("h-8")} onClick={openCreate}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add kit item
                </Button>
              )}
            </div>
          }
        />

        <HrmHrKitLibrary
          kits={kits}
          selectedId={selectedId}
          onSelect={setSelectedId}
          loading={isLoading}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={openEdit}
          onDelete={(p) => {
            setDeleteTarget(p);
            setDeleteOpen(true);
          }}
          onUploadPdf={openEdit}
          emptyState={
            <HrmRefEmptyState
              icon={Briefcase}
              title="No HR Kit items yet"
              description="HR templates, guidelines, handbooks, and reference documents will appear here."
              action={
                canCreate ? (
                  <Button size="sm" className={portalActionButtonClass()} onClick={openCreate}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add kit item
                  </Button>
                ) : undefined
              }
            />
          }
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit kit item" : "Add kit item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Onboarding Handbook 2026"
                />
              </HrmField>
              <HrmField label="Category">
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HRM_HR_KIT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              <HrmField label="Description">
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </HrmField>
              <HrmField label="Version">
                <Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
              </HrmField>
              <HrmField label="Document / PDF">
                <FileUploader
                  category="misc"
                  accept=".pdf,.doc,.docx"
                  value={form.fileUrl}
                  onUploadComplete={(url) => setForm((f) => ({ ...f, fileUrl: url }))}
                  label="Upload document"
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                disabled={createHrKit.isPending || updateHrKit.isPending || !form.title.trim()}
                onClick={() => void saveKit()}
              >
                {editing ? "Save changes" : "Add kit item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete kit item?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `"${deleteTarget.title}" will be removed from the HR Kit.`
                  : "This kit item will be removed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void confirmDelete()}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HrmPageShell>
    </HrmGate>
  );
}
