import React, { useState } from "react";
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
import { toast } from "sonner";
import { Lock, Mail, User as UserIcon, Zap } from "lucide-react";

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
  const { login } = useAuth();
  const loginMutation = useLogin();
  const [activeTab, setActiveTab] = useState<"email" | "employee">("email");

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = (values: EmailFormValues | EmployeeFormValues) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        login(data.accessToken, data.refreshToken, data.user);
        toast.success("Login successful");
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to login");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Brand Side */}
      <div className="hidden md:flex flex-1 flex-col justify-center items-start p-12 lg:p-24 bg-sidebar border-r border-border">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
            <Zap size={22} className="text-primary-foreground fill-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Nexus CMS</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
          The precision-crafted operations hub for software agencies. Ship faster, track perfectly.
        </p>
      </div>

      {/* Login Side */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-border/50 shadow-2xl bg-card">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-semibold tracking-tight text-card-foreground">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "employee")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted">
                <TabsTrigger value="email" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Email</TabsTrigger>
                <TabsTrigger value="employee" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Employee ID</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="name@agency.com" className="pl-9 bg-input/50" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={emailForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>Password</FormLabel>
                            <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input type="password" placeholder="••••••••" className="pl-9 bg-input/50" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full mt-2" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="employee">
                <Form {...employeeForm}>
                  <form onSubmit={employeeForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={employeeForm.control}
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="e.g. DE001" className="pl-9 bg-input/50" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>Password</FormLabel>
                            <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input type="password" placeholder="••••••••" className="pl-9 bg-input/50" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full mt-2" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
