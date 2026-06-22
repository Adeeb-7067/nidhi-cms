import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import {
  Settings2,
  CalendarClock,
  Shield,
  Globe,
  Clock,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalContentCard } from "@/components/layout/portal-page-kit";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmField,
  HrmQueryErrorPanel,
  HrmTabsList,
  HrmTabsTrigger,
  portalActionButtonClass,
} from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useHrmSettings, useUpdateHrmSettings, useHrmShiftTemplates } from "@/api/hrm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HrmSettings } from "@/modules/hrm/types";
import {
  LEGACY_LEAVE_YEAR_MONTHS,
  LEGACY_SETTINGS_LABELS,
  LEGACY_WEEKDAY_OPTIONS,
} from "@/modules/hrm/hrm-legacy-labels";

type SettingsForm = Pick<
  HrmSettings,
  | "hrmAttendanceShortfallThresholdMinutes"
  | "hrmGlobalWfhMode"
  | "hrmMaxFreeLates"
  | "hrmPaidLeavesPerMonth"
  | "hrmElectronOnlyClock"
  | "hrmLeaveCarryForwardStartYear"
  | "hrmLeaveYearStartMonth"
  | "hrmDefaultShiftTemplateId"
  | "hrmWeekendDays"
>;

const FORM_ID = "hrm-settings-form";
const fieldControlClass = "h-9 bg-background";

function SettingsSectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function SettingsToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <PortalContentCard>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </PortalContentCard>
    </div>
  );
}

export default function HrmSettingsPage() {
  const { data, isLoading, isError, error, refetch } = useHrmSettings();
  const { data: shiftData } = useHrmShiftTemplates();
  const updateSettings = useUpdateHrmSettings();
  const form = useForm<SettingsForm>({
    defaultValues: {
      hrmAttendanceShortfallThresholdMinutes: 0,
      hrmGlobalWfhMode: false,
      hrmMaxFreeLates: 3,
      hrmPaidLeavesPerMonth: 1,
      hrmElectronOnlyClock: false,
      hrmLeaveCarryForwardStartYear: 2026,
      hrmLeaveYearStartMonth: 1,
      hrmDefaultShiftTemplateId: null,
      hrmWeekendDays: [0, 6],
    },
  });
  const weekendDays = form.watch("hrmWeekendDays") ?? [0, 6];
  const shiftTemplates = shiftData?.templates ?? [];
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const onSubmit = async (values: SettingsForm) => {
    if (!values.hrmWeekendDays?.length) {
      toast.error("Select at least one weekend day");
      return;
    }
    try {
      await updateSettings.mutateAsync(values);
      form.reset(values);
      toast.success("HRM settings saved");
    } catch {
      // Error toast handled by useUpdateHrmSettings
    }
  };

  const toggleWeekendDay = (day: number, checked: boolean) => {
    const current = form.getValues("hrmWeekendDays") ?? [];
    const next = checked
      ? [...new Set([...current, day])].sort((a, b) => a - b)
      : current.filter((d) => d !== day);
    form.setValue("hrmWeekendDays", next, { shouldDirty: true });
  };

  const kpiItems = useMemo(() => {
    if (!data) return [];
    const weekendLabels = (data.hrmWeekendDays ?? [])
      .map((d) => LEGACY_WEEKDAY_OPTIONS.find((o) => o.value === d)?.label.slice(0, 3))
      .filter(Boolean)
      .join(", ");
    return [
      {
        label: "Paid leave / month",
        value: data.hrmPaidLeavesPerMonth ?? 1,
        icon: CalendarClock,
        accent: "violet" as const,
      },
      {
        label: "Max free lates",
        value: data.hrmMaxFreeLates ?? 3,
        icon: Shield,
        accent: "amber" as const,
      },
      {
        label: "Global WFH",
        value: data.hrmGlobalWfhMode ? "On" : "Off",
        icon: Globe,
        accent: "green" as const,
      },
      {
        label: "Weekends",
        value: weekendLabels || "—",
        icon: CalendarDays,
        accent: "blue" as const,
      },
    ];
  }, [data]);

  return (
    <HrmGate module="settings">
      <HrmPageShell>
        <HrmPageHero
          title="HRM settings"
          description="Company-wide attendance rules, leave defaults, and shift policy"
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Settings" }]}
          actions={
            <Button
              type="submit"
              form={FORM_ID}
              size="sm"
              className={portalActionButtonClass("bg-primary text-primary-foreground hover:bg-primary/90")}
              disabled={updateSettings.isPending || isLoading || !isDirty}
            >
              {updateSettings.isPending ? "Saving…" : LEGACY_SETTINGS_LABELS.save}
            </Button>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        {isLoading ? (
          <SettingsPageSkeleton />
        ) : isError ? (
          <HrmQueryErrorPanel error={error} onRetry={refetch} title="Could not load settings" />
        ) : (
          <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="attendance" className="space-y-4">
              <HrmTabsList>
                <HrmTabsTrigger value="attendance">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  Attendance
                </HrmTabsTrigger>
                <HrmTabsTrigger value="leave">
                  <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                  Leave policy
                </HrmTabsTrigger>
              </HrmTabsList>

              <TabsContent value="attendance">
                <PortalContentCard contentClassName="p-5">
                  <SettingsSectionHeader
                    icon={Settings2}
                    title={LEGACY_SETTINGS_LABELS.attendancePolicy}
                    description="Present/late rules, weekends, default shift, and remote work"
                    action={
                      <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
                        <Link href="/hrm/shifts">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Manage shifts
                        </Link>
                      </Button>
                    }
                  />

                  <div className="space-y-5">
                    <SettingsToggleRow
                      label={LEGACY_SETTINGS_LABELS.globalWfhMode}
                      hint={LEGACY_SETTINGS_LABELS.globalWfhHint}
                      checked={form.watch("hrmGlobalWfhMode")}
                      onCheckedChange={(v) => form.setValue("hrmGlobalWfhMode", v, { shouldDirty: true })}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <HrmField
                        label={LEGACY_SETTINGS_LABELS.shortfallThreshold}
                        hint="Minutes below expected hours still counted as present"
                      >
                        <Input
                          type="number"
                          min={0}
                          className={fieldControlClass}
                          {...form.register("hrmAttendanceShortfallThresholdMinutes", { valueAsNumber: true })}
                        />
                      </HrmField>
                      <HrmField
                        label={LEGACY_SETTINGS_LABELS.maxFreeLates}
                        hint="Late arrivals forgiven each calendar month"
                      >
                        <Input
                          type="number"
                          min={0}
                          className={fieldControlClass}
                          {...form.register("hrmMaxFreeLates", { valueAsNumber: true })}
                        />
                      </HrmField>
                      <HrmField
                        label={LEGACY_SETTINGS_LABELS.defaultShift}
                        hint="Used when an employee has no assigned shift"
                      >
                        <Select
                          value={
                            form.watch("hrmDefaultShiftTemplateId") != null
                              ? String(form.watch("hrmDefaultShiftTemplateId"))
                              : "none"
                          }
                          onValueChange={(v) =>
                            form.setValue(
                              "hrmDefaultShiftTemplateId",
                              v === "none" ? null : Number(v),
                              { shouldDirty: true },
                            )
                          }
                        >
                          <SelectTrigger className={fieldControlClass}>
                            <SelectValue placeholder="Select default shift" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {shiftTemplates.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name} ({t.startTime} – {t.endTime})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </HrmField>
                    </div>

                    <HrmField
                      label={LEGACY_SETTINGS_LABELS.weekendDays}
                      hint="Non-working days excluded from attendance and leave calculations"
                    >
                      <div className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                        {LEGACY_WEEKDAY_OPTIONS.map((day) => {
                          const active = weekendDays.includes(day.value);
                          return (
                            <Button
                              key={day.value}
                              type="button"
                              variant={active ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "h-8 min-w-[3.25rem] px-3",
                                !active && "bg-background",
                              )}
                              onClick={() => toggleWeekendDay(day.value, !active)}
                            >
                              {day.label.slice(0, 3)}
                            </Button>
                          );
                        })}
                      </div>
                    </HrmField>

                    <SettingsToggleRow
                      label={LEGACY_SETTINGS_LABELS.electronOnlyClock}
                      hint="When enabled, only the desktop app may clock in (policy flag)."
                      checked={form.watch("hrmElectronOnlyClock")}
                      onCheckedChange={(v) => form.setValue("hrmElectronOnlyClock", v, { shouldDirty: true })}
                    />
                  </div>
                </PortalContentCard>
              </TabsContent>

              <TabsContent value="leave">
                <PortalContentCard contentClassName="p-5">
                  <SettingsSectionHeader
                    icon={CalendarClock}
                    title={LEGACY_SETTINGS_LABELS.leavePolicy}
                    description="Default accrual, leave year, and carry-forward rules"
                  />

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <HrmField
                      label={LEGACY_SETTINGS_LABELS.paidLeavesPerMonth}
                      hint="Default accrual for new employees"
                    >
                      <Input
                        type="number"
                        min={0}
                        className={fieldControlClass}
                        {...form.register("hrmPaidLeavesPerMonth", { valueAsNumber: true })}
                      />
                    </HrmField>
                    <HrmField
                      label={LEGACY_SETTINGS_LABELS.carryForwardStartYear}
                      hint="First year carry-forward balances apply"
                    >
                      <Input
                        type="number"
                        className={fieldControlClass}
                        {...form.register("hrmLeaveCarryForwardStartYear", { valueAsNumber: true })}
                      />
                    </HrmField>
                    <HrmField
                      label={LEGACY_SETTINGS_LABELS.leaveYearStartMonth}
                      hint="Fiscal leave year begins in this month"
                    >
                      <Select
                        value={String(form.watch("hrmLeaveYearStartMonth") ?? 1)}
                        onValueChange={(v) =>
                          form.setValue("hrmLeaveYearStartMonth", Number(v), { shouldDirty: true })
                        }
                      >
                        <SelectTrigger className={fieldControlClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEGACY_LEAVE_YEAR_MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                  </div>
                </PortalContentCard>
              </TabsContent>
            </Tabs>

            {isDirty && (
              <PortalContentCard contentClassName="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={portalActionButtonClass()}
                    onClick={() => data && form.reset(data)}
                  >
                    Discard
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className={portalActionButtonClass("bg-primary text-primary-foreground hover:bg-primary/90")}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? "Saving…" : LEGACY_SETTINGS_LABELS.save}
                  </Button>
                </div>
              </PortalContentCard>
            )}
          </form>
        )}
      </HrmPageShell>
    </HrmGate>
  );
}
