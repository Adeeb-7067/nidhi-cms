"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { site } from "@/data/mock";
import { submitContact, type ContactIntent } from "@/lib/contact";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "mailto" | "error";

type FieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE_LENGTH = 2000;

function validate(fields: {
  name: string;
  email: string;
  message: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) errors.name = "Name is required.";
  if (!fields.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(fields.email)) errors.email = "Enter a valid email address.";
  if (!fields.message.trim()) errors.message = "Please describe what you're building.";
  else if (fields.message.length > MAX_MESSAGE_LENGTH)
    errors.message = `Message must be under ${MAX_MESSAGE_LENGTH} characters.`;
  return errors;
}

const inputBase =
  "min-h-11 w-full rounded-xl border bg-muted px-4 py-3 text-small outline-none transition-colors disabled:opacity-60";
const inputNormal = "border-border focus:border-brand-blue/50";
const inputError = "border-[var(--color-error)] focus:border-[var(--color-error)]/60";

/**
 * Inquiry form used on contact / quote experience pages.
 * Posts to `/api/contact`; falls back to mailto when no inbox webhook is configured.
 */
export function ContactInquiryForm({
  intent = "inquiry",
  accent,
  className,
  submitLabel = "Send signal",
}: {
  intent?: ContactIntent;
  accent?: string;
  className?: string;
  submitLabel?: string;
}) {
  const pathname = usePathname();
  const [focus, setFocus] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const markTouched = (field: string) =>
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const fields = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    // Mark all fields as touched on submit
    setTouched(new Set(["name", "email", "message"]));

    const errors = validate(fields);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Focus the first field with an error
      const firstErrorField = Object.keys(errors)[0];
      const el = form.querySelector<HTMLElement>(`[name="${firstErrorField}"]`);
      el?.focus();
      return;
    }

    setStatus("sending");

    const payload = {
      ...fields,
      intent,
      page: pathname || undefined,
    };

    const result = await submitContact(payload);
    if (!result.ok) {
      setStatus("error");
      setError(result.error || "Could not send.");
      return;
    }

    if (result.delivery === "mailto" && result.mailto) {
      window.location.href = result.mailto;
      setStatus("mailto");
      form.reset();
      setFieldErrors({});
      setTouched(new Set());
      return;
    }

    setStatus("sent");
    form.reset();
    setFieldErrors({});
    setTouched(new Set());
  };

  const showError = (field: keyof FieldErrors) =>
    touched.has(field) && fieldErrors[field];

  return (
    <form
      className={cn("w-full space-y-3", className)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
      }}
      onSubmit={onSubmit}
      noValidate
    >
      {accent ? (
        <div
          aria-hidden
          className={`pointer-events-none fixed left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl transition-opacity ${focus ? "opacity-40" : "opacity-0"}`}
          style={{ background: accent }}
        />
      ) : null}

      <div>
        <label htmlFor="contact-name" className="mb-1.5 block text-label text-secondary-foreground">
          Your name <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          required
          autoComplete="name"
          placeholder="Your name"
          disabled={status === "sending"}
          onBlur={() => markTouched("name")}
          aria-invalid={!!showError("name")}
          aria-describedby={showError("name") ? "contact-name-error" : undefined}
          className={cn(inputBase, showError("name") ? inputError : inputNormal)}
        />
        {showError("name") && (
          <p id="contact-name-error" className="mt-1 text-[12px] text-[var(--color-error)]" role="alert">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-label text-secondary-foreground">
          Work email <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Work email"
          disabled={status === "sending"}
          onBlur={() => markTouched("email")}
          aria-invalid={!!showError("email")}
          aria-describedby={showError("email") ? "contact-email-error" : undefined}
          className={cn(inputBase, showError("email") ? inputError : inputNormal)}
        />
        {showError("email") && (
          <p id="contact-email-error" className="mt-1 text-[12px] text-[var(--color-error)]" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-label text-secondary-foreground">
          What are you building? <span className="text-[var(--color-error)]">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Tell us about your project, timeline, and goals…"
          disabled={status === "sending"}
          onBlur={() => markTouched("message")}
          aria-invalid={!!showError("message")}
          aria-describedby={showError("message") ? "contact-message-error" : undefined}
          className={cn(inputBase, showError("message") ? inputError : inputNormal)}
        />
        {showError("message") && (
          <p id="contact-message-error" className="mt-1 text-[12px] text-[var(--color-error)]" role="alert">
            {fieldErrors.message}
          </p>
        )}
      </div>

      <PremiumButton type="submit" className="w-full justify-center" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : submitLabel}
      </PremiumButton>

      <p className="text-center text-[12px] text-muted-foreground" role="status" aria-live="polite">
        {status === "sent"
          ? "Received — a principal will reply within one business day."
          : status === "mailto"
            ? `Opening your email app to finish sending to ${site.email}.`
            : status === "error"
              ? error
              : `Or email ${site.email} directly.`}
      </p>
    </form>
  );
}
