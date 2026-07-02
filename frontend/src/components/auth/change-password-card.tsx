import React, { useState } from "react";
import { useChangeMyPassword } from "@/api";
import { requestChangePasswordOtp } from "@/api/password-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

type Mode = "current" | "otp";

/** Cooldown before "Resend code" re-enables — independent of the OTP's own validity window. */
const RESEND_COOLDOWN_SECONDS = 60;

export function ChangePasswordCard({
  userEmail,
  compact,
}: {
  userEmail?: string;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const changeMutation = useChangeMyPassword();

  const [mode, setMode] = useState<Mode>("current");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
  });
  const [error, setError] = useState("");

  const startCooldown = (seconds: number) => {
    setOtpCooldown(seconds);
    const id = window.setInterval(() => {
      setOtpCooldown((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    setError("");
    try {
      const res = await requestChangePasswordOtp();
      setOtpSent(true);
      setMode("otp");
      startCooldown(RESEND_COOLDOWN_SECONDS);
      if (res.devOtp) setDevOtpHint(res.devOtp);
      toast({
        title: "Code sent",
        description: res.emailConfigured
          ? `Check ${userEmail ?? "your email"} for a 6-digit code.`
          : "SMTP is not configured — see server logs for the dev code.",
      });
    } catch (err) {
      toast({
        title: "Could not send code",
        description: getApiErrorMessage(err, "Try again shortly."),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (mode === "current" && !form.currentPassword) {
      setError("Enter your current password or use email verification");
      return;
    }
    if (mode === "otp" && form.otp.length !== 6) {
      setError("Enter the 6-digit verification code");
      return;
    }

    try {
      await changeMutation.mutateAsync({
        data: {
          newPassword: form.newPassword,
          ...(mode === "otp"
            ? { otp: form.otp }
            : { currentPassword: form.currentPassword }),
        },
      });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setOtpSent(false);
      setMode("current");
      setDevOtpHint(null);
    } catch (err) {
      toast({
        title: "Password change failed",
        description: getApiErrorMessage(err, "Could not update your password."),
        variant: "destructive",
      });
    }
  };

  const containerClass = compact
    ? "space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3"
    : "space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4";

  return (
    <form onSubmit={handleSubmit} className={containerClass}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Use current password or email OTP verification
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {devOtpHint && (
        <Alert>
          <AlertDescription className="font-mono text-xs">
            Dev mode — verification code: {devOtpHint}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          variant={mode === "current" ? "default" : "outline"}
          onClick={() => setMode("current")}
          className="justify-start"
        >
          Current password
        </Button>
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          variant={mode === "otp" ? "default" : "outline"}
          onClick={() => {
            setMode("otp");
            if (!otpSent) void sendOtp();
          }}
          className="justify-start"
        >
          <Mail className="mr-1.5 h-3.5 w-3.5" />
          Email code
        </Button>
      </div>

      {mode === "current" ? (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Verification code</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={otpCooldown > 0}
              onClick={() => void sendOtp()}
            >
              {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend code"}
            </Button>
          </div>
          <InputOTP
            maxLength={6}
            value={form.otp}
            onChange={(v) => setForm({ ...form, otp: v })}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-muted-foreground">
            Code sent to {userEmail ?? "your account email"}. Expires in 10 minutes.
          </p>
        </div>
      )}

      <div className={compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"}>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Password should be at least 8 characters and include upper/lowercase letters and numbers.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={changeMutation.isPending}>
          {changeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </div>
    </form>
  );
}
