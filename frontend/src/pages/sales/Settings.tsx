import { useEffect, useState } from "react";
import { Hash, Percent, Bell, Clock, ListChecks, Tag, Plus, Trash2, Loader2 } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChangePasswordCard } from "@/components/auth/change-password-card";
import { useAuth } from "@/contexts/AuthContext";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { SalesPageHeader } from "@/modules/sales/components";
import {
  useListSalesConfig,
  useCreateSalesConfig,
  useDeleteSalesConfig,
  useSalesSettings,
  useUpdateSalesSettings,
} from "@/api/sales";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

function ConfigItemList({ type, label }: { type: string; label: string }) {
  const [newLabel, setNewLabel] = useState("");
  const { data, isLoading } = useListSalesConfig(type);
  const createConfig = useCreateSalesConfig();
  const deleteConfig = useDeleteSalesConfig();

  const handleAdd = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const value = trimmed.toLowerCase().replace(/\s+/g, "_");
    try {
      await createConfig.mutateAsync({ type, value, label: trimmed });
      setNewLabel("");
      toast.success(`${label} added`);
    } catch (err) {
      toastApiError(err, `Failed to add ${label.toLowerCase()}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteConfig.mutateAsync({ id, type });
      toast.success(`${label} removed`);
    } catch (err) {
      toastApiError(err, `Failed to remove ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder={`New ${label.toLowerCase()}…`}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 gap-1.5" onClick={() => void handleAdd()} disabled={!newLabel.trim() || createConfig.isPending}>
          {createConfig.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No {label.toLowerCase()}s yet. Add one above.</p>
      ) : (
        <ul className="space-y-1.5">
          {(data?.items ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-2 text-xs text-muted-foreground font-mono">{item.value}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Created {formatSalesDateTime(item.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => void handleDelete(item.id)}
                disabled={deleteConfig.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SalesSettings() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useSalesSettings();
  const updateSettings = useUpdateSalesSettings();

  const [prefix, setPrefix] = useState("PROP");
  const [nextNumber, setNextNumber] = useState("1");
  const [defaultTax, setDefaultTax] = useState("18");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [reminderHours, setReminderHours] = useState("24");
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (settings && !hydrated) {
      setPrefix(settings.proposalPrefix);
      setNextNumber(String(settings.proposalNextNumber));
      setDefaultTax(String(settings.defaultTax));
      setEmailNotifs(settings.emailNotifications);
      setPushNotifs(settings.pushNotifications);
      setReminderHours(String(settings.reminderHours));
      setOverdueAlerts(settings.overdueAlerts);
      setHydrated(true);
    }
  }, [settings, hydrated]);

  const save = async () => {
    try {
      await updateSettings.mutateAsync({
        proposalPrefix: prefix.trim(),
        proposalNextNumber: Number(nextNumber),
        defaultTax: Number(defaultTax),
        emailNotifications: emailNotifs,
        pushNotifications: pushNotifs,
        reminderHours: Number(reminderHours) as 1 | 24 | 48,
        overdueAlerts,
      });
      toast.success("Settings saved");
    } catch (err) {
      toastApiError(err, "Failed to save settings");
    }
  };

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Automation & settings"
        description="Lead assignment rules, status flow, notification templates, and reminders."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Settings" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => void save()} disabled={updateSettings.isPending || isLoading}>
            {updateSettings.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save changes
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="numbering">
          <TabsList className="h-9 flex-wrap">
            <TabsTrigger value="numbering" className="text-xs">Proposal numbering</TabsTrigger>
            <TabsTrigger value="tax" className="text-xs">Tax</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
            <TabsTrigger value="reminders" className="text-xs">Reminders</TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">Sources &amp; channels</TabsTrigger>
            <TabsTrigger value="statuses" className="text-xs">Lead statuses</TabsTrigger>
            <TabsTrigger value="account" className="text-xs">Account security</TabsTrigger>
          </TabsList>

          <TabsContent value="numbering" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Proposal numbering
                </CardTitle>
                <CardDescription>Format for auto-generated proposal IDs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Prefix</Label>
                  <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Next sequence number</Label>
                  <Input value={nextNumber} onChange={(e) => setNextNumber(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3 font-mono">
                  Preview: {prefix}-2026-{nextNumber.padStart(4, "0")}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Default tax
                </CardTitle>
                <CardDescription>Applied to new proposal line items.</CardDescription>
              </CardHeader>
              <CardContent className="max-w-xs space-y-2">
                <Label>GST / tax rate (%)</Label>
                <Input type="number" value={defaultTax} onChange={(e) => setDefaultTax(e.target.value)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </CardTitle>
                <CardDescription>How the team receives sales alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Email notifications</p>
                    <p className="text-xs text-muted-foreground">Lead assignments, approvals</p>
                  </div>
                  <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">In-app push</p>
                    <p className="text-xs text-muted-foreground">Real-time dashboard alerts</p>
                  </div>
                  <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Follow-up reminders
                </CardTitle>
                <CardDescription>When to notify executives before due follow-ups.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Reminder lead time</Label>
                  <Select value={reminderHours} onValueChange={setReminderHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour before</SelectItem>
                      <SelectItem value="24">24 hours before</SelectItem>
                      <SelectItem value="48">48 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Overdue alerts</p>
                    <p className="text-xs text-muted-foreground">Highlight missed follow-ups</p>
                  </div>
                  <Switch checked={overdueAlerts} onCheckedChange={setOverdueAlerts} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Lead sources
                </CardTitle>
                <CardDescription>Dropdown options on the Lead form under &quot;Source&quot;.</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigItemList type="lead_source" label="Source" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Contact channels
                </CardTitle>
                <CardDescription>Dropdown options on the Lead form under &quot;Contact channel&quot;.</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigItemList type="lead_channel" label="Channel" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statuses" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Lead statuses
                </CardTitle>
                <CardDescription>Pipeline stages (system-defined).</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {LEAD_STATUS_ORDER.map((s, i) => (
                    <li key={s} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                      <span className="font-medium">{LEAD_STATUS_LABELS[s]}</span>
                      <span className="text-xs text-muted-foreground ml-auto font-mono">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Password & account security</CardTitle>
                <CardDescription>
                  Change your sign-in password using current password or email OTP.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordCard userEmail={user?.email} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </PortalPageShell>
  );
}
