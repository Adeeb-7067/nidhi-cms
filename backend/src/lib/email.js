import nodemailer from "nodemailer";
import { logger } from "./logger.js";

/** @type {import("nodemailer").Transporter | null} */
let transporter = null;

function getSmtpUser() {
  return process.env.SMTP_USER?.trim() || process.env.EMAIL_USER?.trim() || null;
}

function getSmtpPass() {
  const raw = process.env.SMTP_PASS ?? process.env.EMAIL_PASS ?? "";
  return String(raw).replace(/\s+/g, "");
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    getSmtpUser()
  );
}

function isLocalhostUrl(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value);
}

function resolveAppUrl() {
  const explicit =
    process.env.APP_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    "";
  if (explicit) return explicit;

  const origins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const nonLocal = origins.find((origin) => !isLocalhostUrl(origin));
  if (nonLocal) return nonLocal;
  return origins[0] || "http://localhost:5173";
}

function buildTransportOptions() {
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (smtpUrl) {
    return { url: smtpUrl };
  }

  const user = getSmtpUser();
  const pass = getSmtpPass();
  const service = process.env.SMTP_SERVICE?.trim() || (user?.includes("@gmail.") ? "gmail" : null);
  const host = process.env.SMTP_HOST?.trim();

  if (!service && !host && !user) return null;

  if (service) {
    return {
      service,
      auth: user ? { user, pass } : undefined
    };
  }

  if (!host) return null;

  return {
    host,
    port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: user ? { user, pass } : undefined
  };
}

function getTransporter() {
  if (transporter) return transporter;
  const options = buildTransportOptions();
  if (!options) return null;

  transporter =
    "url" in options
      ? nodemailer.createTransport(options.url)
      : nodemailer.createTransport(options);

  return transporter;
}

export function isEmailConfigured() {
  return Boolean(buildTransportOptions() && getFromAddress());
}

/** Verify SMTP connection at startup (non-fatal). */
export async function verifyMailer() {
  const transport = getTransporter();
  const from = getFromAddress();
  if (!transport || !from) {
    logger.warn("Nodemailer: SMTP not configured — emails will be skipped");
    return { ok: false, reason: "not_configured" };
  }
  try {
    await transport.verify();
    logger.info({ from }, "Nodemailer: SMTP connection verified");
    return { ok: true };
  } catch (err) {
    logger.error({ err, from }, "Nodemailer: SMTP verification failed");
    return { ok: false, reason: "verify_failed" };
  }
}

function wrapHtmlEmail({ title, bodyHtml, ctaLabel, ctaHref }) {
  const appName = process.env.VITE_APP_NAME?.trim() || process.env.APP_NAME?.trim() || "CMS";
  const ctaBlock =
    ctaLabel && ctaHref
      ? `<p style="margin:24px 0 0"><a href="${ctaHref}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${ctaLabel}</a></p>`
      : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e4e4e7">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em">${appName}</p>
                <h1 style="margin:0 0 16px;font-size:20px;color:#18181b">${title}</h1>
                <div style="font-size:15px;line-height:1.6;color:#3f3f46">${bodyHtml}</div>
                ${ctaBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Send email via Nodemailer.
 * @param {{ to: string; subject: string; text: string; html?: string; replyTo?: string }} params
 */
export async function sendEmail({ to, subject, text, html, replyTo }) {
  const from = getFromAddress();
  const transport = getTransporter();
  if (!from || !transport) {
    logger.warn({ to, subject }, "Nodemailer: email skipped — SMTP not configured");
    return { sent: false, reason: "not_configured" };
  }

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text,
      html: html ?? text.replace(/\n/g, "<br>"),
      replyTo: replyTo ?? undefined
    });
    logger.info({ to, subject, messageId: info.messageId }, "Nodemailer: email sent");
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error({ err, to, subject }, "Nodemailer: email send failed");
    return { sent: false, reason: "send_failed" };
  }
}

/**
 * Branded HTML email for daily log hour reminders.
 */
export async function sendDailyLogComplianceEmail({ to, name, date, loggedHours, requiredHours, remainingHours }) {
  const subject = "Daily log hours incomplete";
  const text = [
    `Hi ${name},`,
    "",
    `You logged ${loggedHours.toFixed(1)}h on ${date}. Required: ${requiredHours.toFixed(1)}h.`,
    `Please add ${remainingHours.toFixed(1)}h more in your daily logs.`,
    "",
    "Open Daily Logs in the CMS to complete your timesheet."
  ].join("\n");

  const appUrl = resolveAppUrl();

  const html = wrapHtmlEmail({
    title: subject,
    bodyHtml: `
      <p style="margin:0 0 12px">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 12px">Your daily log total for <strong>${date}</strong> is incomplete.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px 0;color:#71717a">Logged</td><td style="padding:8px 0;text-align:right;font-weight:600">${loggedHours.toFixed(1)}h</td></tr>
        <tr><td style="padding:8px 0;color:#71717a">Required</td><td style="padding:8px 0;text-align:right;font-weight:600">${requiredHours.toFixed(1)}h</td></tr>
        <tr><td style="padding:8px 0;color:#71717a">Remaining</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#dc2626">${remainingHours.toFixed(1)}h</td></tr>
      </table>
      <p style="margin:0">Please submit additional daily log entries to meet your required hours.</p>
    `,
    ctaLabel: "Open Daily Logs",
    ctaHref: `${appUrl.replace(/\/$/, "")}/dev/logs`
  });

  return sendEmail({ to, subject, text, html });
}

/**
 * Password reset / change verification OTP.
 */
export async function sendPasswordOtpEmail({ to, name, otp, purpose }) {
  const isChange = purpose === "change_password";
  const subject = isChange ? "Your password change code" : "Your password reset code";
  const text = [
    `Hi ${name},`,
    "",
    `Your verification code is: ${otp}`,
    "",
    "This code expires in 10 minutes.",
    isChange
      ? "If you did not request a password change, ignore this email."
      : "If you did not request a password reset, ignore this email.",
  ].join("\n");

  const html = wrapHtmlEmail({
    title: subject,
    bodyHtml: `
      <p style="margin:0 0 12px">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 16px">Use this verification code to ${isChange ? "confirm your new password" : "reset your password"}:</p>
      <p style="margin:0 0 16px;font-size:28px;font-weight:700;letter-spacing:0.2em;font-family:monospace;color:#18181b">${otp}</p>
      <p style="margin:0;color:#71717a;font-size:13px">Expires in 10 minutes. Do not share this code.</p>
    `,
  });

  return sendEmail({ to, subject, text, html });
}
