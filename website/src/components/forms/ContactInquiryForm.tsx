"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { site } from "@/data/mock";
import { submitContact, type ContactIntent } from "@/lib/contact";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "mailto" | "error";

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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
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
      return;
    }

    setStatus("sent");
    form.reset();
  };

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
        <label htmlFor="contact-name" className="sr-only">
          Your name
        </label>
        <input
          id="contact-name"
          name="name"
          required
          autoComplete="name"
          placeholder="Your name"
          disabled={status === "sending"}
          className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-3 text-small outline-none focus:border-brand-blue/50 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="sr-only">
          Work email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Work email"
          disabled={status === "sending"}
          className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-3 text-small outline-none focus:border-brand-blue/50 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="sr-only">
          What are you building?
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          placeholder="What are you building?"
          disabled={status === "sending"}
          className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-3 text-small outline-none focus:border-brand-blue/50 disabled:opacity-60"
        />
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
