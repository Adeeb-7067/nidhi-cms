import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useUpdateSettings, getGetSettingsQueryKey, type CompanySettings, type CompanySettingsUpdate } from "@/api";
import { monitoringStatusQueryKey } from "@/api/monitoring";
import { useQueryClient } from "@tanstack/react-query";
import { isElectron } from "@/lib/electron-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Monitor,
  Clock,
  Trash2,
  EyeOff,
  FileKey,
  ArrowRight,
  Camera,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

export interface MonitoringSettings {
  screenshotEnabled: boolean;
  screenshotIntervalMinutes: number;
  screenshotRetentionDays: number;
  screenshotBlurEnabled: boolean;
  screenshotConsentVersion: string;
}

const DEFAULT_FORM: MonitoringSettings = {
  screenshotEnabled: false,
  screenshotIntervalMinutes: 10,
  screenshotRetentionDays: 30,
  screenshotBlurEnabled: true,
  screenshotConsentVersion: "1.0",
};

/** Sensitive-app blur is mandatory and cannot be disabled by admins. */
const SCREENSHOT_BLUR_ALWAYS_ENABLED = true;

function readMonitoringFromSettings(settings: CompanySettings | null | undefined): MonitoringSettings {
  if (!settings) return DEFAULT_FORM;
  const s = settings as CompanySettings & Partial<MonitoringSettings>;
  return {
    screenshotEnabled: Boolean(s.screenshotEnabled),
    screenshotIntervalMinutes: s.screenshotIntervalMinutes ?? 10,
    screenshotRetentionDays: s.screenshotRetentionDays ?? 30,
    screenshotBlurEnabled: SCREENSHOT_BLUR_ALWAYS_ENABLED,
    screenshotConsentVersion: s.screenshotConsentVersion ?? "1.0",
  };
}

function mergeSavedMonitoringSettings(
  prev: CompanySettings | undefined,
  saved: MonitoringSettings,
  response: CompanySettings,
): CompanySettings {
  return {
    ...(prev ?? response),
    ...response,
    ...saved,
  };
}

function monitoringStatusFromSettings(settings: CompanySettings): MonitoringSettings {
  return readMonitoringFromSettings(settings);
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-6 py-4", disabled && "opacity-40 pointer-events-none")}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="shrink-0 mt-0.5">{children}</div>
    </div>
  );
}

export function ScreenshotMonitoringCard({
  settings,
}: {
  settings: CompanySettings | null | undefined;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateSettings();

  const [form, setForm] = useState<MonitoringSettings>(() => readMonitoringFromSettings(settings));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setForm(readMonitoringFromSettings(settings));
  }, [settings, dirty]);

  const update = (patch: Partial<MonitoringSettings>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const applySavedSettings = useCallback(
    (saved: MonitoringSettings, response: CompanySettings) => {
      const prev = qc.getQueryData<CompanySettings>(getGetSettingsQueryKey());
      const merged = mergeSavedMonitoringSettings(prev, saved, response);
      qc.setQueryData(getGetSettingsQueryKey(), merged);
      qc.setQueryData(monitoringStatusQueryKey(), monitoringStatusFromSettings(merged));
      setForm(readMonitoringFromSettings(merged));
      setDirty(false);
    },
    [qc],
  );

  const saveForm = useCallback(
    async (payload: MonitoringSettings) => {
      const withBlur = { ...payload, screenshotBlurEnabled: SCREENSHOT_BLUR_ALWAYS_ENABLED };
      const response = await updateSettings({
        data: withBlur as CompanySettingsUpdate,
      });
      applySavedSettings(withBlur, response);

      const persisted = readMonitoringFromSettings(response);
      if (withBlur.screenshotEnabled && !persisted.screenshotEnabled) {
        toast({
          title: "Monitoring may not have saved on server",
          description:
            "The API accepted the request but returned monitoring as off. Deploy the latest backend or check PATCH /api/settings on your API host.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Monitoring settings saved",
        description: withBlur.screenshotEnabled
          ? `Screenshots every ${withBlur.screenshotIntervalMinutes} min, kept for ${withBlur.screenshotRetentionDays} days.`
          : "Screenshot monitoring is disabled.",
      });
    },
    [applySavedSettings, toast, updateSettings],
  );

  const handleSave = async () => {
    try {
      await saveForm(form);
    } catch (err) {
      toast({
        title: "Save failed",
        description: getApiErrorMessage(err, "Could not save monitoring settings."),
        variant: "destructive",
      });
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    const previous = form;
    const next = { ...form, screenshotEnabled: checked };
    setForm(next);
    setDirty(true);
    try {
      await saveForm(next);
    } catch (err) {
      setForm(previous);
      setDirty(false);
      toast({
        title: "Save failed",
        description: getApiErrorMessage(err, "Could not update monitoring."),
        variant: "destructive",
      });
    }
  };

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-16 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Could not load monitoring settings</p>
          <p className="text-xs text-muted-foreground mt-1">
            Refresh the page or check that you are signed in as super admin.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                form.screenshotEnabled ? "bg-primary/10" : "bg-muted",
              )}
            >
              <Camera
                className={cn(
                  "h-5 w-5 transition-colors",
                  form.screenshotEnabled ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Screenshot Monitoring</p>
                <Badge
                  variant={form.screenshotEnabled ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  {form.screenshotEnabled ? "Active" : "Off"}
                </Badge>
                {!isElectron() && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    Captures on desktop app only
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Periodic screen captures while employees are clocked in (Electron desktop)
              </p>
            </div>
          </div>
          <Switch
            checked={form.screenshotEnabled}
            onCheckedChange={(checked) => void handleToggleEnabled(checked)}
            className="shrink-0"
            aria-label="Enable screenshot monitoring"
            disabled={saving}
          />
        </div>

        <div className="px-6 divide-y divide-border/50">
          <SettingRow
            icon={Clock}
            label="Capture interval"
            description="How often a screenshot is taken while clocked in and the machine is active."
            disabled={!form.screenshotEnabled}
          >
            <Select
              value={String(form.screenshotIntervalMinutes)}
              onValueChange={(v) => update({ screenshotIntervalMinutes: Number(v) })}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 5, 10, 15, 20, 30, 60].map((m) => (
                  <SelectItem key={m} value={String(m)} className="text-xs">
                    Every {m} {m === 1 ? "minute" : "minutes"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            icon={Trash2}
            label="Retention period"
            description="Screenshots older than this are permanently deleted by the nightly purge job."
            disabled={!form.screenshotEnabled}
          >
            <Select
              value={String(form.screenshotRetentionDays)}
              onValueChange={(v) => update({ screenshotRetentionDays: Number(v) })}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 14, 30, 60, 90].map((d) => (
                  <SelectItem key={d} value={String(d)} className="text-xs">
                    {d} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            icon={EyeOff}
            label="Blur sensitive content"
            description="Always enabled. When WhatsApp, personal mail, Telegram, etc. are in the foreground, that screenshot is fully blurred. Work apps stay normal."
            disabled={!form.screenshotEnabled}
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                Always on
              </Badge>
              <Switch checked={SCREENSHOT_BLUR_ALWAYS_ENABLED} disabled aria-label="Blur sensitive content (always enabled)" />
            </div>
          </SettingRow>

          <SettingRow
            icon={FileKey}
            label="Consent version"
            description="Bump when your policy changes to require employees to re-consent."
            disabled={!form.screenshotEnabled}
          >
            <Input
              value={form.screenshotConsentVersion}
              onChange={(e) => update({ screenshotConsentVersion: e.target.value })}
              className="w-24 h-8 text-xs font-mono text-center"
              placeholder="1.0"
            />
          </SettingRow>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/60 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {form.screenshotEnabled
              ? "Saved changes apply to running desktop sessions within about 60 seconds."
              : "Enable monitoring above to configure capture settings."}
          </p>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">Screenshot viewer</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Browse captures by employee</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/admin/screenshots" className="flex items-center gap-1.5">
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">Attendance & consent</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Sessions and consent audit</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/admin/attendance" className="flex items-center gap-1.5">
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
