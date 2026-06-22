import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { Lock, Mail, User as UserIcon, CheckCircle, Shield, Users, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { BRAND } from "@/lib/brand";
import { AppLoadingScreen } from "@/components/loading";
import { LoginLottie } from "@/components/auth/LoginLottie";
import { LoginBackground } from "@/components/auth/LoginBackground";
import { isDevPortalRole } from "@/lib/navigation";
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
  { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", label: "Real-time project tracking" },
  { icon: Shield, color: "text-blue-600", bg: "bg-blue-500/10", ring: "ring-blue-500/20", label: "Enterprise-grade security" },
  { icon: Users, color: "text-violet-600", bg: "bg-violet-500/10", ring: "ring-violet-500/20", label: "Multi-role team management" },
] as const;

const spring = { type: "spring" as const, stiffness: 260, damping: 24 };

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const logoReveal = {
  hidden: { opacity: 0, scale: 0.82, rotate: -8 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { delay: 0.06, duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const brandNameReveal = {
  hidden: { opacity: 0, x: 16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const tabMotion = {
  initial: { opacity: 0, x: 20, filter: "blur(4px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -20, filter: "blur(4px)" },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

const fieldStagger = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

type LoginFormPanelProps = {
  mode: "email" | "employee";
  form: UseFormReturn<EmailFormValues> | UseFormReturn<EmployeeFormValues>;
  onSubmit: (values: EmailFormValues | EmployeeFormValues) => void;
  isPending: boolean;
  showForgotLink?: boolean;
};

function LoginFormPanel({ mode, form, onSubmit, isPending, showForgotLink }: LoginFormPanelProps) {
  const isEmail = mode === "email";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <motion.div custom={0} variants={fieldStagger} initial="hidden" animate="show">
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
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-blue-600" />
                    ) : (
                      <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-blue-600" />
                    )}
                    <Input
                      placeholder={isEmail ? "name@agency.com" : "e.g. DE001"}
                      className="h-11 border-slate-200/80 bg-white/90 pl-9 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/25"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </motion.div>

        <motion.div custom={1} variants={fieldStagger} initial="hidden" animate="show">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Password
                  </FormLabel>
                  {showForgotLink ? (
                    <a
                      href="/forgot-password"
                      className="text-[10px] font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                      Forgot password?
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400">Use email tab to reset</span>
                  )}
                </div>
                <FormControl>
                  <div className="group relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-blue-600" />
                    <PasswordInput
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-11 border-slate-200/80 bg-white/90 pl-9 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/25"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </motion.div>

        <motion.div custom={2} variants={fieldStagger} initial="hidden" animate="show">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
            <Button
              type="submit"
              className="group relative h-11 w-full overflow-hidden bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500"
              disabled={isPending}
            >
              <motion.span
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
              />
              {isPending ? (
                <span className="relative flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </Form>
  );
}

function LoginTabs({
  activeTab,
  onChange,
}: {
  activeTab: "email" | "employee";
  onChange: (tab: "email" | "employee") => void;
}) {
  return (
    <div className="relative mb-5 grid h-11 grid-cols-2 rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/60">
      <motion.div
        className="absolute inset-y-1 rounded-lg bg-white shadow-md shadow-slate-200/80 ring-1 ring-slate-200/50"
        layout
        transition={spring}
        style={{
          width: "calc(50% - 4px)",
          left: activeTab === "email" ? 4 : "calc(50% + 0px)",
        }}
      />
      {(["email", "employee"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`relative z-10 rounded-lg text-xs font-semibold transition-colors duration-200 ${
            activeTab === tab ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab === "email" ? "Email" : "Employee ID"}
        </button>
      ))}
    </div>
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
      else if (isDevPortalRole(user.role)) setLocation("/dev");
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
      <AppLoadingScreen
        message="Preparing your workspace"
        submessage="Signing you in…"
      />
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
    <div className="fixed inset-0 h-dvh w-full overflow-hidden text-slate-900">
      <LoginBackground />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col lg:flex-row">
        {/* Hero — desktop */}
        <motion.section
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="hidden h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-white/50 bg-white/30 px-8 py-8 backdrop-blur-md lg:flex xl:px-14"
        >
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-5">
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <motion.div
                variants={logoReveal}
                initial="hidden"
                animate="show"
                className="shrink-0"
                whileHover={{ scale: 1.05, rotate: 2, transition: spring }}
              >
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <AppLogo size="lg" className="drop-shadow-md" />
                </motion.div>
              </motion.div>
              <motion.p
                variants={brandNameReveal}
                initial="hidden"
                animate="show"
                className="whitespace-nowrap text-sm font-bold leading-normal tracking-tight text-slate-900 sm:text-base xl:text-lg"
              >
                Satya Kabir E Solutions Private Limited
              </motion.p>
            </div>

            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="shrink-0">
              <motion.span
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/90 px-3 py-1 text-[11px] font-medium text-blue-700 shadow-sm"
                animate={{ boxShadow: ["0 0 0 0 rgba(59,130,246,0)", "0 0 0 8px rgba(59,130,246,0)", "0 0 0 0 rgba(59,130,246,0)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Sparkles className="h-3 w-3" />
                Welcome to {BRAND.shortName}
              </motion.span>
            </motion.div>

            <motion.h1
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent xl:text-4xl"
            >
              Your agency command center
            </motion.h1>

            <motion.p custom={4} variants={fadeUp} initial="hidden" animate="show" className="max-w-md shrink-0 text-sm leading-relaxed text-slate-600">
              {BRAND.description}
            </motion.p>

            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="shrink-0">
              <LoginLottie className="h-[160px] w-full max-w-[300px] xl:h-[180px]" />
            </motion.div>

            <ul className="grid shrink-0 gap-3">
              {FEATURES.map((feature, i) => (
                <motion.li
                  key={feature.label}
                  custom={i + 6}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  whileHover={{ x: 6, transition: { duration: 0.2 } }}
                  className="flex cursor-default items-center gap-3 rounded-xl border border-white/60 bg-white/50 px-3 py-2.5 shadow-sm backdrop-blur-sm"
                >
                  <motion.div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${feature.bg} ${feature.ring}`}
                    whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                  >
                    <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  </motion.div>
                  <span className="text-sm font-medium text-slate-700">{feature.label}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Sign-in */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-6 sm:px-8 lg:px-12"
        >
          <div className="flex w-full max-w-[420px] flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mb-5 shrink-0 lg:hidden"
            >
              <AppLogo size="md" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full shrink-0"
            >
              <motion.div
                className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-blue-400/40 via-indigo-400/20 to-violet-400/30 opacity-70 blur-sm"
                animate={{ opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative overflow-hidden rounded-2xl border border-white/90 bg-white/95 px-6 py-7 shadow-2xl shadow-blue-900/10 backdrop-blur-xl sm:px-8">
                <motion.div
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 5, repeat: Infinity }}
                />

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="relative mb-6 space-y-1"
                >
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                  <p className="text-sm text-slate-500">Sign in to continue to your workspace</p>
                </motion.div>

                <LoginTabs activeTab={activeTab} onChange={setActiveTab} />

                <AnimatePresence mode="wait">
                  {activeTab === "email" ? (
                    <motion.div key="email" {...tabMotion}>
                      <LoginFormPanel
                        mode="email"
                        form={emailForm}
                        onSubmit={onSubmit}
                        isPending={loginMutation.isPending}
                        showForgotLink
                      />
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

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="relative mt-6"
                >
                  <Separator className="bg-slate-200/80" />
                  <p className="mt-4 text-center text-[10px] text-slate-400">{BRAND.copyright}</p>
                </motion.div>
              </div>
            </motion.div>

            {/* Mobile feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex flex-wrap justify-center gap-2 lg:hidden"
            >
              {FEATURES.map((f, i) => (
                <motion.span
                  key={f.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 + i * 0.08 }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ring-1 ${f.bg} ${f.ring} ${f.color}`}
                >
                  <f.icon className="h-3 w-3" />
                  {f.label.split(" ")[0]}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
