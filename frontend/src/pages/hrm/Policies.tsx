import { useEffect, useMemo, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
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
import { HRM_POLICY_CATEGORIES, HrmPolicyLibrary } from "@/modules/hrm/HrmPolicyView";
import type { HrmPolicy } from "@/modules/hrm/types";
import { useCreatePolicy, useDeletePolicy, useHrmPolicies, useUpdatePolicy } from "@/api/hrm";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";

type PolicyFormState = {
  title: string;
  description: string;
  category: string;
  version: string;
  fileUrl: string;
};

const emptyForm = (): PolicyFormState => ({
  title: "",
  description: "",
  category: "General",
  version: "1.0",
  fileUrl: "",
});

export default function HrmPoliciesPage() {
  const canCreate = useHrmPermission("policies", "create");
  const canEdit = useHrmPermission("policies", "edit");
  const canDelete = useHrmPermission("policies", "delete");

  const { data, isLoading, refetch, isFetching } = useHrmPolicies();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();

  const policies = data?.policies ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HrmPolicy | null>(null);
  const [editing, setEditing] = useState<HrmPolicy | null>(null);
  const [form, setForm] = useState<PolicyFormState>(emptyForm);

  const selectedPolicy = useMemo(
    () => policies.find((p) => p.id === selectedId) ?? null,
    [policies, selectedId],
  );

  useEffect(() => {
    if (!policies.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !policies.some((p) => p.id === selectedId)) {
      setSelectedId(policies[0].id);
    }
  }, [policies, selectedId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (policy: HrmPolicy) => {
    setEditing(policy);
    setForm({
      title: policy.title,
      description: policy.description ?? "",
      category: policy.category ?? "General",
      version: policy.version ?? "1.0",
      fileUrl: policy.fileUrl ?? "",
    });
    setDialogOpen(true);
  };

  const savePolicy = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editing) {
        await updatePolicy.mutateAsync({
          id: editing.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          version: form.version.trim() || "1.0",
          fileUrl: form.fileUrl || null,
        });
        toast.success("Policy updated");
      } else {
        const created = await createPolicy.mutateAsync({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          version: form.version.trim() || "1.0",
          fileUrl: form.fileUrl || undefined,
        });
        setSelectedId(created.id);
        toast.success("Policy added");
      }
      setDialogOpen(false);
    } catch {
      // mutation toast
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePolicy.mutateAsync(deleteTarget.id);
      toast.success("Policy deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // mutation toast
    }
  };

  return (
    <HrmGate module="policies">
      <HrmPageShell className="space-y-4">
        <HrmPageHero
          title="View Policies"
          description={
            isLoading ? "Loading policies…" : hrmRefCountSubtitle(policies.length, "policy", "policies")
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />
              {canCreate && (
                <Button size="sm" className={portalActionButtonClass("h-8")} onClick={openCreate}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add policy
                </Button>
              )}
            </div>
          }
        />

        <HrmPolicyLibrary
          policies={policies}
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
              icon={BookOpen}
              title="No policies yet"
              description="Company policies will appear here. HR can upload PDF documents for employees to read."
              action={
                canCreate ? (
                  <Button size="sm" className={portalActionButtonClass()} onClick={openCreate}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add policy
                  </Button>
                ) : undefined
              }
            />
          }
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit policy" : "Add policy"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="BYOD Policy"
                />
              </HrmField>
              <HrmField label="Category">
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HRM_POLICY_CATEGORIES.map((cat) => (
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
              <HrmField label="Policy PDF">
                <FileUploader
                  category="misc"
                  accept=".pdf"
                  value={form.fileUrl}
                  onUploadComplete={(url) => setForm((f) => ({ ...f, fileUrl: url }))}
                  label="Upload PDF policy"
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                disabled={createPolicy.isPending || updatePolicy.isPending || !form.title.trim()}
                onClick={() => void savePolicy()}
              >
                {editing ? "Save changes" : "Add policy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete policy?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `"${deleteTarget.title}" will be removed from the policy library.`
                  : "This policy will be removed from the library."}
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
