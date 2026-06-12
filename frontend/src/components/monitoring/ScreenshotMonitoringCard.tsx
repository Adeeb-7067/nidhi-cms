import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { isElectron } from "@/lib/electron-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

interface MonitoringForm {
  screenshotEnabled: boolean;
  screenshotIntervalMinutes: number;
  screenshotRetentionDays: number;
  screenshotBlurEnabled: boolean;
  screenshotConsentVersion: string;
}

const DEFAULT_FORM: MonitoringForm = {
  screenshotEnabled: false,
  screenshotIntervalMinutes: 10,
  screenshotRetentionDays: 30,
  screenshotBlurEnabled: false,
  screenshotConsentVersion: "1.0",
};

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

export function ScreenshotMonitoringCard() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useGetSettings();
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateSettings();

  const [form, setForm] = useState<MonitoringForm>(DEFAULT_FORM);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const s = settings as typeof settings & MonitoringForm;
    setForm({
      screenshotEnabled: s.screenshotEnabled ?? false,
      screenshotIntervalMinutes: s.screenshotIntervalMinutes ?? 10,
      screenshotRetentionDays: s.screenshotRetentionDays ?? 30,
      screenshotBlurEnabled: s.screenshotBlurEnabled ?? false,
      screenshotConsentVersion: s.screenshotConsentVersion ?? "1.0",
    });
    setDirty(false);
  }, [settings]);

  const update = (patch: Partial<MonitoringForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings({ data: form as Parameters<typeof updateSettings>[0]["data"] });
      // Invalidate monitoring status so WorkSessionContext re-evaluates the scheduler.
      // Do NOT call setScreenshotConfig here — WorkSessionContext owns the scheduler
      // and will apply the new interval/enabled flag once the query refetches.
      qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      qc.invalidateQueries({ queryKey: ["monitoring", "status"] });

      setDirty(false);
      toast({
        title: "Monitoring settings saved",
        description: form.screenshotEnabled
          ? `Screenshots every ${form.screenshotIntervalMinutes} min, kept for ${form.screenshotRetentionDays} days.`
          : "Screenshot monitoring is disabled.",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: getApiErrorMessage(err, "Could not save monitoring settings."),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Main card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              form.screenshotEnabled ? "bg-primary/10" : "bg-muted",
            )}>
              <Camera className={cn(
                "h-5 w-5 transition-colors",
                form.screenshotEnabled ? "text-primary" : "text-muted-foreground",
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Screenshot Monitoring</p>
                <Badge
                  variant={form.screenshotEnabled ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  {form.screenshotEnabled ? "Active" : "Off"}
                </Badge>
                {!isElectron() && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    Desktop only
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Periodic screen captures for employee activity tracking
              </p>
            </div>
          </div>
          <Switch
            checked={form.screenshotEnabled}
            onCheckedChange={(checked) => update({ screenshotEnabled: checked })}
            className="shrink-0"
          />
        </div>

        {/* Settings list */}
        <div className="px-6 divide-y divide-border/50">

          {/* Capture interval */}
          <SettingRow
            icon={Clock}
            label="Capture interval"
            description="How often a screenshot is taken while the employee is clocked in and active."
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

          {/* Retention */}
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

          {/* Blur */}
          <SettingRow
            icon={EyeOff}
            label="Blur sensitive content"
            description="Apply a privacy blur overlay to screenshots before they are stored. (Future feature)"
            disabled={!form.screenshotEnabled}
          >
            <Switch
              checked={form.screenshotBlurEnabled}
              onCheckedChange={(checked) => update({ screenshotBlurEnabled: checked })}
            />
          </SettingRow>

          {/* Consent version */}
          <SettingRow
            icon={FileKey}
            label="Consent version"
            description="Bump this (e.g. 1.0 → 1.1) whenever your monitoring policy changes to force employees to re-consent."
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

        {/* Footer / save */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/60 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {form.screenshotEnabled
              ? "Changes take effect for new sessions after saving."
              : "Enable monitoring above to configure capture settings."}
          </p>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="min-w-[120px]"
          >
            {saving ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Saving…</>
            ) : (
              "Save settings"
            )}
          </Button>
        </div>
      </div>

      {/* ── Quick link to screenshot viewer ── */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">Screenshot viewer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse captures by employee and hour block
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/admin/screenshots" className="flex items-center gap-1.5">
            Open viewer
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
