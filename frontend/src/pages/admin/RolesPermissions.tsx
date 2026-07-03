import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { PermissionGate } from "@/modules/permissions/PermissionGate";
import { usePermission } from "@/modules/permissions/usePermission";
import {
  usePermissionCatalog,
  useRoleTemplates,
  useCreateRoleTemplate,
  useUpdateRoleTemplate,
  useDeleteRoleTemplate,
  useUpdateRoleTemplatePermissions,
  type RoleTemplate,
} from "@/api/permissions";
import {
  CMS_ACTION_LABELS,
  CMS_ACTIONS,
  CMS_MODULE_GROUPS,
  CMS_MODULE_LABELS,
  type CmsAction,
} from "@/modules/permissions/constants";

function permissionKey(module: string, action: string) {
  return `${module}:${action}`;
}

function parsePermissionKey(key: string): { module: string; action: CmsAction } {
  const sep = key.lastIndexOf(":");
  return {
    module: key.slice(0, sep),
    action: key.slice(sep + 1) as CmsAction,
  };
}

type RoleFormState = {
  name: string;
  code: string;
  cmsRole: string;
  description: string;
};

const emptyRoleForm = (): RoleFormState => ({
  name: "",
  code: "",
  cmsRole: "",
  description: "",
});

export default function RolesPermissionsPage() {
  const canEdit = usePermission("roles_permissions", "edit");
  const { data: catalog } = usePermissionCatalog();
  const { data: rolesData } = useRoleTemplates();
  const createRole = useCreateRoleTemplate();
  const updateRole = useUpdateRoleTemplate();
  const deleteRole = useDeleteRoleTemplate();
  const updatePerms = useUpdateRoleTemplatePermissions();
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [draftGranted, setDraftGranted] = useState<Set<string>>(new Set());

  const templates = rolesData?.templates ?? [];

  const selected = useMemo(
    () => templates.find((t) => t.id === templateId) ?? templates[0],
    [templates, templateId],
  );

  useEffect(() => {
    if (templates.length && templateId == null) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  const granted = useMemo(() => {
    const set = new Set<string>();
    for (const p of selected?.permissions ?? []) set.add(permissionKey(p.module, p.action));
    return set;
  }, [selected]);

  useEffect(() => {
    setDraftGranted(new Set(granted));
  }, [granted, selected?.id]);

  const isDirty = useMemo(() => {
    if (draftGranted.size !== granted.size) return true;
    for (const key of draftGranted) {
      if (!granted.has(key)) return true;
    }
    return false;
  }, [draftGranted, granted]);

  const toggle = (module: string, action: CmsAction) => {
    if (!selected || !canEdit) return;
    const key = permissionKey(module, action);
    setDraftGranted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDiscardPermissions = () => {
    setDraftGranted(new Set(granted));
  };

  const handleSavePermissions = () => {
    if (!selected || !canEdit) return;
    const permissions = [...draftGranted].map((k) => parsePermissionKey(k));
    updatePerms.mutate(
      { id: selected.id, permissions },
      {
        onSuccess: () => toast.success("Permissions saved"),
        onError: () => toast.error("Failed to save permissions"),
      },
    );
  };

  const openEdit = (t: RoleTemplate) => {
    setRoleForm({
      name: t.name,
      code: t.code,
      cmsRole: t.cmsRole ?? "",
      description: t.description ?? "",
    });
    setEditOpen(true);
  };

  const handleCreate = () => {
    createRole.mutate(
      {
        name: roleForm.name.trim(),
        code: roleForm.code.trim() || undefined,
        cmsRole: roleForm.cmsRole.trim() || null,
        description: roleForm.description.trim() || null,
      },
      {
        onSuccess: (data) => {
          toast.success("Role created");
          setCreateOpen(false);
          setRoleForm(emptyRoleForm());
          if (data.template?.id) setTemplateId(data.template.id);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create role"),
      },
    );
  };

  const handleUpdate = () => {
    if (!selected) return;
    updateRole.mutate(
      {
        id: selected.id,
        name: roleForm.name.trim(),
        description: roleForm.description.trim() || null,
        ...(!selected.isSystem && {
          cmsRole: roleForm.cmsRole.trim() || null,
        }),
      },
      {
        onSuccess: () => {
          toast.success("Role updated");
          setEditOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update role"),
      },
    );
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteRole.mutate(selected.id, {
      onSuccess: () => {
        toast.success("Role deleted");
        setDeleteOpen(false);
        setTemplateId(null);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete role"),
    });
  };

  const groups =
    catalog?.groups?.length
      ? catalog.groups.map((g) => ({ label: g.label, modules: g.modules }))
      : CMS_MODULE_GROUPS;
  const actions = catalog?.actions?.length ? catalog.actions : CMS_ACTIONS;

  return (
    <PermissionGate module="roles_permissions">
      <PortalPageShell>
        <div className="mb-6">
          <nav className="text-xs text-muted-foreground mb-1">Manage / Roles & permissions</nav>
          <h1 className="text-2xl font-bold tracking-tight">CMS roles & permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create permission templates, assign them on the Team form, and control module access across the platform.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="max-w-xs flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Role template</Label>
            <Select
              value={String(selected?.id ?? "")}
              onValueChange={(v) => {
                if (isDirty && !window.confirm("You have unsaved permission changes. Switch templates and discard them?")) {
                  return;
                }
                setTemplateId(Number(v));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                    {t.cmsRole ? ` · ${t.cmsRole}` : ""}
                    {t.isSystem ? " (system)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRoleForm(emptyRoleForm());
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add role
              </Button>
              {selected && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {!selected.isSystem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {selected?.description && (
          <p className="text-sm text-muted-foreground mb-4">{selected.description}</p>
        )}

        {canEdit && isDirty && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
            <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">Unsaved permission changes</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardPermissions}
              disabled={updatePerms.isPending}
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePermissions}
              disabled={updatePerms.isPending}
            >
              Save permissions
            </Button>
          </div>
        )}

        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.label}
              </h2>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-2 text-left sticky left-0 bg-muted/40 min-w-[200px]">Module</th>
                      {actions.map((a) => (
                        <th key={a} className="p-2 text-center min-w-[72px]">{CMS_ACTION_LABELS[a]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.modules.map((module) => (
                      <tr key={module} className="border-b">
                        <td className="p-2 font-medium sticky left-0 bg-background">
                          {CMS_MODULE_LABELS[module] ?? module}
                        </td>
                        {actions.map((action) => {
                          const checked = draftGranted.has(permissionKey(module, action));
                          return (
                            <td key={action} className="p-2 text-center">
                              <Checkbox
                                checked={checked}
                                disabled={!canEdit || selected?.code === "super_admin"}
                                onCheckedChange={() => toggle(module, action)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {!canEdit && (
          <p className="text-xs text-muted-foreground mt-4">You have view-only access to the permission matrix.</p>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add CMS role</DialogTitle>
            </DialogHeader>
            <RoleFormFields form={roleForm} onChange={setRoleForm} showCmsRole />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!roleForm.name.trim() || createRole.isPending}
              >
                Create role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit role</DialogTitle>
            </DialogHeader>
            <RoleFormFields
              form={roleForm}
              onChange={setRoleForm}
              showCmsRole={!selected?.isSystem}
              codeReadOnly
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdate}
                disabled={!roleForm.name.trim() || updateRole.isPending}
              >
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete role?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the &quot;{selected?.name}&quot; permission template. Users must not be assigned to it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PortalPageShell>
    </PermissionGate>
  );
}

function RoleFormFields({
  form,
  onChange,
  showCmsRole,
  codeReadOnly,
}: {
  form: RoleFormState;
  onChange: (next: RoleFormState) => void;
  showCmsRole?: boolean;
  codeReadOnly?: boolean;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="role-name">Display name</Label>
        <Input
          id="role-name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Business Development Executive"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role-code">Template code</Label>
        <Input
          id="role-code"
          value={form.code}
          readOnly={codeReadOnly}
          disabled={codeReadOnly}
          onChange={(e) => onChange({ ...form, code: e.target.value })}
          placeholder="Auto-generated from name if empty"
        />
      </div>
      {showCmsRole && (
        <div className="space-y-2">
          <Label htmlFor="role-cms">CMS login role (optional)</Label>
          <Input
            id="role-cms"
            value={form.cmsRole}
            onChange={(e) => onChange({ ...form, cmsRole: e.target.value })}
            placeholder="e.g. bde — used when assigning Team accounts"
          />
          <p className="text-xs text-muted-foreground">
            When set, this role appears in the Team form and maps users to this permission template by default.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="role-desc">Description</Label>
        <Input
          id="role-desc"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="Optional"
        />
      </div>
    </div>
  );
}
