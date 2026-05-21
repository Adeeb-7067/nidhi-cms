import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { Lock, Mail, User as UserIcon, CheckCircle, Shield, Users, Sparkles, Loader2 } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { BRAND } from "@/lib/brand";
import { LoginLottie } from "@/components/auth/LoginLottie";
import { AnimatePresence, motion } from "framer-motion";

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

const FEATURES = [
  { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10", label: "Real-time project tracking" },
  { icon: Shield, color: "text-blue-600", bg: "bg-blue-500/10", label: "Enterprise-grade security" },
  { icon: Users, color: "text-violet-600", bg: "bg-violet-500/10", label: "Multi-role team management" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const tabMotion = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.25 },
};

type LoginFormPanelProps = {
  mode: "email" | "employee";
  form: UseFormReturn<EmailFormValues> | UseFormReturn<EmployeeFormValues>;
  onSubmit: (values: EmailFormValues | EmployeeFormValues) => void;
  isPending: boolean;
};

function LoginFormPanel({ mode, form, onSubmit, isPending }: LoginFormPanelProps) {
  const isEmail = mode === "email";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {isEmail ? "Email" : "Employee ID"}
              </FormLabel>
              <FormControl>
                <div className="group relative">
                  {isEmail ? (
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  ) : (
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  )}
                  <Input
                    placeholder={isEmail ? "name@agency.com" : "e.g. DE001"}
                    className="h-10 border-slate-200/80 bg-white/80 pl-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/20"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FormLabel className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </FormLabel>
                <a
                  href="#"
                  className="text-[10px] font-medium text-blue-600 transition-colors hover:text-blue-700"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </a>
              </div>
              <FormControl>
                <div className="group relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="h-10 border-slate-200/80 bg-white/80 pl-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-blue-500/20"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            type="submit"
            className="h-10 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700"
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </motion.div>
      </form>
    </Form>
  );
}

export default function Login() {
  const { login, user, accessToken, isInitializing, isLoading } = useAuth();
  const [, setLocation] = useLocation();
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

  useEffect(() => {
    if (isInitializing || isLoading) return;
    if (accessToken && user) {
      if (user.role === "super_admin") setLocation("/admin");
      else if (user.role === "developer" || user.role === "tester") setLocation("/dev");
      else if (user.role === "client") setLocation("/client");
    }
  }, [isInitializing, isLoading, accessToken, user, setLocation]);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  if (isInitializing || (accessToken && isLoading)) {
    return (
      <div className="fixed inset-0 flex h-dvh w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-2 border-blue-600 border-t-transparent"
        />
      </div>
    );
  }

  const onSubmit = (values: EmailFormValues | EmployeeFormValues) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.accessToken, data.refreshToken, data.user);
          toast.success("Login successful");
        },
        onError: (error: unknown) => {
          toast.error(getApiErrorMessage(error, "Failed to sign in. Check your credentials."));
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 h-dvh w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/90 to-indigo-100/80 text-slate-900">
      <motion.div
        className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col lg:flex-row">
        {/* Hero — desktop only */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="hidden h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-white/60 bg-white/40 px-8 py-6 backdrop-blur-sm lg:flex xl:px-12"
        >
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-hidden">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="shrink-0">
              <AppLogo size="lg" className="drop-shadow-sm" />
            </motion.div>

            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                <Sparkles className="h-3 w-3" />
                Welcome to {BRAND.shortName}
              </span>
            </motion.div>

            <motion.h1
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="shrink-0 text-2xl font-bold tracking-tight text-slate-900 xl:text-3xl"
            >
              Your agency command center
            </motion.h1>

            <motion.p
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="line-clamp-2 shrink-0 text-sm leading-snug text-slate-600"
            >
              {BRAND.description}
            </motion.p>

            <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="shrink-0">
              <LoginLottie className="h-[120px] w-full max-w-[240px] xl:h-[140px]" />
            </motion.div>

            <ul className="grid shrink-0 gap-2">
              {FEATURES.map((feature, i) => (
                <motion.li
                  key={feature.label}
                  custom={i + 5}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  className="flex items-center gap-2.5"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${feature.bg}`}>
                    <feature.icon className={`h-3.5 w-3.5 ${feature.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{feature.label}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Sign-in */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6 lg:px-10"
        >
          <div className="flex w-full max-w-[400px] flex-col items-center justify-center">
            <div className="mb-4 shrink-0 lg:hidden">
              <AppLogo size="md" />
            </div>

            <motion.div
              className="w-full shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white/90 px-6 py-6 shadow-xl shadow-slate-300/25 backdrop-blur-xl sm:px-7"
              whileHover={{ boxShadow: "0 20px 40px -12px rgba(59, 130, 246, 0.12)" }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-5 space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                <p className="text-xs text-slate-500">Sign in to continue to your workspace</p>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "email" | "employee")}
                className="w-full"
              >
                <TabsList className="mb-5 grid h-10 w-full grid-cols-2 rounded-lg bg-slate-100/80 p-1">
                  <TabsTrigger
                    value="email"
                    className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Email
                  </TabsTrigger>
                  <TabsTrigger
                    value="employee"
                    className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Employee ID
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <AnimatePresence mode="wait">
                {activeTab === "email" ? (
                  <motion.div key="email" {...tabMotion}>
                    <LoginFormPanel mode="email" form={emailForm} onSubmit={onSubmit} isPending={loginMutation.isPending} />
                  </motion.div>
                ) : (
                  <motion.div key="employee" {...tabMotion}>
                    <LoginFormPanel
                      mode="employee"
                      form={employeeForm}
                      onSubmit={onSubmit}
                      isPending={loginMutation.isPending}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5">
                <Separator className="bg-slate-200/80" />
                <p className="mt-3 text-center text-[10px] text-slate-400">{BRAND.copyright}</p>
              </div>
            </motion.div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
