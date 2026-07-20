import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useListUsers, getListUsersQueryKey, type User } from "@/api";
import { useHrmDepartments, useHrmShiftTemplates, useHrmDocuments } from "@/api/hrm";
import { useRoleTemplates, useAssignableCmsRoles } from "@/api/permissions";
import { useTeamEmployeeProfile, useSaveTeamEmployee } from "@/api/team-employees";
import { getAccessToken } from "@/lib/auth-storage";
import { apiUrl } from "@/lib/api-base";
import { referenceQueryOptions } from "@/lib/list-query-options";
import {
  teamEmployeeSchema,
  defaultTeamEmployeeFormValues,
  mapUserToTeamEmployeeForm,
  enrichEmployeeFormFromHrmDocuments,
  storedRoleTemplateId,
  teamEmployeeEditHydrateKey,
  EMPLOYEE_FORM_TAB_FIELDS,
  type TeamEmployeeFormValues,
  type EmployeeFormTab,
} from "@/modules/admin/employee-form-shared";
import {
  EmployeeFormTabs,
  nextEmployeeFormTab,
  prevEmployeeFormTab,
} from "@/components/admin/EmployeeFormTabs";

const BDE_ROLE = "bde";

function defaultBdeFormValues(defaultDepartmentId: number | null): TeamEmployeeFormValues {
  return { ...defaultTeamEmployeeFormValues(defaultDepartmentId), role: BDE_ROLE };
}

export function BdeTeamFormDialog({
  open,
  onOpenChange,
  editUser,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editUser: User | null;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [employeeFormTab, setEmployeeFormTab] = useState<EmployeeFormTab>("personal");
  const [previewEmployeeId, setPreviewEmployeeId] = useState("");
  const saveTeamEmployee = useSaveTeamEmployee();

  const { data: hrmDepartmentsData } = useHrmDepartments({ enabled: open });
  const { data: shiftTemplatesData } = useHrmShiftTemplates();
  const { data: roleTemplatesData } = useRoleTemplates();
  const { data: assignableRolesData } = useAssignableCmsRoles(open);
  const { data: managerPoolData } = useListUsers(
    { staff: "1", limit: 200 },
    {
      query: referenceQueryOptions({
        queryKey: getListUsersQueryKey({ staff: "1", limit: 200 }),
        enabled: open,
      }),
    },
  );

  const roleTemplateOptions = useMemo(() => roleTemplatesData?.templates ?? [], [roleTemplatesData?.templates]);
  const cmsRoleOptions = useMemo(() => assignableRolesData?.roles ?? [], [assignableRolesData?.roles]);
  const shiftTemplates = useMemo(() => shiftTemplatesData?.templates ?? [], [shiftTemplatesData?.templates]);
  const hrmDepartments = useMemo(() => hrmDepartmentsData?.departments ?? [], [hrmDepartmentsData?.departments]);
  const defaultDepartmentId = hrmDepartments[0]?.id ?? null;
  const departmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of hrmDepartments) map.set(d.id, d.name);
    return map;
  }, [hrmDepartments]);
  const managerOptions = useMemo(() => {
    const rows = (managerPoolData?.users ?? []).filter((u) => u.status === "active");
    if (!editUser) return rows;
    return rows.filter((u) => u.id !== editUser.id);
  }, [managerPoolData, editUser]);

  const form = useForm<TeamEmployeeFormValues>({
    resolver: zodResolver(teamEmployeeSchema),
    defaultValues: defaultBdeFormValues(defaultDepartmentId),
    shouldUnregister: false,
  });

  const editUserId = editUser?.id;
  const { data: editUserProfile, isFetching: editProfileFetching } = useTeamEmployeeProfile(editUserId, open && !!editUserId);
  const { data: editUserDocumentsData, isFetching: editDocumentsFetching } = useHrmDocuments(editUserId, {
    enabled: open && !!editUserId,
  });
  const lastEditHydrateKeyRef = useRef<string | null>(null);
  const createFormInitializedRef = useRef(false);
  const editBaselineRef = useRef<TeamEmployeeFormValues | null>(null);
  const [editFormSynced, setEditFormSynced] = useState(false);

  const editProfileReady =
    !editUser ||
    (editUserProfile != null && !editProfileFetching && !editDocumentsFetching && editFormSynced);

  useEffect(() => {
    if (!open) {
      lastEditHydrateKeyRef.current = null;
      createFormInitializedRef.current = false;
      editBaselineRef.current = null;
      setEditFormSynced(false);
      setEmployeeFormTab("personal");
      setPreviewEmployeeId("");
      return;
    }

    if (editUserId) {
      if (!editUserProfile || editProfileFetching || editDocumentsFetching) {
        setEditFormSynced(false);
        return;
      }
      const libraryDocs = editUserDocumentsData?.documents ?? [];
      const hydrateKey = JSON.stringify({
        profile: teamEmployeeEditHydrateKey(
          editUserProfile as User & Record<string, unknown>,
          defaultDepartmentId,
          hrmDepartments,
        ),
        docs: libraryDocs.map((d) => `${d.category ?? ""}:${d.fileUrl ?? ""}`).join("|"),
      });
      if (lastEditHydrateKeyRef.current === hydrateKey) return;
      lastEditHydrateKeyRef.current = hydrateKey;
      const mapped = enrichEmployeeFormFromHrmDocuments(
        mapUserToTeamEmployeeForm(
          editUserProfile as User & Record<string, unknown>,
          defaultDepartmentId,
          hrmDepartments,
          cmsRoleOptions,
          roleTemplateOptions,
        ),
        libraryDocs,
      );
      mapped.role = BDE_ROLE;
      editBaselineRef.current = {
        ...mapped,
        roleTemplateId: storedRoleTemplateId(editUserProfile as User & Record<string, unknown>),
      };
      form.reset(mapped, { keepDirty: false, keepDefaultValues: false });
      setPreviewEmployeeId(String(editUserProfile.employeeId ?? editUser?.employeeId ?? ""));
      setEditFormSynced(true);
      return;
    }

    setEditFormSynced(true);
    if (createFormInitializedRef.current) return;
    createFormInitializedRef.current = true;
    form.reset(defaultBdeFormValues(defaultDepartmentId), {
      keepDirty: false,
      keepDefaultValues: false,
    });
  }, [
    open,
    editUserId,
    editUserProfile,
    editProfileFetching,
    editDocumentsFetching,
    editUserDocumentsData?.documents,
    defaultDepartmentId,
    hrmDepartments,
    cmsRoleOptions,
    roleTemplateOptions,
    editUser?.employeeId,
    form,
  ]);

  const watchedName = form.watch("name");
  useEffect(() => {
    if (!open || editUser) return;
    const name = watchedName?.trim();
    if (!name) {
      setPreviewEmployeeId("");
      return;
    }
    const token = getAccessToken();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/users/preview-employee-id?name=${encodeURIComponent(name)}`),
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (res.ok) {
          const body = (await res.json()) as { employeeId?: string };
          setPreviewEmployeeId(body.employeeId ?? "");
        }
      } catch {
        setPreviewEmployeeId("");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [watchedName, editUser, open]);

  const syncDisplayNameFromParts = () => {
    const fn = form.getValues("firstName")?.trim() ?? "";
    const ln = form.getValues("lastName")?.trim() ?? "";
    const combined = `${fn} ${ln}`.trim();
    if (combined) {
      form.setValue("name", combined, { shouldValidate: false, shouldDirty: true });
    }
  };

  const onSubmit = async (values: TeamEmployeeFormValues) => {
    const payload = { ...values, role: values.role || BDE_ROLE };
    try {
      if (editUser) {
        const baseline = editBaselineRef.current;
        if (!baseline) {
          toast.error("Profile is still loading. Please try again.");
          return;
        }
        await saveTeamEmployee.mutateAsync({
          id: editUser.id,
          values: payload,
          departmentNameById,
          password: payload.password?.trim() || undefined,
          baseline,
        });
        toast.success(payload.password?.trim() ? "Team member and password updated" : "Team member updated");
      } else {
        const result = await saveTeamEmployee.mutateAsync({
          values: payload,
          departmentNameById,
          password: payload.password?.trim() || undefined,
        });
        toast.success(`Team member created — ID: ${result.employeeId ?? "assigned"}`);
      }
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["sales-team"] });
      onSaved?.();
    } catch {
      // Error handled by useSaveTeamEmployee toast
    }
  };

  const onInvalid = (errors: FieldErrors<TeamEmployeeFormValues>) => {
    const firstKey = Object.keys(errors)[0] as keyof TeamEmployeeFormValues;
    if (firstKey) {
      for (const [tab, fields] of Object.entries(EMPLOYEE_FORM_TAB_FIELDS)) {
        if (fields.includes(firstKey)) {
          setEmployeeFormTab(tab as EmployeeFormTab);
          break;
        }
      }
      const msg = errors[firstKey]?.message as string;
      toast.error(msg || `Validation issue on field: ${firstKey}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{editUser ? "Edit BDE member" : "Add BDE member"}</DialogTitle>
          <DialogDescription>
            {editUser
              ? "Update profile and access for this business development executive."
              : "Create a new BDE account with the standard employee profile fields."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!editProfileReady ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading profile…
                </div>
              ) : (
                <EmployeeFormTabs
                  key={editUser ? `edit-${editUser.id}` : "create"}
                  form={form}
                  tab={employeeFormTab}
                  onTabChange={setEmployeeFormTab}
                  editUser={editUser}
                  previewEmployeeId={previewEmployeeId}
                  roleTemplateOptions={roleTemplateOptions}
                  cmsRoleOptions={cmsRoleOptions}
                  hrmDepartments={hrmDepartments}
                  managerOptions={managerOptions}
                  shiftTemplates={shiftTemplates}
                  onSyncDisplayName={syncDisplayNameFromParts}
                  employeeDocuments={editUserDocumentsData?.documents}
                  employeeDocumentsLoading={editDocumentsFetching}
                />
              )}
            </div>
            <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2 sm:gap-2">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={employeeFormTab === "personal"}
                    onClick={() => {
                      const prev = prevEmployeeFormTab(employeeFormTab);
                      if (prev) setEmployeeFormTab(prev);
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={employeeFormTab === "documents"}
                    onClick={() => {
                      const next = nextEmployeeFormTab(employeeFormTab);
                      if (next) setEmployeeFormTab(next);
                    }}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saveTeamEmployee.isPending || !editProfileReady}>
                    {saveTeamEmployee.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        Saving…
                      </>
                    ) : editUser ? (
                      "Save changes"
                    ) : (
                      "Create BDE"
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
