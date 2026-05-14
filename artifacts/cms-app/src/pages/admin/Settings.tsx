import React, { useState, useEffect } from "react";
import { 
  useGetSettings, 
  useUpdateSettings,
  getGetSettingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useTheme, type PrimaryColor, type FontSize } from "@/contexts/ThemeContext";
import { 
  Building, 
  Palette, 
  Shield, 
  Loader2, 
  Check,
  Lock,
  Info,
  ExternalLink,
  Smartphone,
  Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const { mutateAsync: updateSettings, isPending: isUpdatingSettings } = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { 
    primaryColor, 
    setPrimaryColor, 
    fontSize, 
    setFontSize,
    theme,
    toggleTheme
  } = useTheme();

  // Company Form State
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    address: "",
    logoUrl: "",
    sealUrl: ""
  });

  useEffect(() => {
    if (settings) {
      setCompanyForm({
        companyName: settings.companyName || "",
        address: settings.address || "",
        logoUrl: settings.logoUrl || "",
        sealUrl: settings.sealUrl || ""
      });
    }
  }, [settings]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        data: {
          companyName: companyForm.companyName,
          address: companyForm.address,
          logoUrl: companyForm.logoUrl || undefined,
          sealUrl: companyForm.sealUrl || undefined
        }
      });
      toast({
        title: "Settings updated",
        description: "Company settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "There was an error updating settings.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const colorPresets: { label: string; value: PrimaryColor; class: string }[] = [
    { label: "Default", value: "default", class: "bg-slate-500" },
    { label: "Blue", value: "blue", class: "bg-blue-500" },
    { label: "Green", value: "green", class: "bg-emerald-500" },
    { label: "Purple", value: "purple", class: "bg-violet-500" },
    { label: "Orange", value: "orange", class: "bg-orange-500" },
    { label: "Rose", value: "rose", class: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure global application settings and appearance</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-9 border border-border/50">
          <TabsTrigger value="company" className="text-xs h-7 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Building className="h-3.5 w-3.5 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs h-7 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Palette className="h-3.5 w-3.5 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs h-7 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Shield className="h-3.5 w-3.5 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6 mt-0">
          <Card>
            <CardHeader className="py-4 px-6">
              <CardTitle className="text-base font-semibold">Company Profile</CardTitle>
              <CardDescription>Public information used on reports and invoices</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={companyForm.companyName} 
                    onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea 
                    id="address" 
                    value={companyForm.address} 
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    rows={3}
                    className="text-sm min-h-[80px]"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input 
                      id="logoUrl" 
                      value={companyForm.logoUrl} 
                      onChange={(e) => setCompanyForm({ ...companyForm, logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="h-8 text-sm"
                    />
                    {companyForm.logoUrl && (
                      <div className="mt-2 p-2 border border-border/50 rounded-md bg-muted/20 w-fit">
                        <img src={companyForm.logoUrl} alt="Logo Preview" className="h-10 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="sealUrl">Seal URL</Label>
                    <Input 
                      id="sealUrl" 
                      value={companyForm.sealUrl} 
                      onChange={(e) => setCompanyForm({ ...companyForm, sealUrl: e.target.value })}
                      placeholder="https://example.com/seal.png"
                      className="h-8 text-sm"
                    />
                    {companyForm.sealUrl && (
                      <div className="mt-2 p-2 border border-border/50 rounded-md bg-muted/20 w-fit">
                        <img src={companyForm.sealUrl} alt="Seal Preview" className="h-10 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={isUpdatingSettings} className="h-8">
                    {isUpdatingSettings && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7 space-y-6">
              <Card>
                <CardHeader className="py-4 px-6">
                  <CardTitle className="text-base font-semibold">Theme Customization</CardTitle>
                  <CardDescription>Personalize the dashboard interface</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color Scheme</Label>
                    <RadioGroup 
                      value={primaryColor} 
                      onValueChange={(v) => setPrimaryColor(v as PrimaryColor)}
                      className="grid grid-cols-3 gap-3"
                    >
                      {colorPresets.map((preset) => (
                        <div key={preset.value}>
                          <RadioGroupItem
                            value={preset.value}
                            id={`color-${preset.value}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`color-${preset.value}`}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all",
                              primaryColor === preset.value 
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <div className={cn("h-4 w-4 rounded-full", preset.class)} />
                            <span className="text-xs font-medium">{preset.label}</span>
                            {primaryColor === preset.value && <Check className="h-3 w-3 ml-auto text-primary" />}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator className="bg-border/50" />

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Font Size</Label>
                    <RadioGroup 
                      value={fontSize} 
                      onValueChange={(v) => setFontSize(v as FontSize)}
                      className="grid grid-cols-3 gap-3"
                    >
                      {[
                        { label: "Compact", value: "compact" },
                        { label: "Default", value: "default" },
                        { label: "Comfortable", value: "comfortable" },
                      ].map((option) => (
                        <div key={option.value}>
                          <RadioGroupItem
                            value={option.value}
                            id={`font-${option.value}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`font-${option.value}`}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-md border cursor-pointer transition-all gap-1 text-center",
                              fontSize === option.value 
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <span className={cn(
                              "font-medium",
                              option.value === "compact" ? "text-[10px]" : option.value === "comfortable" ? "text-sm" : "text-xs"
                            )}>Aa</span>
                            <span className="text-[10px] text-muted-foreground">{option.label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                      <Info className="h-3 w-3" />
                      Settings are saved automatically to your device
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleTheme}
                      className="h-8 text-xs"
                    >
                      Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-5">
              <Card className="h-full border-dashed bg-muted/10">
                <CardHeader className="py-4 px-6">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="p-4 rounded-lg bg-background border border-border shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-primary rounded-md flex items-center justify-center shadow-sm">
                        <Smartphone size={12} className="text-primary-foreground" />
                      </div>
                      <span className="text-xs font-bold">Preview Component</span>
                      <Badge className="ml-auto h-4 px-1 text-[8px]">New</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This is a live preview of how the interface elements will look with your current theme settings.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="h-7 text-[10px]">Primary Action</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]">Secondary</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-primary rounded-full" />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>Syncing...</span>
                      <span>66%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded border border-primary/20 bg-primary/5">
                    <Check className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary">Theme colors applied successfully</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="py-4 px-6 pb-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Password Policy</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4">
                <div className="space-y-3">
                  {[
                    "Minimum password length is 8 characters",
                    "Require at least one uppercase letter",
                    "Require at least one number or symbol",
                    "Passwords cannot be reused from last 3 changes",
                    "Session expires after 24 hours of inactivity"
                  ].map((rule, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                      <span className="text-muted-foreground">{rule}</span>
                    </div>
                  ))}
                </div>
                <Alert className="bg-muted/30 border-border py-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Security policies are enforced globally for all users.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4 px-6 pb-2">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Audit & Compliance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The system maintains a comprehensive audit log of all administrative actions. These logs are immutable and stored for a minimum of 90 days.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/20">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Last Audit Export</span>
                      <span className="text-xs">Never exported</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Separator className="bg-border/50" />
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 space-y-2">
                  <h4 className="text-xs font-bold text-destructive uppercase tracking-wider">Danger Zone</h4>
                  <p className="text-[10px] text-destructive/80">
                    Forcing a global password reset will log out all users and require them to change their password on next login.
                  </p>
                  <Button variant="destructive" size="sm" className="h-7 text-[10px] w-full" disabled>
                    Force Global Password Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
