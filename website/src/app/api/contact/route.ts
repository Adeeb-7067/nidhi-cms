import { NextResponse } from "next/server";
import { site } from "@/data/mock";
import {
  buildContactMailto,
  normalizeContactPayload,
  type ContactApiResult,
  type ContactPayload,
} from "@/lib/contact";

export const runtime = "nodejs";

const TO = process.env.CONTACT_TO_EMAIL?.trim() || site.email;

async function deliverViaWebhook(payload: ContactPayload) {
  const url = process.env.CONTACT_WEBHOOK_URL?.trim();
  if (!url) return false;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      ...payload,
      source: "satyakabir-website",
      receivedAt: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
  return true;
}

async function deliverViaResend(payload: ContactPayload) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  const from = process.env.CONTACT_FROM_EMAIL?.trim() || "Satyakabir Website <onboarding@resend.dev>";
  const intent = payload.intent ?? "inquiry";
  const subject =
    intent === "newsletter"
      ? `[Newsletter] ${payload.email}`
      : `[${intent}] ${payload.name ?? "Inquiry"} — ${payload.email}`;

  const text = [
    `Intent: ${intent}`,
    payload.name ? `Name: ${payload.name}` : null,
    `Email: ${payload.email}`,
    payload.page ? `Page: ${payload.page}` : null,
    "",
    payload.message ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [TO],
      reply_to: payload.email,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
  }
  return true;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, delivery: "mailto", error: "Invalid JSON." } satisfies ContactApiResult,
      { status: 400 },
    );
  }

  const normalized = normalizeContactPayload(json);
  if ("error" in normalized) {
    return NextResponse.json(
      { ok: false, delivery: "mailto", error: normalized.error } satisfies ContactApiResult,
      { status: 400 },
    );
  }

  const mailto = buildContactMailto(TO, normalized);

  try {
    if (await deliverViaWebhook(normalized)) {
      return NextResponse.json({ ok: true, delivery: "accepted" } satisfies ContactApiResult);
    }
    if (await deliverViaResend(normalized)) {
      return NextResponse.json({ ok: true, delivery: "accepted" } satisfies ContactApiResult);
    }
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json(
      {
        ok: true,
        delivery: "mailto",
        mailto,
        error: "Inbox delivery unavailable — opening your email client.",
      } satisfies ContactApiResult,
    );
  }

  // No webhook/Resend configured: client completes send via mailto.
  return NextResponse.json({
    ok: true,
    delivery: "mailto",
    mailto,
  } satisfies ContactApiResult);
}
