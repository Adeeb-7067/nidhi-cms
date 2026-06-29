import type { UseFormReturn } from "react-hook-form";
import {
  Briefcase,
  Copy,
  FileText,
  Home,
  IndianRupee,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FileUploader } from "@/components/ui/file-uploader";
import { EmployeeDocumentsPanel } from "@/modules/hrm/EmployeeDocumentsPanel";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalTabsList, PortalTabsTrigger } from "@/components/layout/portal-page-kit";
import type { User } from "@/api";
import type { TeamEmployeeFormValues } from "@/modules/admin/employee-form-shared";
import {
  EMPLOYEE_BLOOD_GROUPS,
  EMPLOYEE_GENDERS,
  EMPLOYEE_MARITAL_STATUSES,
  EMPLOYEE_POSITIONS,
  EMPLOYEE_TYPES,
  HR_EMPLOYMENT_STATUSES,
} from "@/modules/hrm/employee-profile-types";
import { LEGACY_EMPLOYEE_LABELS as L } from "@/modules/hrm/hrm-legacy-labels";
import {
  FormFieldHint,
  FormRow,
  FormSection,
  employeeFormInputClass,
  employeeFormSelectTriggerClass,
} from "./employee-form-ui";

type Dept = { id: number; name: string };
type Manager = { id: number; name: string; designation?: string | null };
type RoleTemplate = { id: number; name: string };
type CmsRoleOption = { value: string; label: string };
type ShiftTemplate = { id: number; name: string };

export type EmployeeFormTab = "personal" | "address" | "work" | "compensation" | "documents";

export const EMPLOYEE_FORM_TAB_ORDER: EmployeeFormTab[] = [
  "personal",
  "address",
  "work",
  "compensation",
  "documents",
];

export const EMPLOYEE_FORM_TAB_META: Record<
  EmployeeFormTab,
  { label: string; shortLabel: string; step: number; icon: typeof UserRound }
> = {
  personal: { label: "Personal details", shortLabel: "Personal", step: 1, icon: UserRound },
  address: { label: "Address", shortLabel: "Address", step: 2, icon: Home },
  work: { label: "Work & HRM", shortLabel: "Work", step: 3, icon: Briefcase },
  compensation: { label: "Compensation", shortLabel: "Pay", step: 4, icon: IndianRupee },
  documents: { label: "Documents", shortLabel: "Docs", step: 5, icon: FileText },
};

function AddressBlock({
  form,
  prefix,
  title,
  description,
}: {
  form: UseFormReturn<TeamEmployeeFormValues>;
  prefix: "permanentAddress" | "currentAddress";
  title: string;
  description?: string;
}) {
  const fields = [
    { name: `${prefix}.street` as const, label: L.street, placeholder: "123 Main St" },
    { name: `${prefix}.city` as const, label: L.city, placeholder: "City" },
    { name: `${prefix}.state` as const, label: L.state, placeholder: "State" },
    { name: `${prefix}.country` as const, label: L.country, placeholder: "Country" },
    { name: `${prefix}.zipCode` as const, label: L.zipCode, placeholder: "110001" },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p> : null}
      </div>
      <FormRow>
        <FormField
          control={form.control}
          name={`${prefix}.street`}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{fields[0].label}</FormLabel>
              <FormControl>
                <Input className={employeeFormInputClass} placeholder={fields[0].placeholder} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {fields.slice(1).map((f) => (
          <FormField
            key={f.name}
            control={form.control}
            name={f.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{f.label}</FormLabel>
                <FormControl>
                  <Input className={employeeFormInputClass} placeholder={f.placeholder} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </FormRow>
    </div>
  );
}

export function EmployeeFormTabs({
  form,
  tab,
  onTabChange,
  editUser,
  previewEmployeeId,
  roleTemplateOptions,
  cmsRoleOptions,
  hrmDepartments,
  managerOptions,
  shiftTemplates,
  lockRole,
  onSyncDisplayName,
}: {
  form: UseFormReturn<TeamEmployeeFormValues>;
  tab: EmployeeFormTab;
  onTabChange: (tab: EmployeeFormTab) => void;
  editUser: User | null;
  previewEmployeeId: string;
  roleTemplateOptions: RoleTemplate[];
  cmsRoleOptions: CmsRoleOption[];
  hrmDepartments: Dept[];
  managerOptions: Manager[];
  shiftTemplates: ShiftTemplate[];
  lockRole?: string;
  onSyncDisplayName?: () => void;
}) {
  const copyPermanentToCurrent = () => {
    const permanent = form.getValues("permanentAddress");
    form.setValue("currentAddress", { ...permanent }, { shouldDirty: true });
  };

  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as EmployeeFormTab)} className="w-full space-y-4">
      <PortalTabsList className="grid w-full grid-cols-5">
        {EMPLOYEE_FORM_TAB_ORDER.map((key) => {
          const meta = EMPLOYEE_FORM_TAB_META[key];
          const Icon = meta.icon;
          return (
            <PortalTabsTrigger key={key} value={key} className="gap-1.5 px-2 sm:px-3">
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="hidden sm:inline">{meta.shortLabel}</span>
              <span className="sm:hidden">{meta.step}</span>
            </PortalTabsTrigger>
          );
        })}
      </PortalTabsList>

      <TabsContent forceMount value="personal" className="mt-0 space-y-5 focus-visible:outline-none data-[state=inactive]:hidden">
        <FormSection title="Identity" description="Legal name and employee identifier used across HRM.">
          <FormRow>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.firstName}</FormLabel>
                  <FormControl>
                    <Input
                      className={employeeFormInputClass}
                      placeholder="John"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        onSyncDisplayName?.();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.lastName}</FormLabel>
                  <FormControl>
                    <Input
                      className={employeeFormInputClass}
                      placeholder="Doe"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        onSyncDisplayName?.();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input className={employeeFormInputClass} placeholder="John Doe" {...field} />
                </FormControl>
                <FormDescription>Shown in the portal and HRM. Auto-filled from first and last name.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <Label htmlFor="employee-id-preview">Employee ID</Label>
            <Input
              id="employee-id-preview"
              readOnly
              value={editUser ? editUser.employeeId ?? "—" : previewEmployeeId || "Preview after name is entered"}
              className={`${employeeFormInputClass} bg-muted/40 font-mono`}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              {editUser ? "Permanent identifier for this employee." : "Generated automatically when you save."}
            </p>
          </div>
        </FormSection>

        <Separator />

        <FormSection title="Login & contact" description="Credentials and primary contact details.">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{L.email}</FormLabel>
                <FormControl>
                  <Input className={employeeFormInputClass} placeholder="john@company.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{editUser ? L.newPassword : L.password}</FormLabel>
                <FormControl>
                  <PasswordInput
                    className={employeeFormInputClass}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {editUser ? "Leave blank to keep the current password." : "Optional — leave blank to set later."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormRow>
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.phone}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} placeholder="+91 98765 43210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joiningDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.joiningDate}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
        </FormSection>

        <Separator />

        <FormSection title="Personal information">
          <FormRow>
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.dob}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bloodGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.bloodGroup}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    value={field.value ? field.value : "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Not set</SelectItem>
                      {EMPLOYEE_BLOOD_GROUPS.filter(Boolean).map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormRow>
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.gender}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    value={field.value ? field.value : "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Not set</SelectItem>
                      {EMPLOYEE_GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.maritalStatus}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    value={field.value ? field.value : "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Not set</SelectItem>
                      {EMPLOYEE_MARITAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormRow>
            <FormField
              control={form.control}
              name="aadharNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.adharNumber}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} inputMode="numeric" placeholder="12-digit Aadhar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="panNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.panNumber}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} placeholder="ABCDE1234F" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{L.bio}</FormLabel>
                <FormControl>
                  <Textarea rows={3} className="text-sm resize-none" placeholder="Short professional summary" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <Separator />

        <FormSection title="Social profiles" description="Optional links shown on the employee profile.">
          <FormField
            control={form.control}
            name="linkedinUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{L.linkedin}</FormLabel>
                <FormControl>
                  <Input className={employeeFormInputClass} placeholder="https://linkedin.com/in/username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormRow>
            <FormField
              control={form.control}
              name="socialTwitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter / X</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} placeholder="@handle or URL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socialWebsite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
        </FormSection>
      </TabsContent>

      <TabsContent forceMount value="address" className="mt-0 space-y-4 focus-visible:outline-none data-[state=inactive]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FormFieldHint>Permanent and current residence for HR records.</FormFieldHint>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={copyPermanentToCurrent}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy permanent → current
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AddressBlock
            form={form}
            prefix="permanentAddress"
            title={L.permanentAddress}
            description="As per government ID."
          />
          <AddressBlock
            form={form}
            prefix="currentAddress"
            title={L.currentAddress}
            description="Where the employee currently lives."
          />
        </div>
      </TabsContent>

      <TabsContent forceMount value="work" className="mt-0 space-y-5 focus-visible:outline-none data-[state=inactive]:hidden">
        <FormSection title="Role & access">
          <FormRow>
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CMS role</FormLabel>
                  {lockRole ? (
                    <FormControl>
                      <Input
                        className={employeeFormInputClass}
                        readOnly
                        disabled
                        value={cmsRoleOptions.find((r) => r.value === lockRole)?.label ?? lockRole.toUpperCase()}
                      />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={employeeFormSelectTriggerClass}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cmsRoleOptions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission template</FormLabel>
                  <Select
                    key={`role-template-${field.value ?? "default"}-${roleTemplateOptions.map((t) => t.id).join(",")}`}
                    onValueChange={(v) => field.onChange(v === "default" ? null : Number(v))}
                    value={field.value != null && field.value !== "" ? String(field.value) : "default"}
                  >
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue placeholder="Default for role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="default">Default for role</SelectItem>
                      {roleTemplateOptions.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          {editUser ? (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Account status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </FormSection>

        <Separator />

        <FormSection title="Employment">
          <FormRow>
            <FormField
              control={form.control}
              name="employeeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.employmentType}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "FULL-TIME"}>
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYEE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hrEmploymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HR status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "Active"}>
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HR_EMPLOYMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormRow>
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.designation}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} placeholder="Senior Developer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.position}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "EMPLOYEE"}>
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYEE_POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormField
            control={form.control}
            name="subType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team / specialty</FormLabel>
                <FormControl>
                  <Input className={employeeFormInputClass} placeholder="e.g. Mobile, Backend" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormRow>
            <FormField
              control={form.control}
              name="exitDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.exitDate}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probationEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.probationEndDate}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
        </FormSection>

        <Separator />

        <FormSection title="Organization">
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{L.department}</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                  value={field.value != null ? String(field.value) : "none"}
                >
                  <FormControl>
                    <SelectTrigger className={employeeFormSelectTriggerClass}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {hrmDepartments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hrmDepartments.length === 0 ? (
                  <FormDescription className="text-amber-700">
                    Add departments under HRM → Departments first.
                  </FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormRow>
            <FormField
              control={form.control}
              name="reportingManagerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.reportingManager}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                    value={field.value != null ? String(field.value) : "none"}
                  >
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {managerOptions.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                          {m.designation ? ` · ${m.designation}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teamleaderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.teamLeader}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                    value={field.value != null ? String(field.value) : "none"}
                  >
                    <FormControl>
                      <SelectTrigger className={employeeFormSelectTriggerClass}>
                        <SelectValue placeholder="Select team leader" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {managerOptions.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormField
            control={form.control}
            name="shiftId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{L.shiftTemplate}</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                  value={field.value != null ? String(field.value) : "none"}
                >
                  <FormControl>
                    <SelectTrigger className={employeeFormSelectTriggerClass}>
                      <SelectValue placeholder="Company default" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Company default</SelectItem>
                    {shiftTemplates.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <Separator />

        <FormSection title="HRM policies" description="Overrides for leave, WFH, and attendance rules.">
          <FormRow>
            <FormField
              control={form.control}
              name="wfhMonthlyLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.maxWfhDaysPerMonth}</FormLabel>
                  <FormControl>
                    <Input
                      className={employeeFormInputClass}
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leaveAccrualDaysPerMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.paidLeaveDaysPerMonth}</FormLabel>
                  <FormControl>
                    <Input
                      className={employeeFormInputClass}
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="Company default"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Leave blank to use company HRM default.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormField
            control={form.control}
            name="lateChargePercentage"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>{L.lateDeductionRate}</FormLabel>
                <FormControl>
                  <Input
                    className={employeeFormInputClass}
                    type="number"
                    min={0}
                    max={100}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Percentage applied for late attendance.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>
      </TabsContent>

      <TabsContent forceMount value="compensation" className="mt-0 space-y-5 focus-visible:outline-none data-[state=inactive]:hidden">
        <FormSection title="Salary structure" description="Reference amounts for HR and payroll.">
          <FormRow>
            <FormField
              control={form.control}
              name="salaryBasic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.basicSalary}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryAllowances"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.allowances}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
          <FormRow>
            <FormField
              control={form.control}
              name="salaryDeductions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.deductions}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryNet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.netSalary}</FormLabel>
                  <FormControl>
                    <Input className={employeeFormInputClass} type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormRow>
        </FormSection>

        <Separator />

        <FormSection title="Bank account">
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
            <FormRow>
              {(
                [
                  ["bankAccountHolder", L.accountHolderName],
                  ["bankAccountNumber", L.accountNumber],
                  ["bankName", L.bankName],
                  ["bankBranch", L.branchName],
                  ["bankIfsc", L.ifsc],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className={name === "bankAccountHolder" ? "sm:col-span-2" : undefined}>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input className={employeeFormInputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </FormRow>
          </div>
        </FormSection>
      </TabsContent>

      <TabsContent forceMount value="documents" className="mt-0 space-y-5 focus-visible:outline-none data-[state=inactive]:hidden">
        <FormSection title="Documents" description="Upload resume and identity documents (PDF or image).">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["resumeUrl", "Resume"],
                ["idProofUrl", "ID proof"],
                ["addressProofUrl", "Address proof"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className={name === "addressProofUrl" ? "sm:col-span-2" : undefined}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <FileUploader
                        variant="choose-file"
                        category="hrm"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        value={field.value ?? ""}
                        maxSizeMB={10}
                        onUploadComplete={(url) => field.onChange(url)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          {editUser?.id ? (
            <EmployeeDocumentsPanel
              userId={editUser.id}
              canUpload
              canDelete
              fetchEnabled={tab === "documents"}
              className="mt-4"
            />
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Save the employee first to upload additional documents to the document center.
            </p>
          )}
        </FormSection>
      </TabsContent>
    </Tabs>
  );
}

export function nextEmployeeFormTab(tab: EmployeeFormTab): EmployeeFormTab | null {
  const idx = EMPLOYEE_FORM_TAB_ORDER.indexOf(tab);
  return idx >= 0 && idx < EMPLOYEE_FORM_TAB_ORDER.length - 1 ? EMPLOYEE_FORM_TAB_ORDER[idx + 1] : null;
}

export function prevEmployeeFormTab(tab: EmployeeFormTab): EmployeeFormTab | null {
  const idx = EMPLOYEE_FORM_TAB_ORDER.indexOf(tab);
  return idx > 0 ? EMPLOYEE_FORM_TAB_ORDER[idx - 1] : null;
}
