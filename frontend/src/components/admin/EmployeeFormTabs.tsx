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
import { PhoneInput } from "@/components/ui/phone-input";
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
import { PortalTabsList, PortalTabsTrigger } from "@/components/layout/portal-page-kit";
import type { User } from "@/api";
import {
  applyFreelancerTeamFormDefaults,
  computeTeamEmployeeNetSalary,
  formatTeamEmployeeNetSalaryField,
  isFreelancerTeamFormRole,
  type TeamEmployeeFormValues,
  type EmployeeFormTab,
} from "@/modules/admin/employee-form-shared";
import {
  EMPLOYEE_BLOOD_GROUPS,
  EMPLOYEE_GENDERS,
  EMPLOYEE_MARITAL_STATUSES,
  EMPLOYEE_POSITIONS,
  EMPLOYEE_TYPES,
  HR_EMPLOYMENT_STATUSES,
} from "@/modules/hrm/employee-profile-types";
import { LEGACY_EMPLOYEE_LABELS as L } from "@/modules/hrm/hrm-legacy-labels";
import type { HrmEmployeeDocument } from "@/modules/hrm/types";
import {
  FormFieldHint,
  FormRow,
  FormSection,
  NativeSelect,
  employeeFormInputClass,
  employeeFormSelectTriggerClass,
} from "./employee-form-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DIGITAL_EMPLOYEE_SPECIALTIES } from "@/lib/digital-specialties";

type Dept = { id: number; name: string };
type Manager = { id: number; name: string; designation?: string | null };
type RoleTemplate = { id: number; name: string };
type CmsRoleOption = { value: string; label: string };
type ShiftTemplate = { id: number; name: string };

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

function SalaryNetField({ form }: { form: UseFormReturn<TeamEmployeeFormValues> }) {
  const basic = form.watch("salaryBasic");
  const allowances = form.watch("salaryAllowances");
  const deductions = form.watch("salaryDeductions");
  const netDisplay = formatTeamEmployeeNetSalaryField(basic, allowances, deductions);

  return (
    <div className="space-y-2">
      <Label>{L.netSalary}</Label>
      <Input
        className={`${employeeFormInputClass} bg-muted/40`}
        type="number"
        min={0}
        placeholder="0"
        readOnly
        tabIndex={-1}
        value={netDisplay}
        aria-readonly
      />
      <p className="text-[0.8rem] text-muted-foreground">
        Calculated as basic salary + allowances − deductions.
      </p>
    </div>
  );
}

function PayrollStructureConflictHint({
  form,
  payrollStructure,
}: {
  form: UseFormReturn<TeamEmployeeFormValues>;
  payrollStructure?: { basic: number; net: number } | null;
}) {
  const salaryBasic = form.watch("salaryBasic");
  const salaryAllowances = form.watch("salaryAllowances");
  const salaryDeductions = form.watch("salaryDeductions");
  if (!payrollStructure || payrollStructure.basic <= 0) return null;

  const basic = Number(salaryBasic) || 0;
  const net = computeTeamEmployeeNetSalary(salaryBasic, salaryAllowances, salaryDeductions);
  if (Math.abs(basic - payrollStructure.basic) < 1 && Math.abs(net - payrollStructure.net) < 1) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      Payroll structure on file differs (structure net ₹{payrollStructure.net.toLocaleString("en-IN")}).
      When basic salary is set here, the team profile is used for payroll runs.
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
  employeeDocuments,
  employeeDocumentsLoading,
  payrollStructure,
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
  employeeDocuments?: HrmEmployeeDocument[];
  employeeDocumentsLoading?: boolean;
  payrollStructure?: { basic: number; net: number } | null;
}) {
  const watchedRole = form.watch("role");
  const effectiveRole = lockRole ?? watchedRole;
  const isFreelancer = isFreelancerTeamFormRole(effectiveRole);
  const isDigitalRole = effectiveRole === "digital";

  const copyPermanentToCurrent = () => {
    const permanent = form.getValues("permanentAddress");
    form.setValue("currentAddress", { ...permanent }, { shouldDirty: true });
  };

  const tabOrder = EMPLOYEE_FORM_TAB_ORDER;
  const tabColsClass =
    tabOrder.length >= 5 ? "grid-cols-5" : `grid-cols-${tabOrder.length}`;

  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as EmployeeFormTab)} className="w-full space-y-4">
      <PortalTabsList className={`grid w-full ${tabColsClass}`}>
        {tabOrder.map((key) => {
          const meta = EMPLOYEE_FORM_TAB_META[key];
          const Icon = meta.icon;
          const label =
            isFreelancer && key === "compensation"
              ? "Bank"
              : isFreelancer && key === "work"
                ? "Access"
                : meta.shortLabel;
          return (
            <PortalTabsTrigger key={key} value={key} className="gap-1.5 px-2 sm:px-3">
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{meta.step}</span>
            </PortalTabsTrigger>
          );
        })}
      </PortalTabsList>

      {isFreelancer ? (
        <Alert className="border-blue-500/30 bg-blue-500/5 text-foreground">
          <AlertDescription className="text-xs leading-relaxed">
            Freelancer profile — only account, contact, bank, and documents are needed.
            Project fees are set when you assign them to a project (not monthly payroll).
          </AlertDescription>
        </Alert>
      ) : null}

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
                  <Input className={employeeFormInputClass} placeholder="john@company.com" type="email" autoComplete="email" {...field} />
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
                    <PhoneInput className={employeeFormInputClass} {...field} />
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
                  <FormLabel>{isFreelancer ? "Start date" : L.joiningDate}</FormLabel>
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
                  <FormControl>
                    <NativeSelect
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Select blood group"
                      options={[
                        { value: "", label: "Not set" },
                        ...EMPLOYEE_BLOOD_GROUPS.filter(Boolean).map((bg) => ({ value: bg, label: bg })),
                      ]}
                    />
                  </FormControl>
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
                  <FormControl>
                    <NativeSelect
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Select gender"
                      options={[
                        { value: "", label: "Not set" },
                        ...EMPLOYEE_GENDERS.map((g) => ({ value: g, label: g })),
                      ]}
                    />
                  </FormControl>
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
                  <FormControl>
                    <NativeSelect
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Select status"
                      options={[
                        { value: "", label: "Not set" },
                        ...EMPLOYEE_MARITAL_STATUSES.map((s) => ({ value: s, label: s })),
                      ]}
                    />
                  </FormControl>
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
          <FormField
            control={form.control}
            name="githubId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{L.githubId}</FormLabel>
                <FormControl>
                  <Input
                    className={employeeFormInputClass}
                    placeholder="octocat or https://github.com/octocat"
                    {...field}
                  />
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
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value ?? "developer"}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          field.onChange(nextRole);
                          form.setValue("roleTemplateId", null, { shouldDirty: true });
                          if (isFreelancerTeamFormRole(nextRole)) {
                            applyFreelancerTeamFormDefaults(form.setValue);
                          }
                        }}
                        options={cmsRoleOptions.map((r) => ({ value: r.value, label: r.label }))}
                      />
                    </FormControl>
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
                  <FormControl>
                    <NativeSelect
                      {...field}
                      value={field.value != null ? String(field.value) : ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      options={[
                        { value: "", label: "Default for role" },
                        ...roleTemplateOptions.map((t) => ({ value: String(t.id), label: t.name })),
                      ]}
                    />
                  </FormControl>
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
                  <FormControl>
                    <NativeSelect
                      {...field}
                      value={field.value ?? "active"}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" },
                      ]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </FormSection>

        <Separator />

        <FormSection
          title={isFreelancer ? "Profile" : "Employment"}
          description={
            isFreelancer
              ? "Optional title shown on their freelancer profile."
              : undefined
          }
        >
          {!isFreelancer ? (
            <FormRow>
              <FormField
                control={form.control}
                name="employeeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.employmentType}</FormLabel>
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value ?? "FULL-TIME"}
                        options={EMPLOYEE_TYPES.map((t) => ({ value: t, label: t.replace("-", " ") }))}
                      />
                    </FormControl>
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
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value ?? "Active"}
                        options={HR_EMPLOYMENT_STATUSES.map((s) => ({ value: s, label: s }))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormRow>
          ) : null}
          <FormRow>
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isFreelancer ? "Title / specialty" : L.designation}</FormLabel>
                  <FormControl>
                    <Input
                      className={employeeFormInputClass}
                      placeholder={isFreelancer ? "e.g. React Developer" : "Senior Developer"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isFreelancer ? (
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.position}</FormLabel>
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value ?? "EMPLOYEE"}
                        options={EMPLOYEE_POSITIONS.map((p) => ({ value: p, label: p.replace(/_/g, " ") }))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : isDigitalRole ? (
              <FormField
                control={form.control}
                name="subType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Digital specialty</FormLabel>
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Select specialty"
                        options={[
                          { value: "", label: "Not set (defaults to Designer access)" },
                          ...DIGITAL_EMPLOYEE_SPECIALTIES.map((s) => ({ value: s, label: s })),
                          ...(field.value &&
                          !(DIGITAL_EMPLOYEE_SPECIALTIES as readonly string[]).includes(field.value)
                            ? [{ value: field.value, label: `${field.value} (custom)` }]
                            : []),
                        ]}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Account Manager unlocks Ads, Reports, and portfolio admin views in Digital.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="subType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills / focus</FormLabel>
                    <FormControl>
                      <Input className={employeeFormInputClass} placeholder="e.g. Mobile, Backend" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </FormRow>
          {!isFreelancer ? (
            <>
              {isDigitalRole ? null : (
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
              )}
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
            </>
          ) : null}
        </FormSection>

        {!isFreelancer ? (
          <>
            <Separator />

            <FormSection title="Organization">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.department}</FormLabel>
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value != null ? String(field.value) : ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                        options={[
                          { value: "", label: "Unassigned" },
                          ...hrmDepartments.map((d) => ({ value: String(d.id), label: d.name })),
                        ]}
                      />
                    </FormControl>
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
                      <FormControl>
                        <NativeSelect
                          {...field}
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          options={[
                            { value: "", label: "None" },
                            ...managerOptions.map((m) => ({
                              value: String(m.id),
                              label: m.designation ? `${m.name} · ${m.designation}` : m.name,
                            })),
                          ]}
                        />
                      </FormControl>
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
                      <FormControl>
                        <NativeSelect
                          {...field}
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          options={[
                            { value: "", label: "None" },
                            ...managerOptions.map((m) => ({ value: String(m.id), label: m.name })),
                          ]}
                        />
                      </FormControl>
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
                    <FormControl>
                      <NativeSelect
                        {...field}
                        value={field.value != null ? String(field.value) : ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                        options={[
                          { value: "", label: "Company default" },
                          ...shiftTemplates.map((s) => ({ value: String(s.id), label: s.name })),
                        ]}
                      />
                    </FormControl>
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
          </>
        ) : null}
      </TabsContent>

      <TabsContent forceMount value="compensation" className="mt-0 space-y-5 focus-visible:outline-none data-[state=inactive]:hidden">
        {!isFreelancer ? (
          <>
            <PayrollStructureConflictHint form={form} payrollStructure={payrollStructure} />
            <FormSection title="Compensation" description="Monthly net salary used for payroll (basic must be greater than 0).">
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
                <SalaryNetField form={form} />
              </FormRow>
            </FormSection>

            <Separator />
          </>
        ) : null}

        <FormSection
          title="Bank account"
          description={
            isFreelancer
              ? "Used for project fee payouts. Monthly salary fields are not used for freelancers."
              : undefined
          }
        >
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
                        key={`${name}-${field.value || "empty"}`}
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
              key={editUser.id}
              userId={editUser.id}
              canUpload
              canDelete
              fetchEnabled
              documents={employeeDocuments}
              documentsLoading={employeeDocumentsLoading}
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
