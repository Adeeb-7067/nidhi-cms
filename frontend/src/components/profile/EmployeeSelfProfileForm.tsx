import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
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
import { FileUploader } from "@/components/ui/file-uploader";
import { EmployeeDocumentsPanel } from "@/modules/hrm/EmployeeDocumentsPanel";
import { Separator } from "@/components/ui/separator";
import {
  EMPLOYEE_BLOOD_GROUPS,
  EMPLOYEE_GENDERS,
  EMPLOYEE_MARITAL_STATUSES,
} from "@/modules/hrm/employee-profile-types";
import { LEGACY_EMPLOYEE_LABELS as L } from "@/modules/hrm/hrm-legacy-labels";
import {
  buildSelfProfilePayload,
  mapUserToSelfProfileForm,
  selfProfileHydrateKey,
  selfProfileSchema,
  type SelfProfileFormValues,
} from "@/modules/hrm/self-profile-shared";

type Props = {
  user: Record<string, unknown>;
  /** Bumped after a successful save so the form reloads server values once. */
  syncVersion: number;
  saving: boolean;
  onSave: (payload: ReturnType<typeof buildSelfProfilePayload>) => Promise<void>;
};

const NONE = "__none__";

function AddressFields({
  form,
  prefix,
  title,
}: {
  form: ReturnType<typeof useForm<SelfProfileFormValues>>;
  prefix: "permanentAddress" | "currentAddress";
  title: string;
}) {
  const fields = [
    { name: `${prefix}.street` as const, label: L.street, span: 2 },
    { name: `${prefix}.city` as const, label: L.city },
    { name: `${prefix}.state` as const, label: L.state },
    { name: `${prefix}.country` as const, label: L.country },
    { name: `${prefix}.zipCode` as const, label: L.zipCode },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <FormField
            key={f.name}
            control={form.control}
            name={f.name}
            render={({ field }) => (
              <FormItem className={f.span === 2 ? "sm:col-span-2" : undefined}>
                <FormLabel>{f.label}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function EmployeeSelfProfileForm({ user, syncVersion, saving, onSave }: Props) {
  const hydrateKey = selfProfileHydrateKey(user);

  const form = useForm<SelfProfileFormValues>({
    resolver: zodResolver(selfProfileSchema),
    defaultValues: mapUserToSelfProfileForm(user),
    shouldUnregister: false,
  });

  // Hydrate when full employee record loads or after a successful save.
  useEffect(() => {
    form.reset(mapUserToSelfProfileForm(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when server snapshot changes
  }, [hydrateKey, syncVersion]);

  const syncDisplayName = () => {
    const { firstName, lastName } = form.getValues();
    const combined = `${firstName?.trim() ?? ""} ${lastName?.trim() ?? ""}`.trim();
    if (combined) form.setValue("name", combined, { shouldDirty: true });
  };

  const copyPermanentToCurrent = () => {
    const permanent = form.getValues("permanentAddress");
    form.setValue("currentAddress", { ...permanent }, { shouldDirty: true });
  };

  const [profileTab, setProfileTab] = useState("personal");

  const handleSubmit = form.handleSubmit(async () => {
    await onSave(buildSelfProfilePayload(form.getValues()));
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Tabs value={profileTab} onValueChange={setProfileTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="bank">Bank & docs</TabsTrigger>
          </TabsList>

          <TabsContent forceMount value="personal" className="space-y-4 pt-2 data-[state=inactive]:hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.firstName}</FormLabel>
                    <FormControl>
                      <Input {...field} onBlur={() => { field.onBlur(); syncDisplayName(); }} />
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
                      <Input {...field} onBlur={() => { field.onBlur(); syncDisplayName(); }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.email}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.phone}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.designation}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Senior Developer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.dob}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.gender}</FormLabel>
                    <Select
                      value={field.value ? field.value : NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Not set" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Not set</SelectItem>
                        {EMPLOYEE_GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
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
                      value={field.value ? field.value : NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Not set" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Not set</SelectItem>
                        {EMPLOYEE_MARITAL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      value={field.value ? field.value : NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Not set" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Not set</SelectItem>
                        {EMPLOYEE_BLOOD_GROUPS.filter(Boolean).map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aadharNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{L.adharNumber}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
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
                      <Input {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{L.bio}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile photo</FormLabel>
                  <FileUploader
                    category="avatars"
                    accept="image/*"
                    label="Upload profile photo"
                    value={field.value ?? ""}
                    maxSizeMB={5}
                    onUploadComplete={(url) => field.onChange(url)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent forceMount value="address" className="space-y-4 pt-2 data-[state=inactive]:hidden">
            <AddressFields form={form} prefix="permanentAddress" title={L.permanentAddress} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={copyPermanentToCurrent}>
                Copy permanent → current
              </Button>
            </div>
            <AddressFields form={form} prefix="currentAddress" title={L.currentAddress} />
          </TabsContent>

          <TabsContent forceMount value="social" className="space-y-4 pt-2 data-[state=inactive]:hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["linkedinUrl", "LinkedIn"],
                  ["socialTwitter", "Twitter / X"],
                  ["socialFacebook", "Facebook"],
                  ["socialInstagram", "Instagram"],
                  ["socialWebsite", "Website"],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className={name === "socialWebsite" ? "sm:col-span-2" : undefined}>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <Separator />
            <p className="text-sm font-medium">Documents</p>
            <p className="text-xs text-muted-foreground">
              Upload resume and identity documents (PDF or image).
            </p>
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
                          label={`Upload ${label.toLowerCase()}`}
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
            <EmployeeDocumentsPanel
              userId={user.id}
              canUpload
              canDelete
              fetchEnabled={profileTab === "social"}
            />
          </TabsContent>

          <TabsContent forceMount value="bank" className="space-y-4 pt-2 data-[state=inactive]:hidden">
            <p className="text-xs text-muted-foreground">
              Bank details are used for payroll. Salary amounts are managed by HR and cannot be changed here.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
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
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} className={name === "bankIfsc" ? "uppercase" : undefined} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset(mapUserToSelfProfileForm(user))}
          >
            Reset
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save profile
          </Button>
        </div>
      </form>
    </Form>
  );
}
