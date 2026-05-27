import { useState } from "react";
import { Hash, Percent, Bell, Clock, ListChecks } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { SalesPageHeader } from "@/modules/sales/components";
import { toast } from "sonner";

export default function SalesSettings() {
  const { user } = useAuth();
  const [prefix, setPrefix] = useState("PROP");
  const [nextNumber, setNextNumber] = useState("246");
  const [defaultTax, setDefaultTax] = useState("18");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [reminderHours, setReminderHours] = useState("24");
  const [overdueAlerts, setOverdueAlerts] = useState(true);

  const save = () => toast.success("Settings saved (demo)");

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
          <Button size="sm" className="h-8" onClick={save}>
            Save changes
          </Button>
        }
      />

      <Tabs defaultValue="numbering">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="numbering" className="text-xs">
            Proposal numbering
          </TabsTrigger>
          <TabsTrigger value="tax" className="text-xs">
            Tax
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="reminders" className="text-xs">
            Reminders
          </TabsTrigger>
          <TabsTrigger value="statuses" className="text-xs">
            Lead statuses
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs">
            Account security
          </TabsTrigger>
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
              <Input
                type="number"
                value={defaultTax}
                onChange={(e) => setDefaultTax(e.target.value)}
              />
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

        <TabsContent value="statuses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Lead statuses
              </CardTitle>
              <CardDescription>Pipeline stages (read-only in MVP demo).</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {LEAD_STATUS_ORDER.map((s, i) => (
                  <li
                    key={s}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
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
    </PortalPageShell>
  );
}
