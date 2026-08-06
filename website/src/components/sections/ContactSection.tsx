"use client";

import { useState, type FormEvent } from "react";
import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { Logo } from "@/components/brand/Logo";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { contact, faqs, site } from "@/data/mock";
import { submitContact } from "@/lib/contact";

export function ContactSection({ currentFrame }: { currentFrame: number }) {
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const onNewsletter = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewsletterStatus("sending");
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    const result = await submitContact({ email, intent: "newsletter", page: "/" });
    if (!result.ok) {
      setNewsletterStatus("error");
      return;
    }
    if (result.delivery === "mailto" && result.mailto) {
      window.location.href = result.mailto;
    }
    setNewsletterStatus("done");
    form.reset();
  };

  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={226} endFrame={240} fadeFrames={3}>
      <div className="absolute inset-0 bg-[#020305] pointer-events-none" />
      <div className="absolute inset-0 opacity-50 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(43,107,255,0.22),transparent_45%)]" />
      <p className="pointer-events-none absolute inset-x-0 top-[28%] text-center font-deco text-[clamp(3rem,14vw,10rem)] text-white/[0.035] leading-none select-none">
        SIGNAL
      </p>

      <SectionPanel>
        <div className="flex flex-col items-center text-center pt-1 pb-5">
          <p className="text-eyebrow text-muted-foreground mb-3">{contact.chapter}</p>
          <h2 className="font-display text-[clamp(2.2rem,6vw,4.2rem)] leading-[1.05] mb-4 max-w-3xl">
            <span className="block text-white">{contact.title[0]}</span>
            <span className="block text-brand-gradient">{contact.title[1]}</span>
            <span className="block text-white">{contact.title[2]}</span>
          </h2>
          <p className="mb-5 max-w-xl text-[14px] leading-relaxed text-white/60">{contact.subtitle}</p>

          <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row">
            <PremiumButton
              onClick={() => {
                window.location.href = `mailto:${site.email}?subject=Project%20inquiry`;
              }}
            >
              {contact.cta}
            </PremiumButton>
            <a href={`mailto:${site.email}`} className="text-label text-white/65 hover:text-white">
              {site.email}
            </a>
          </div>

          <div className="mb-6 grid w-full max-w-lg grid-cols-3 gap-2">
            {contact.offices.map((o) => (
              <div key={o.city} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-0.5 font-display text-[15px] text-white">{o.city}</div>
                <div className="text-meta text-muted-foreground">{o.detail}</div>
              </div>
            ))}
          </div>

          <div className="mb-6 grid w-full max-w-3xl grid-cols-1 gap-2 text-left md:grid-cols-2">
            {faqs.slice(0, 4).map((item) => (
              <GlassCard key={item.q} className="p-3.5" interactive={false}>
                <h3 className="mb-1 font-display text-[14px] text-white">{item.q}</h3>
                <p className="line-clamp-2 text-[11px] leading-relaxed text-white/45">{item.a}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        <footer className="border-t border-white/10 pb-2 pt-6">
          <div className="mb-6 grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Logo size="sm" />
                <span className="font-display text-[14px] text-white">{site.brand}</span>
              </div>
              <p className="mb-3 text-[12px] text-white/45">{site.tagline}</p>
              <form className="flex gap-2" onSubmit={onNewsletter}>
                <label htmlFor="film-newsletter-email" className="sr-only">
                  Work email for newsletter
                </label>
                <input
                  id="film-newsletter-email"
                  name="email"
                  type="email"
                  required
                  placeholder="Work email"
                  disabled={newsletterStatus === "sending"}
                  className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-brand-cyan/50 disabled:opacity-60"
                />
                <PremiumButton
                  type="submit"
                  magnetic={false}
                  className="!px-4 !py-2 !text-[10px]"
                  disabled={newsletterStatus === "sending"}
                >
                  {newsletterStatus === "sending" ? "…" : "Join"}
                </PremiumButton>
              </form>
              <p className="mt-2 text-[11px] text-white/40" role="status" aria-live="polite">
                {newsletterStatus === "done"
                  ? "Thanks — check your email client if prompted."
                  : newsletterStatus === "error"
                    ? "Could not subscribe. Try again."
                    : contact.newsletter}
              </p>
            </div>
            <div>
              <div className="text-meta mb-3 text-muted-foreground">Explore</div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {contact.footerLinks.map((link) => {
                  const href =
                    link === "Home"
                      ? "/"
                      : link === "Services"
                        ? "/services"
                        : link === "Work" || link === "Projects"
                          ? "/work"
                          : link === "About"
                            ? "/company/about-us"
                            : link === "Contact"
                              ? "/contact"
                              : link === "Technologies"
                                ? "/technologies"
                                : link === "Careers"
                                  ? "/careers"
                                  : link === "Insights"
                                    ? "/insights"
                                    : "#";
                  return (
                    <a key={link} href={href} className="text-[13px] text-white/55 hover:text-white">
                      {link}
                    </a>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-meta mb-3 text-muted-foreground">Connect</div>
              <div className="flex gap-4">
                {contact.socials
                  .filter((s) => s.href && s.href !== "#")
                  .map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-white/55 hover:text-white"
                    >
                      {s.label}
                    </a>
                  ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-3 sm:flex-row">
            <span className="text-meta text-white/25">{site.copyright}</span>
            <div className="flex gap-4">
              {contact.legal.map((item) => (
                <span key={item} className="text-meta text-white/25">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </footer>
      </SectionPanel>
    </SectionWrapper>
  );
}
