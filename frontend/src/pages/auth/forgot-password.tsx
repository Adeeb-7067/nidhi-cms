import React, { useState } from "react";
import { Link, useLocation } from "wouter";
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
import {
  forgotPasswordOtp,
  resetPasswordWithOtp,
  verifyResetOtp,
} from "@/api/password-auth";
import { AppLogo } from "@/components/brand/AppLogo";
import { LoginBackground } from "@/components/auth/LoginBackground";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const id = window.setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const requestOtp = async () => {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPasswordOtp(trimmed);
      setEmail(trimmed);
      if (res.devOtp) setDevOtpHint(res.devOtp);
      startCooldown(res.expiresInSeconds ?? 60);
      setStep("otp");
      toast.success(res.message);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send verification code."));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await verifyResetOtp(email, otp);
      setStep("password");
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid or expired code."));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithOtp({ email, otp, newPassword });
      setStep("done");
      toast.success("Password updated. You can sign in now.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-dvh w-full overflow-hidden text-slate-900">
      <LoginBackground />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex justify-center">
            <AppLogo size="md" />
          </div>

          <Link
            href="/login"
            className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>

          <h1 className="text-xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "email" && "We will email you a 6-digit verification code."}
            {step === "otp" && `Enter the code sent to ${email}`}
            {step === "password" && "Choose a new password"}
            {step === "done" && "Your password has been reset."}
          </p>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {devOtpHint && (
            <Alert className="mt-4">
              <AlertDescription className="font-mono text-xs">
                Dev mode — code: {devOtpHint}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 space-y-4">
            {step === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void requestOtp()}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={() => void requestOtp()} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send verification code
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup className="w-full justify-center">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button className="w-full" onClick={() => void verifyOtp()} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs"
                  disabled={cooldown > 0 || loading}
                  onClick={() => void requestOtp()}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Button>
              </>
            )}

            {step === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <PasswordInput
                    id="newPassword"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void resetPassword()}
                  />
                </div>
                <Button className="w-full" onClick={() => void resetPassword()} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set new password
                </Button>
              </>
            )}

            {step === "done" && (
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Go to sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
