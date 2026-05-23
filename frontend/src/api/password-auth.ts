import { customFetch } from "./custom-fetch";

export type ForgotPasswordResponse = {
  message: string;
  expiresInSeconds?: number;
  emailConfigured?: boolean;
  devOtp?: string;
};

export async function forgotPasswordOtp(
  email: string,
  options?: RequestInit,
): Promise<ForgotPasswordResponse> {
  return customFetch<ForgotPasswordResponse>("/api/auth/forgot-password", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetOtp(
  email: string,
  otp: string,
  options?: RequestInit,
): Promise<{ valid: boolean; message: string }> {
  return customFetch("/api/auth/verify-reset-otp", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPasswordWithOtp(
  input: { email: string; otp: string; newPassword: string },
  options?: RequestInit,
): Promise<{ message: string }> {
  return customFetch("/api/auth/reset-password", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(input),
  });
}

export async function requestChangePasswordOtp(
  options?: RequestInit,
): Promise<ForgotPasswordResponse> {
  return customFetch<ForgotPasswordResponse>("/api/auth/change-password/request-otp", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
}
