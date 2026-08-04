import type { PageComposition } from "./types";

/** Careers leaves — unique section stacks, no shared partner/pipeline defaults. */
export const careersCompositions: Record<string, PageComposition> = {
  "why-join-us": {
    motion: "portraits",
    sections: [
      { id: "hero-media" },
      { id: "highlight-band" },
      {
        id: "values",
        props: {
          title: "Why builders stay",
          values: [
            { title: "Hard problems", body: "Production systems clients run under pressure — not busywork." },
            { title: "Principal access", body: "Mentorship that shows up in review and architecture." },
            { title: "Ownership", body: "Ship with accountability from week one." },
          ],
        },
      },
      { id: "chapters-alternating" },
      {
        id: "link-band",
        props: {
          title: "Next steps",
          links: [
            { title: "Open positions", href: "/careers/open-positions", description: "Roles that ship" },
            { title: "Hiring process", href: "/careers/hiring-process", description: "How we evaluate craft" },
            { title: "Benefits", href: "/careers/benefits", description: "Support for deep work" },
            { title: "Culture", href: "/company/culture", description: "How we work" },
          ],
        },
      },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  benefits: {
    motion: "editorial",
    sections: [
      { id: "hero-editorial" },
      { id: "chapters-editorial" },
      {
        id: "cards",
        props: {
          title: "What we invest in",
          cards: [
            { title: "Compensation", summary: "Clear leveling and competitive cash — explained without fog.", meta: "Pay" },
            { title: "Learning budget", summary: "Books, courses, and conferences tied to the craft you practice.", meta: "Growth" },
            { title: "Equipment", summary: "Machines and tools that do not fight deep work.", meta: "Tools" },
            { title: "Health coverage", summary: "Regional packages shared in offer packs. [Placeholder: formal matrix.]", meta: "Health" },
          ],
        },
      },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "open-positions": {
    motion: "default",
    sections: [
      { id: "hero-product" },
      {
        id: "cards",
        props: {
          title: "Roles we usually hire",
          cards: [
            { title: "Platform engineering", summary: "Cloud, reliability, and developer experience.", meta: "Open" },
            { title: "AI systems", summary: "Agents, evals, and production intelligence.", meta: "Open" },
            { title: "Product design", summary: "Systems, motion, and accessibility.", meta: "Open" },
            { title: "Product engineering", summary: "Full-stack delivery with release discipline.", meta: "Open" },
          ],
        },
      },
      { id: "chapters-grid" },
      { id: "pipeline", props: { title: "From apply to offer" } },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  internships: {
    motion: "gallery",
    sections: [
      { id: "hero-media" },
      { id: "highlight-band" },
      { id: "chapters-alternating" },
      { id: "gallery" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  "hiring-process": {
    motion: "timeline",
    sections: [
      { id: "hero-split" },
      {
        id: "timeline",
        props: {
          title: "The process",
          eyebrow: "Hiring",
          timeline: [
            { year: "01", title: "Apply", body: "Resume plus evidence — repos, case studies, designs, writing." },
            { year: "02", title: "Craft interview", body: "Trade-offs you have made — not trivia lightning rounds." },
            { year: "03", title: "Studio session", body: "Collaborate with people you would ship beside." },
            { year: "04", title: "Offer", body: "Clear leveling, compensation, and timeline — either way." },
          ],
        },
      },
      { id: "chapters-editorial" },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },
  culture: {
    motion: "gallery",
    sections: [
      { id: "hero-media" },
      { id: "chapters-alternating" },
      {
        id: "values",
        props: {
          title: "Careers culture",
          values: [
            { title: "Quality is social", body: "Review culture makes excellence normal." },
            { title: "Sustainable intensity", body: "Deadlines are real; burnout is not a badge." },
            { title: "Speak up on risk", body: "Raising concerns early is rewarded." },
          ],
        },
      },
      { id: "gallery" },
      { id: "cta" },
      { id: "related" },
    ],
  },
};
