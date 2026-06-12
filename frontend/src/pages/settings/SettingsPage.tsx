import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type PrimaryColor, type FontSize } from "@/contexts/ThemeContext";
import { COLOR_PRESETS } from "@/lib/brand-colors";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  getWorkspacePrefs,
  saveWorkspacePrefs,
  type NotificationPrefs,
  type WorkspacePrefs,
} from "@/lib/user-preferences";
import { PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { FileUploader } from "@/components/ui/file-uploader";
import { ChangePasswordCard } from "@/components/auth/change-password-card";
import { SettingsFormSkeleton } from "@/components/loading";
import {
  Palette,
  Bell,
  Building2,
  Shield,
  User,
  Globe,
  // CreditCard, // billing section disabled
  Plug,
  Loader2,
  Check,
  Moon,
  Sun,
  Sparkles,
  ExternalLink,
  Monitor,
} from "lucide-react";
import { ScreenshotMonitoringCard } from "@/components/monitoring/ScreenshotMonitoringCard";

type SettingsSection =
  | "appearance"
  | "notifications"
  | "workspace"
  | "account"
  | "organization"
  // | "billing"
  | "integrations"
  | "security"
  | "monitoring";

function SectionNav({
  sections,
  active,
  onChange,
}: {
  sections: { id: SettingsSection; label: string; icon: React.ElementType }[];
  active: SettingsSection;
  onChange: (id: SettingsSection) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
            active === id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function ThemePreview() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Live preview</p>
          <p className="text-xs text-muted-foreground">Active theme tokens</p>
        </div>
        <Badge className="ml-auto bg-primary text-primary-foreground">Active</Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Primary buttons, badges, and progress use your accent color and light/dark mode.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full w-2/3 rounded-full bg-primary transition-all" />
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
        <Check className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Theme applied</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { theme, setTheme, primaryColor, setPrimaryColor, customColor, setCustomColor, fontSize, setFontSize } =
    useTheme();

  const { data: orgSettings, isLoading: loadingOrg } = useGetSettings({
    query: { enabled: isAdmin, queryKey: getGetSettingsQueryKey() },
  });
  const { mutateAsync: updateSettings, isPending: savingOrg } = useUpdateSettings();

  const [section, setSection] = useState<SettingsSection>("appearance");
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());
  const [workspacePrefs, setWorkspacePrefs] = useState<WorkspacePrefs>(() => getWorkspacePrefs());
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    address: "",
    logoUrl: "",
    sealUrl: "",
    requiredDailyWorkHours: "7.5",
    dailyLogComplianceEnabled: true,
    dailyLogReminderHour: "23",
    complianceTimezone: "",
  });

  const userSections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "workspace", label: "Workspace", icon: Globe },
    { id: "account", label: "Account", icon: User },
    { id: "security", label: "Security", icon: Shield },
  ];

  const adminSections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "monitoring", label: "Monitoring", icon: Monitor },
    // { id: "billing", label: "Billing & plan", icon: CreditCard },
    { id: "integrations", label: "Integrations", icon: Plug },
  ];

  const sections = isAdmin ? [...userSections, ...adminSections] : userSections;

  const goToSection = (id: SettingsSection) => {
    setSection(id);
    // In hash routing (Electron) the entire route lives in the hash already —
    // don't overwrite it with a section fragment.
    if (!window.location.hash.startsWith("#/")) {
      window.history.replaceState(null, "", `${window.location.pathname}#${id}`);
    }
  };

  useEffect(() => {
    // In hash routing the hash is "#/admin/settings", not a section name — skip.
    if (window.location.hash.startsWith("#/")) return;
    const hash = window.location.hash.replace("#", "") as SettingsSection;
    const allowed: SettingsSection[] = isAdmin
      ? ["appearance", "notifications", "workspace", "account", "security", "organization", "monitoring", "integrations"]
      : ["appearance", "notifications", "workspace", "account", "security"];
    if (allowed.includes(hash)) setSection(hash);
  }, [isAdmin]);

  useEffect(() => {
    if (orgSettings) {
      setCompanyForm({
        companyName: orgSettings.companyName || "",
        address: orgSettings.address || "",
        logoUrl: orgSettings.logoUrl || "",
        sealUrl: orgSettings.sealUrl || "",
        requiredDailyWorkHours: String(orgSettings.requiredDailyWorkHours ?? 7.5),
        dailyLogComplianceEnabled: orgSettings.dailyLogComplianceEnabled !== false,
        dailyLogReminderHour: String(orgSettings.dailyLogReminderHour ?? 23),
        complianceTimezone: orgSettings.complianceTimezone ?? "",
      });
    }
  }, [orgSettings]);

  const persistNotif = (next: NotificationPrefs) => {
    setNotifPrefs(next);
    saveNotificationPrefs(next);
    toast({ title: "Notification preferences saved" });
  };

  const persistWorkspace = (next: WorkspacePrefs) => {
    setWorkspacePrefs(next);
    saveWorkspacePrefs(next);
    toast({ title: "Workspace preferences saved" });
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const reminderHour = Number.parseInt(companyForm.dailyLogReminderHour, 10);
    const tzRaw = companyForm.complianceTimezone.trim();
    if (companyForm.dailyLogComplianceEnabled) {
      if (!Number.isInteger(reminderHour) || reminderHour < 0 || reminderHour > 23) {
        toast({
          title: "Invalid reminder time",
          description: "Choose a reminder hour between 12:00 AM and 11:00 PM.",
          variant: "destructive",
        });
        return;
      }
      if (!tzRaw) {
        toast({
          title: "Timezone required",
          description: "Set an IANA timezone (e.g. Asia/Kolkata) so reminders run at the correct local time.",
          variant: "destructive",
        });
        return;
      }
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tzRaw });
      } catch {
        toast({
          title: "Invalid timezone",
          description: "Use an IANA timezone such as Asia/Kolkata.",
          variant: "destructive",
        });
        return;
      }
    }
    try {
      await updateSettings({
        data: {
          companyName: companyForm.companyName,
          address: companyForm.address,
          logoUrl: companyForm.logoUrl || undefined,
          sealUrl: companyForm.sealUrl || undefined,
          requiredDailyWorkHours: Number.parseFloat(companyForm.requiredDailyWorkHours),
          dailyLogComplianceEnabled: companyForm.dailyLogComplianceEnabled,
          dailyLogReminderHour: Number.isInteger(reminderHour) ? reminderHour : 23,
          complianceTimezone: tzRaw || null,
        },
      });
      toast({ title: "Organization updated", description: "Branding saved for all users." });
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: getApiErrorMessage(error, "Could not save organization."),
        variant: "destructive",
      });
    }
  };

  return (
    <PageShell
      title="Settings"
      description="Personalize your workspace, notifications, and preferences."
      hideHeader
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage appearance, notifications, and {isAdmin ? "organization" : "account"} preferences
          </p>
        </div>
        <Badge variant="outline" className="w-fit capitalize">
          {user?.role?.replace("_", " ")} · SaaS workspace
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit lg:sticky lg:top-6">
          <CardContent className="p-3">
            <SectionNav sections={sections} active={section} onChange={goToSection} />
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          {section === "appearance" && (
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Appearance</CardTitle>
                  <CardDescription>Theme mode, accent color, and display density</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Color mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 transition-all",
                          theme === "light"
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <Sun className="h-5 w-5" />
                        <span className="text-sm font-medium">Light</span>
                        {theme === "light" && <Check className="h-4 w-4 ml-auto text-primary" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 transition-all",
                          theme === "dark"
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <Moon className="h-5 w-5" />
                        <span className="text-sm font-medium">Dark</span>
                        {theme === "dark" && <Check className="h-4 w-4 ml-auto text-primary" />}
                      </button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Accent color</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Colors from your brand logo, plus a custom accent you can choose.
                    </p>
                    <RadioGroup
                      value={primaryColor}
                      onValueChange={(v) => setPrimaryColor(v as PrimaryColor)}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    >
                      {COLOR_PRESETS.map((preset) => (
                        <div key={preset.value}>
                          <RadioGroupItem
                            value={preset.value}
                            id={`accent-${preset.value}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`accent-${preset.value}`}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                              primaryColor === preset.value
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border hover:bg-muted/50",
                            )}
                          >
                            <span
                              className="h-5 w-5 rounded-full shrink-0 border border-border/50"
                              style={{
                                background:
                                  preset.value === "custom" ? customColor : preset.swatch,
                              }}
                            />
                            <span className="text-xs font-medium">{preset.label}</span>
                            {primaryColor === preset.value && (
                              <Check className="h-3.5 w-3.5 ml-auto text-primary" />
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {primaryColor === "custom" && (
                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                        <Label htmlFor="custom-accent-color" className="text-xs shrink-0">
                          Custom color
                        </Label>
                        <input
                          id="custom-accent-color"
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                        />
                        <Input
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="h-9 max-w-[7rem] font-mono text-xs uppercase"
                          maxLength={7}
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Text size</Label>
                    <RadioGroup
                      value={fontSize}
                      onValueChange={(v) => setFontSize(v as FontSize)}
                      className="grid grid-cols-3 gap-3"
                    >
                      {(
                        [
                          { label: "Compact", value: "compact" },
                          { label: "Default", value: "default" },
                          { label: "Comfortable", value: "comfortable" },
                        ] as const
                      ).map((opt) => (
                        <div key={opt.value}>
                          <RadioGroupItem
                            value={opt.value}
                            id={`font-${opt.value}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`font-${opt.value}`}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer gap-1",
                              fontSize === opt.value
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border hover:bg-muted/50",
                            )}
                          >
                            <span className="text-sm font-medium">Aa</span>
                            <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Appearance is saved on this device and applies instantly across the app.
                  </p>
                </CardContent>
              </Card>
              <div className="lg:col-span-2">
                <ThemePreview />
              </div>
            </div>
          )}

          {section === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Control how CMS alerts you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    {
                      key: "emailAlerts" as const,
                      title: "Email alerts",
                      desc: "Receive important updates by email",
                    },
                    {
                      key: "pushAlerts" as const,
                      title: "Push notifications",
                      desc: "Browser push when the app is in background",
                    },
                    {
                      key: "bugUpdates" as const,
                      title: "Bug updates",
                      desc: "Status changes on bugs you follow",
                    },
                    {
                      key: "ticketUpdates" as const,
                      title: "Ticket updates",
                      desc: "Replies and status on your tickets",
                    },
                    {
                      key: "projectDigest" as const,
                      title: "Weekly digest",
                      desc: "Summary of project activity every Monday",
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[item.key]}
                      onCheckedChange={(checked) =>
                        persistNotif({ ...notifPrefs, [item.key]: checked })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {section === "workspace" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workspace</CardTitle>
                <CardDescription>Regional and layout preferences for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={workspacePrefs.timezone}
                    onChange={(e) =>
                      setWorkspacePrefs({ ...workspacePrefs, timezone: e.target.value })
                    }
                    placeholder="Asia/Singapore"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date format</Label>
                  <Select
                    value={workspacePrefs.dateFormat}
                    onValueChange={(v) =>
                      setWorkspacePrefs({
                        ...workspacePrefs,
                        dateFormat: v as WorkspacePrefs["dateFormat"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={workspacePrefs.language}
                    onValueChange={(v) =>
                      setWorkspacePrefs({ ...workspacePrefs, language: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div>
                    <p className="text-sm font-medium">Compact sidebar</p>
                    <p className="text-xs text-muted-foreground">Denser navigation (coming soon)</p>
                  </div>
                  <Switch
                    checked={workspacePrefs.compactNav}
                    onCheckedChange={(checked) =>
                      setWorkspacePrefs({ ...workspacePrefs, compactNav: checked })
                    }
                  />
                </div>
                <Button onClick={() => persistWorkspace(workspacePrefs)}>Save workspace</Button>
              </CardContent>
            </Card>
          )}

          {section === "account" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Profile and sign-in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2 capitalize">
                    {user?.role?.replace("_", " ")}
                  </Badge>
                </div>
                <Button asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Edit profile & password
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/notifications">
                    <Bell className="mr-2 h-4 w-4" />
                    View notification inbox
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {section === "security" && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Change password</CardTitle>
                  <CardDescription>
                    Use your current password or verify with a code sent to your email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ChangePasswordCard userEmail={user?.email} compact />
                  <div className="rounded-lg border border-dashed border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">Sessions</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Refresh tokens expire after 30 days; sign out on shared devices.
                    </p>
                  </div>
                </CardContent>
              </Card>
              {isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Organization policies</CardTitle>
                    <CardDescription>Enforced for all workspace users</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    {[
                      "Minimum password length: 8 characters",
                      "Audit log retained 90 days",
                      "Role-based access on all API routes",
                    ].map((rule) => (
                      <div key={rule} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {section === "organization" && isAdmin && (
            <div className="space-y-6">
            {loadingOrg ? (
              <SettingsFormSkeleton />
            ) : (
              <form onSubmit={handleUpdateCompany} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Organization</CardTitle>
                    <CardDescription>Branding on reports, PDFs, and client portal</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company name</Label>
                      <Input
                        id="companyName"
                        value={companyForm.companyName}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, companyName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={companyForm.address}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, address: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Company logo</Label>
                        <FileUploader
                          category="misc"
                          accept="image/*"
                          label="Upload logo"
                          value={companyForm.logoUrl}
                          maxSizeMB={5}
                          onUploadComplete={(url) =>
                            setCompanyForm({ ...companyForm, logoUrl: url })
                          }
                        />
                        {companyForm.logoUrl && (
                          <img
                            src={companyForm.logoUrl}
                            alt="Logo preview"
                            className="h-12 object-contain rounded border border-border p-2 bg-muted/30"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Official seal</Label>
                        <FileUploader
                          category="misc"
                          accept="image/*"
                          label="Upload seal"
                          value={companyForm.sealUrl}
                          maxSizeMB={5}
                          onUploadComplete={(url) =>
                            setCompanyForm({ ...companyForm, sealUrl: url })
                          }
                        />
                        {companyForm.sealUrl && (
                          <img
                            src={companyForm.sealUrl}
                            alt="Seal preview"
                            className="h-12 object-contain rounded border border-border p-2 bg-muted/30"
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily log policy</CardTitle>
                    <CardDescription>
                      Required work hours for developers and QA. Incomplete weekdays trigger
                      in-app alerts and email.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-xl">
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="dailyLogComplianceEnabled">Enforce daily hours</Label>
                        <p className="text-xs text-muted-foreground">
                          Staff must log the required total hours each working day
                        </p>
                      </div>
                      <Switch
                        id="dailyLogComplianceEnabled"
                        checked={companyForm.dailyLogComplianceEnabled}
                        onCheckedChange={(checked) =>
                          setCompanyForm({ ...companyForm, dailyLogComplianceEnabled: checked })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requiredDailyWorkHours">Required hours per day</Label>
                      <Input
                        id="requiredDailyWorkHours"
                        type="number"
                        min={1}
                        max={16}
                        step={0.5}
                        disabled={!companyForm.dailyLogComplianceEnabled}
                        value={companyForm.requiredDailyWorkHours}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            requiredDailyWorkHours: e.target.value,
                          })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Example: 7.5 means daily logs must total 7.5 hours (multiple entries allowed).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dailyLogReminderHour">Reminder email time</Label>
                      <Select
                        value={companyForm.dailyLogReminderHour}
                        disabled={!companyForm.dailyLogComplianceEnabled}
                        onValueChange={(value) =>
                          setCompanyForm({ ...companyForm, dailyLogReminderHour: value })
                        }
                      >
                        <SelectTrigger id="dailyLogReminderHour">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, hour) => {
                            const label =
                              hour === 0
                                ? "12:00 AM"
                                : hour === 12
                                  ? "12:00 PM"
                                  : hour < 12
                                    ? `${hour}:00 AM`
                                    : hour === 23
                                      ? "11:00 PM"
                                      : `${hour - 12}:00 PM`;
                            return (
                              <SelectItem key={hour} value={String(hour)}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Alerts run once per day at this time in your timezone. Use{" "}
                        <strong>11:00 PM</strong> for an end-of-day reminder (not 12:00 AM, which is midnight).
                        Morning times check yesterday&apos;s hours; afternoon/evening times check the same day.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complianceTimezone">Reminder timezone</Label>
                      <Input
                        id="complianceTimezone"
                        placeholder="Asia/Kolkata"
                        disabled={!companyForm.dailyLogComplianceEnabled}
                        value={companyForm.complianceTimezone}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, complianceTimezone: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for correct local time (e.g. Asia/Kolkata). Reminders are not sent until a timezone is set.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" disabled={savingOrg}>
                  {savingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save organization settings
                </Button>
              </form>
            )}
            </div>
          )}


          {section === "monitoring" && isAdmin && (
            <ScreenshotMonitoringCard />
          )}

          {section === "integrations" && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Integrations</CardTitle>
                <CardDescription>Connect external tools to your workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "REST API", status: "Active", desc: "OpenAPI-backed API for automation" },
                  { name: "Webhooks", status: "Coming soon", desc: "Notify Slack, Teams, or custom URLs" },
                  { name: "Firebase Cloud Messaging", status: "Configured", desc: "Push notifications when app is closed" },
                  { name: "Object storage (S3)", status: "Configured", desc: "DigitalOcean Spaces for uploads" },
                ].map((int) => (
                  <div
                    key={int.name}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{int.name}</p>
                      <p className="text-xs text-muted-foreground">{int.desc}</p>
                    </div>
                    <Badge variant={int.status === "Active" || int.status === "Configured" ? "default" : "secondary"}>
                      {int.status}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" className="mt-2" disabled>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  API documentation
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}


