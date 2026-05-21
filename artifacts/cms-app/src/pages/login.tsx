import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { Lock, Mail, User as UserIcon, CheckCircle, Shield, Users } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { BRAND } from "@/lib/brand";

const emailSchema = z.object({
  identifier: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const employeeSchema = z.object({
  identifier: z.string().regex(/^[A-Z]{2}\d{3}$/, "Format: XX000 (e.g. AB123)"),
  password: z.string().min(1, "Password is required"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function Login() {
  const { login, user, accessToken, isInitializing, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const [activeTab, setActiveTab] = useState<"email" | "employee">("email");

  useEffect(() => {
    if (isInitializing || isLoading) return;
    if (accessToken && user) {
      if (user.role === "super_admin") setLocation("/admin");
      else if (user.role === "developer" || user.role === "tester") setLocation("/dev");
      else if (user.role === "client") setLocation("/client");
    }
  }, [isInitializing, isLoading, accessToken, user, setLocation]);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { identifier: "", password: "" },
  });

  if (isInitializing || (accessToken && isLoading)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const onSubmit = (values: EmailFormValues | EmployeeFormValues) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        login(data.accessToken, data.refreshToken, data.user);
        toast.success("Login successful");
      },
      onError: (error: any) => {
        toast.error(getApiErrorMessage(error, "Failed to sign in. Check your email and password."));
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* LEFT SIDE (brand panel) */}
      <div 
        className="hidden md:flex flex-1 flex-col justify-between p-8 lg:p-10 relative overflow-hidden border-r border-border/50"
        style={{ 
          backgroundColor: "hsl(220 13% 7%)",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", 
          backgroundSize: "24px 24px" 
        }}
      >
        {/* Radial Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-600/15 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-12">
            <AppLogo size="xl" />
          </div>
          <div className="space-y-6">
            <p className="text-base text-muted-foreground max-w-xs leading-relaxed font-medium">
              The command center for software agencies.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-md flex items-center justify-center bg-green-400/10">
                  <CheckCircle className="h-3 w-3 text-green-400" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Real-time project tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-md flex items-center justify-center bg-blue-400/10">
                  <Shield className="h-3 w-3 text-blue-400" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-md flex items-center justify-center bg-purple-400/10">
                  <Users className="h-3 w-3 text-purple-400" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Multi-role team management</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <div className="flex flex-col gap-3">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Trusted by 50+ software agencies</p>
            <div className="flex items-center">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className={`h-6 w-6 rounded-full bg-muted border-2 border-background ${i !== 1 ? "-ml-2" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (login form) */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background/50">
        <div className="w-full max-w-sm">
          <Card 
            className="bg-card border border-border/60 shadow-2xl rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 32px 80px -12px rgba(0,0,0,0.7)" }}
          >
            <CardHeader className="space-y-1.5 pt-8 pb-6 px-8">
              <CardTitle className="text-lg font-semibold tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "employee")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 h-10 rounded-lg">
                  <TabsTrigger 
                    value="email" 
                    className="rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    Email
                  </TabsTrigger>
                  <TabsTrigger 
                    value="employee" 
                    className="rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    Employee ID
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="email" className="mt-0 outline-none">
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={emailForm.control}
                        name="identifier"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute left-3 top-2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <Input 
                                  placeholder="name@agency.com" 
                                  className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-primary/20 transition-all h-8" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={emailForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                              <a href="#" className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors">Forgot password?</a>
                            </div>
                            <FormControl>
                              <div className="relative group">
                                <Lock className="absolute left-3 top-2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <Input 
                                  type="password" 
                                  placeholder="••••••••" 
                                  className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-primary/20 transition-all h-8" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full h-9 mt-2 font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign in"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="employee" className="mt-0 outline-none">
                  <Form {...employeeForm}>
                    <form onSubmit={employeeForm.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={employeeForm.control}
                        name="identifier"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee ID</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <UserIcon className="absolute left-3 top-2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <Input 
                                  placeholder="e.g. DE001" 
                                  className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-primary/20 transition-all h-8" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={employeeForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                              <a href="#" className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors">Forgot password?</a>
                            </div>
                            <FormControl>
                              <div className="relative group">
                                <Lock className="absolute left-3 top-2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <Input 
                                  type="password" 
                                  placeholder="••••••••" 
                                  className="pl-9 bg-muted/30 border-border/50 focus-visible:ring-primary/20 transition-all h-8" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full h-9 mt-2 font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign in"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              <div className="mt-8">
                <Separator className="bg-border/40" />
                <p className="text-[10px] text-muted-foreground text-center mt-6">
                  {BRAND.copyright}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
