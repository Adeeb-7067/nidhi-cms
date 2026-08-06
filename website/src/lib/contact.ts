/** Shared contact / inquiry helpers for marketing forms. */

export type ContactIntent = "inquiry" | "newsletter" | "quote" | "meeting";

export type ContactPayload = {
  name?: string;
  email: string;
  message?: string;
  intent?: ContactIntent;
  page?: string;
};

export type ContactApiResult = {
  ok: boolean;
  delivery: "accepted" | "mailto";
  mailto?: string;
  error?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeContactPayload(raw: unknown): ContactPayload | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Invalid payload." };
  const body = raw as Record<string, unknown>;
  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "").trim();
  const message = String(body.message ?? "").trim();
  const intent = (String(body.intent ?? "inquiry") as ContactIntent) || "inquiry";
  const page = String(body.page ?? "").trim();

  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid work email." };
  if (intent !== "newsletter" && name.length < 2) return { error: "Enter your name." };
  if (intent !== "newsletter" && message.length < 8) {
    return { error: "Tell us a bit more about what you’re building." };
  }
  if (name.length > 120 || email.length > 200 || message.length > 4000) {
    return { error: "Message is too long." };
  }

  return {
    email,
    name: name || undefined,
    message: message || undefined,
    intent,
    page: page || undefined,
  };
}

export function buildContactMailto(
  to: string,
  payload: ContactPayload,
): string {
  const intent = payload.intent ?? "inquiry";
  const subject =
    intent === "newsletter"
      ? "Newsletter signup — Satyakabir"
      : intent === "quote"
        ? "Project quote request — Satyakabir"
        : intent === "meeting"
          ? "Meeting request — Satyakabir"
          : "Project inquiry — Satyakabir";

  const lines = [
    payload.name ? `Name: ${payload.name}` : null,
    `Email: ${payload.email}`,
    payload.page ? `Page: ${payload.page}` : null,
    "",
    payload.message || "(No message body)",
  ].filter((line): line is string => line !== null);

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export async function submitContact(
  payload: ContactPayload,
): Promise<ContactApiResult> {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as ContactApiResult;
    if (!res.ok) {
      return { ok: false, delivery: "mailto", error: data.error || "Could not send." };
    }
    return data;
  } catch {
    return { ok: false, delivery: "mailto", error: "Network error. Try again or email us directly." };
  }
}
