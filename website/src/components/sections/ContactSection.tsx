"use client";

import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { Logo } from "@/components/brand/Logo";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { contact, faqs, site } from "@/data/mock";

export function ContactSection({ currentFrame }: { currentFrame: number }) {
  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={226} endFrame={240} fadeFrames={3}>
      <div className="absolute inset-0 bg-[#020305] pointer-events-none" />
      <div className="absolute inset-0 opacity-50 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(43,107,255,0.22),transparent_45%)]" />
      <p className="pointer-events-none absolute inset-x-0 top-[28%] text-center font-deco text-[clamp(3rem,14vw,10rem)] text-white/[0.035] leading-none select-none">
        SIGNAL
      </p>

      <SectionPanel>
        <div className="flex flex-col items-center text-center pt-1 pb-5">
          <p className="text-eyebrow text-muted-foreground mb-3">
            {contact.chapter}
          </p>
          <h2 className="font-display text-[clamp(2.2rem,6vw,4.2rem)] leading-[1.05] mb-4 max-w-3xl">
            <span className="block text-white">{contact.title[0]}</span>
            <span className="block text-brand-gradient">{contact.title[1]}</span>
            <span className="block text-white">{contact.title[2]}</span>
          </h2>
          <p className="text-[14px] text-white/60 max-w-xl leading-relaxed mb-5">{contact.subtitle}</p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <PremiumButton
              onClick={() => {
                window.location.href = `mailto:${site.email}?subject=Project%20inquiry`;
              }}
            >
              {contact.cta}
            </PremiumButton>
            <a
              href={`mailto:${site.email}`}
              className="text-label text-white/65 hover:text-white"
            >
              {site.email}
            </a>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full max-w-lg mb-6">
            {contact.offices.map((o) => (
              <div key={o.city} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="font-display text-[15px] text-white mb-0.5">{o.city}</div>
                <div className="text-meta text-muted-foreground">
                  {o.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-3xl w-full text-left mb-6">
            {faqs.slice(0, 4).map((item) => (
              <GlassCard key={item.q} className="p-3.5" interactive={false}>
                <h3 className="font-display text-[14px] text-white mb-1">{item.q}</h3>
                <p className="text-[11px] text-white/45 leading-relaxed line-clamp-2">{item.a}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        <footer className="border-t border-white/10 pt-6 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-left">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Logo size="sm" />
                <span className="font-display text-[14px] text-white">{site.brand}</span>
              </div>
              <p className="text-[12px] text-white/45 mb-3">{site.tagline}</p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Work email"
                  className="flex-1 rounded-full bg-white/[0.04] border border-white/10 px-3 py-2 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-brand-cyan/50"
                  aria-label="Newsletter email"
                />
                <PremiumButton type="submit" magnetic={false} className="!px-4 !py-2 !text-[10px]">
                  Join
                </PremiumButton>
              </form>
            </div>
            <div>
              <div className="text-meta text-muted-foreground mb-3">
                Explore
              </div>
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
                            ? "/"
                            : link === "Contact"
                              ? "/"
                              : link === "Technologies"
                                ? "/"
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
              <div className="text-meta text-muted-foreground mb-3">
                Connect
              </div>
              <div className="flex gap-4">
                {contact.socials.map((s) => (
                  <a key={s.label} href={s.href} className="text-[13px] text-white/55 hover:text-white">
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-2 pt-3 border-t border-white/[0.06]">
            <span className="text-meta text-white/25">
              {site.copyright}
            </span>
            <div className="flex gap-4">
              {contact.legal.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-meta text-white/25 hover:text-white/50"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </SectionPanel>
    </SectionWrapper>
  );
}
