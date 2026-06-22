import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { PermissionGate } from "@/modules/permissions/PermissionGate";
import { usePermission } from "@/modules/permissions/usePermission";
import {
  usePermissionCatalog,
  useRoleTemplates,
  useUpdateRoleTemplatePermissions,
} from "@/api/permissions";
import {
  CMS_ACTION_LABELS,
  CMS_MODULE_LABELS,
  type CmsAction,
} from "@/modules/permissions/constants";

export default function RolesPermissionsPage() {
  const canEdit = usePermission("roles_permissions", "edit");
  const { data: catalog } = usePermissionCatalog();
  const { data: rolesData } = useRoleTemplates();
  const updatePerms = useUpdateRoleTemplatePermissions();
  const [templateId, setTemplateId] = useState<number | null>(null);

  const selected = useMemo(
    () => rolesData?.templates.find((t) => t.id === templateId) ?? rolesData?.templates[0],
    [rolesData, templateId],
  );

  const granted = useMemo(() => {
    const set = new Set<string>();
    for (const p of selected?.permissions ?? []) set.add(`${p.module}:${p.action}`);
    return set;
  }, [selected]);

  const toggle = (module: string, action: CmsAction) => {
    if (!selected || !canEdit) return;
    const key = `${module}:${action}`;
    const next = new Set(granted);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const permissions = [...next].map((k) => {
      const [m, a] = k.split(":");
      return { module: m, action: a as CmsAction };
    });
    updatePerms.mutate(
      { id: selected.id, permissions },
      {
        onSuccess: () => toast.success("Permissions saved"),
        onError: () => toast.error("Failed to save permissions"),
      },
    );
  };

  const groups = catalog?.groups ?? [];
  const actions = catalog?.actions ?? [];

  return (
    <PermissionGate module="roles_permissions">
      <PortalPageShell>
        <div className="mb-6">
          <nav className="text-xs text-muted-foreground mb-1">Manage / Roles & permissions</nav>
          <h1 className="text-2xl font-bold tracking-tight">CMS roles & permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control access across Manage, Monitoring, Sales, Legal, Finance, CA, Delivery, Client, and HRM modules.
          </p>
        </div>

        <div className="mb-4 max-w-xs">
          <Select
            value={String(selected?.id ?? "")}
            onValueChange={(v) => setTemplateId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role template" />
            </SelectTrigger>
            <SelectContent>
              {(rolesData?.templates ?? []).map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name} {t.isSystem ? "(system)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                          const checked = granted.has(`${module}:${action}`);
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
      </PortalPageShell>
    </PermissionGate>
  );
}
