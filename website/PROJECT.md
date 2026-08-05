# Satyakabir Technologies — Project Documentation & Code Analysis

Complete overview of the **Cinematic-Scroll** codebase: architecture, runtime flow, modules, design system, data, routes, and maintenance notes.

**Last updated:** 5 Aug 2026

---

## 1. Product summary

| | |
|--|--|
| **Product** | Premium marketing site for Satyakabir Technologies |
| **Type** | UI-only (no backend, API, auth, or database) |
| **Home experience** | Scroll-scrubbed headquarters film (dense-keyframe MP4) with timed chapter overlays |
| **Site IA** | Enterprise nav + hubs + **composed** detail pages for every leaf (~110 leaves) |
| **Stack** | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · GSAP · Lenis · Motion |
| **Theme** | Light + dark (navbar `ThemeToggle`) |
| **Package manager** | npm |

Visitors land on a cinematic homepage. Scroll advances a canvas film. Overlays tell the brand story. Mega menus open services, work, industries, and more. Each leaf page is assembled from an **explicit section list** (page composition) plus page-specific content — not a shared “kind template” layout.

---

## 2. Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (hubs + all nav leaves)
npm start            # serve production build
npm run lint         # ESLint
npm run scrub        # re-encode seek-friendly scrub MP4 / mobile / poster
npm run frames       # optional: extract JPG fallback sequence (local only)
```

| Script | File / behavior |
|--------|-----------------|
| `dev` / `build` / `start` | Next.js App Router |
| `scrub` | `scripts/encode-scrub.mjs` — dense-keyframe desktop/mobile MP4 + poster (+ WebM) |
| `frames` | `scripts/extract-frames.mjs` — optional JPG fallback → `public/frames/` (gitignored) |

**Source film:** `public/TITLE__Satyakabir_Technologies.mp4`  
**Scrub assets:** `*.scrub.mp4`, `*.scrub.mobile.mp4`, `*.poster.jpg`  
**Frames (optional):** `public/frames/` — local fallback only; not shipped in production.  
Logical story still uses `TOTAL_FRAMES = 720` / `FRAME_START = 4` in `src/data/cinematic.ts` for chapter timing.

---

## 3. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  RootLayout (fonts, globals.css, ThemeProvider, ChatBot)    │
└─────────────────────────────────────────────────────────────┘
          │
          ├─ /  → CinematicHome
          │         · LoadingScreen
          │         · AtmosphereLayer (frame → veil)
          │         · PremiumNavbar (cinematic jumps + theme toggle)
          │         · CinematicCanvas (MP4 scrub → canvas)
          │         · ScrollScrubber (tall track + ChapterStages)
          │         · ChapterProgress (place + jump dots)
          │         · Lenis + GSAP ScrollTrigger
          │
          └─ /{section}/[{slug}]  → LeafMarketingPage
                    · PremiumNavbar (site + theme toggle)
                    · ExperienceShell + ExperienceComposer
                    · resolveComposition(section, slug) → SectionBlocks
                    · resolvePageContent → buildExperience payload
                    · SiteFooter
```

### Runtime data flow (homepage)

```
User scroll (Lenis; native scroll if reduced-motion)
    → tall ScrollScrubber document (~height scaled to frame count)
    → GSAP ScrollTrigger scrub maps scroll → logical frame number
    → useFrameScrubber.setCurrentFrame(n)
    → video.currentTime seek (dense-keyframe MP4) → canvas draw
       · poster paints first; mobile/save-data uses lighter MP4
       · optional JPG fallback only if video cannot load
    → ChapterStage(s) fade by exclusive [start, end] frame ranges
    → AtmosphereLayer picks veil/glow for active chapter
```

Constants live in **one place**: `src/data/cinematic.ts`  
(`TOTAL_FRAMES = 720`, `FRAME_START = 4`, `FRAME_FADE = 12`). Chapter UI ranges are **exclusive** (no overlapping start/end), so only one overlay is fully on-screen at a time.

### Runtime data flow (detail / leaf pages)

```
navigation leaf (section + slug)
    → buildExperience()
         · matchKind()           → accent / lean profile defaults
         · resolvePageContent()  → summary, chapters, faqs, CTA, overrides
    → ExperiencePage / ExperienceShell
    → resolveComposition(sectionId, slug, kind)
         · explicit sections[] from page-compositions/*
         · never inherit a full kind layout template
    → ExperienceComposer maps section id → SectionBlocks / ExperienceBlocks
         · optional props.layout (grid|bento|rail|split|…) for placement
```

**Architecture rule:** reuse **components**, not **page structure**. Every navbar leaf should own its section stack and body copy.

---

## 4. Repository map

```
Cinematic-Scroll/
├── public/
│   ├── brand/sk-logo.png
│   ├── TITLE__Satyakabir_Technologies.mp4
│   ├── TITLE__Satyakabir_Technologies.scrub.mp4
│   ├── TITLE__Satyakabir_Technologies.scrub.mobile.mp4
│   ├── TITLE__Satyakabir_Technologies.poster.jpg
│   └── frames/                      # optional local JPG fallback (gitignored)
├── scripts/
│   ├── encode-scrub.mjs
│   └── extract-frames.mjs
├── src/
│   ├── app/                              # App Router
│   │   ├── layout.tsx                    # Fonts + ThemeProvider + ChatBot
│   │   ├── page.tsx                      # → CinematicHome
│   │   ├── globals.css                   # Tokens + xp-* utilities
│   │   └── {company,services,…}/
│   │         ├── page.tsx                # Section hub
│   │         └── [slug]/page.tsx         # Leaf → LeafMarketingPage
│   ├── components/
│   │   ├── CinematicHome.tsx
│   │   ├── CinematicCanvas.tsx
│   │   ├── ScrollScrubber.tsx
│   │   ├── AtmosphereLayer.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── ChatBot.tsx
│   │   ├── brand/Logo.tsx
│   │   ├── theme/ThemeToggle.tsx
│   │   ├── nav/                          # PremiumNavbar, MegaMenu, …
│   │   ├── sections/                     # ChapterStage, SectionWrapper
│   │   ├── experiences/
│   │   │   ├── ExperiencePage.tsx        # Shell only
│   │   │   ├── ExperienceComposer.tsx    # Section registry
│   │   │   ├── ExperienceBlocks.tsx      # Cards, pipeline, mosaic, …
│   │   │   ├── primitives.tsx            # Reveal, FAQ, orbit, …
│   │   │   └── sections/SectionBlocks.tsx
│   │   ├── pages/                        # MarketingShell, SectionPages
│   │   └── ui/
│   ├── data/
│   │   ├── cinematic.ts                  # Frames + 16 chapters
│   │   ├── navigation.ts                 # Full IA
│   │   ├── experiences.ts                # Kinds + buildExperience()
│   │   ├── catalog.ts / mock.ts
│   │   ├── page-content/                 # Narratives + slug overrides
│   │   │   ├── index.ts                  # resolvePageContent()
│   │   │   ├── kind-narratives.ts
│   │   │   ├── slug-overrides.ts
│   │   │   └── types.ts
│   │   └── page-compositions/            # Explicit layouts per leaf
│   │       ├── index.ts                  # resolveComposition()
│   │       ├── types.ts                  # SectionId, BlockLayout
│   │       ├── helpers.ts / defaults.ts
│   │       ├── company.ts … contact-insights.ts
│   │       └── …
│   ├── hooks/                            # useFrameScrubber, useLenis
│   └── lib/                              # cn(), pickFromSlug(), slug helpers
├── PROJECT.md
├── README.md
└── package.json
```

### Legacy / unused (still in tree)

Older cinematic section components exist but are **not mounted** by current home:

- `HeroSection.tsx`, `AboutSection.tsx`, `ServicesSection.tsx`, …  
- `Navbar.tsx`, `SiteHeader.tsx`, `DetailShell.tsx`, `CustomCursor.tsx`, `AuroraBackground.tsx`

Prefer `ChapterStage` + `PremiumNavbar` + experiences. Safe to delete later after confirming no imports.

---

## 5. Code analysis by module

### 5.1 App entry & layout

| File | Role |
|------|------|
| `src/app/layout.tsx` | Fonts as CSS variables; metadata; theme provider; global `ChatBot` |
| `src/app/page.tsx` | Client home → `CinematicHome` |
| `src/app/globals.css` | Semantic colors (light + dark), type scale, spacing, `xp-*` section rhythm |

**Fonts**

| Variable | Family | Role |
|----------|--------|------|
| `--font-syne` | Syne 600–800 | Display / headings |
| `--font-limelight` | Limelight | Decorative watermarks / pull quotes only |
| `--font-manrope` | Manrope | UI, body, nav, buttons |
| `--font-noto` | Noto Sans Mono | Eyebrows, meta, micro labels |

### 5.2 Cinematic engine

| Module | Responsibility |
|--------|----------------|
| `useFrameScrubber` | Image cache, initial batch, sliding preload, DPR canvas draw |
| `useLenis` | Lenis + `ScrollTrigger.update()` |
| `ScrollScrubber` | Tall scroll track; GSAP scrub; mounts chapters |
| `CinematicCanvas` | Fullscreen `<canvas>` |
| `AtmosphereLayer` | Active chapter glow/veil |
| `LoadingScreen` | Progress until initial frames ready |

**Scrub notes:** JPG sequence (not MP4 scrub); `FRAME_START = 4`; reduced motion snaps/simplifies.

### 5.3 Chapter system (`ChapterStage.tsx`)

One component, three layout paths: `hero`, `intro`, and standard sub-layouts (`split-stats`, `service-grid`, `project-rail`, `chip-cloud`, `quote`, `career`, `finale`, …).

**Overlay mechanics (`SectionWrapper`)**

- Fixed panels; opacity from frame vs `[start − fade, end + fade]`
- `pointer-events` only when interactive so Lenis keeps scroll
- Clears nav via `--nav-h`; `.hero-panel` reserves bottom cue band

### 5.4 Navigation

| File | Role |
|------|------|
| `navigation.ts` | Full IA tree + mega featured + breadcrumbs helpers |
| `PremiumNavbar` | Glass bar; primary + More; Cmd+K; mobile; progress; **ThemeToggle** |
| `MegaMenu` / `MobileNav` / `CommandPalette` / `Breadcrumbs` | IA surfaces |

Primary desktop: `company`, `services`, `solutions`, `work`, `insights`.  
More: `technologies`, `industries`, `careers`, `contact`.

### 5.5 Detail pages — composition engine

| File | Role |
|------|------|
| `SectionPages.tsx` | Hubs + `LeafMarketingPage` → `buildExperience` → `ExperiencePage` |
| `ExperiencePage.tsx` | Shell (nav offset, ambient mesh, breadcrumbs) only |
| `ExperienceComposer.tsx` | Registry: section id → React block |
| `sections/SectionBlocks.tsx` | Heroes, highlight, chapters, values, metrics, CTA, FAQ, … |
| `ExperienceBlocks.tsx` | Capability cards, pipeline, mosaic, related strip |
| `page-compositions/*` | **Explicit** `sections[]` per slug (company, services, …) |
| `page-compositions/index.ts` | `resolveComposition()` — missing slug → bare fallback + dev warn |
| `page-content/*` | Kind narratives + per-slug overrides (copy, FAQs, CTAs, metrics) |
| `experiences.ts` | `matchKind`, accents, lean profile defaults, `buildExperience` |

Kinds still supply **tokens** (accent, default metrics/stack when a page does not override) and emergency bare layouts. They must **not** define the visual recipe for every leaf in a section.

### 5.6 Layout variants (`BlockLayout`)

Same section type can place content differently via `props.layout` (or deterministic `pickFromSlug` when omitted):

| Block | Layouts |
|-------|---------|
| Cards | `grid` · `bento` · `rail` · `split` · `index` |
| Highlight / text | `flush` · `split-text` · `display` · `center` · `pull` |
| Pipeline | `flow` · `ladder` · `compact` |
| Chapters | `magazine` · `cascade` · `ledger` |
| Values | `columns` · `stack` · `pair` |
| Metrics | `grid` · `rail` · `compact` |

### 5.7 ChatBot

- Fixed bottom-right **SK Assist** (mock keyword replies)
- Mounted once in `layout.tsx`

### 5.8 UI primitives

`PremiumButton`, `Magnetic`, `Logo`, theme toggle, glass helpers.

---

## 6. Homepage chapters (film map)

Defined in `src/data/cinematic.ts` → `chapters[]`.

| # | id | Layout | Frames (approx.) | Story |
|---|-----|--------|------------------|--------|
| 00 | arrival | `hero` | 4–72 | Brand + analytics strip |
| 01 | lobby | `intro` | 64–130 | Headquarters |
| 02 | gallery | `split-stats` | 118–168 | About |
| 03 | ai | `service-grid` | 160–215 | AI systems |
| 04 | studio | `editorial-left` | 174–225 | Product engineering |
| 05 | cloud | `service-grid` | 219–270 | Cloud & DevOps |
| 06 | lab | `editorial-left` | 264–315 | R&D |
| 07 | boardroom | `split-stats` | 309–360 | Outcomes |
| 08 | client | `project-rail` | 354–405 | Case studies |
| 09 | global | `chip-cloud` | 399–450 | Industries |
| 10 | voices | `quote` | 444–495 | Testimonials |
| 11 | awards | `badge-row` | 489–540 | Proof |
| 12 | stack | `stack-grid` | 534–585 | Technologies |
| 13 | careers | `career` | 579–630 | Careers |
| 14 | contact | `contact` | 624–675 | Contact |
| 15 | finale | `finale` | 669–720 | Closing |

Each chapter has an `atmosphere` id for veil/glow.

---

## 7. Design system

Tokens: `src/app/globals.css`.

### Color

Supports **light** (`:root`) and **dark** (`.dark`).

| Role | Light (approx.) | Dark (approx.) |
|------|-----------------|----------------|
| Background | `#f3f5f9` | `#020305` |
| Surface | `#ffffff` / `#e8edf5` | `#090d14` / `#111827` |
| Foreground | `#0b1220` | `#ffffff` |
| Secondary text | `#1e293b` | `#c8d0da` |
| Muted text | `#475569` | `#8e98a6` |
| Brand blue / green / orange / cyan / purple | Shared brand ramp | Shared brand ramp |

**Rule:** one dominant accent per section; CTAs use blue→cyan. Prefer semantic tokens over hard-coded hex in components.

### Experience page utilities

| Class | Role |
|-------|------|
| `.xp-section` / `-sm` / `-lg` | Shared horizontal pad + vertical rhythm (8pt scale) |
| `.xp-title` | Hero display (capped fluid size) |
| `.xp-heading` | Section h2 rhythm |
| `.xp-prose` / `.xp-prose-sm` | Body / small body (Manrope) |
| `.text-eyebrow` / `.text-meta` | Mono labels |
| `.page-offset` | Clears floating nav (`--nav-h`) |
| `.page-pad` | Horizontal page gutters |

Do **not** put long body copy in Limelight (`.font-deco`) — deco is for watermarks and short pull lines only.

### Spacing & chrome

- 8pt scale: `--spacing-ds-*` (4 → 128)
- `--nav-h: 6.5rem`, `--grid-max: 1200px`
- Scrollbars hidden site-wide; scroll still works

---

## 8. Data layer

| File / folder | Owns |
|---------------|------|
| `cinematic.ts` | Frame constants, atmospheres, film chapters |
| `navigation.ts` | Full IA, mega featured, breadcrumbs, leaf generators |
| `mock.ts` / `catalog.ts` | Shared marketing / hub catalogs |
| `experiences.ts` | Kind matching, accents, lean defaults, `buildExperience` |
| `page-content/` | Production copy: narratives + **slug overrides** (preferred for uniqueness) |
| `page-compositions/` | **Page structure** per leaf — section order + layout props |

**Edit content and layouts in data — not by forking components per page.**  
No fetch/network for marketing data. Unpublished facts stay labeled `[Placeholder]`.

### Navbar leaf coverage (compositions)

Every leaf under these sections should have an explicit entry in the matching composition map:

| Section | Composition file |
|---------|------------------|
| company | `company.ts` |
| services | `services.ts` |
| solutions | `solutions.ts` |
| technologies | `technologies.ts` |
| industries | `industries.ts` + `industry-catalog.ts` |
| work | `work.ts` |
| insights / contact | `contact-insights.ts` |
| careers | `careers.ts` |

Missing slug → bare fallback + `[composition] Missing…` warning in development.

---

## 9. Routes

| Pattern | Renderer |
|---------|----------|
| `/` | Cinematic home |
| `/{section}` | Hub (`SectionHubPage`) |
| `/{section}/{slug}` | `buildExperience` → `ExperienceComposer` |
| `/sitemap.xml` | Generated from navigation leaves |
| `/robots.txt` | Allow all + sitemap pointer |
| Unknown | `not-found.tsx` (`noindex`) |

Sections: `company`, `services`, `solutions`, `technologies`, `industries`, `work`, `insights`, `careers`, `contact`.

### SEO

| Piece | Location |
|-------|----------|
| Site URL | `NEXT_PUBLIC_SITE_URL` or default `https://satyakabir.org` (`src/data/seo.ts`) |
| Root metadata | `src/app/layout.tsx` — `metadataBase`, title template, OG/Twitter |
| Home / hubs / leaves | `homeMetadata`, `hubMetadata`, `leafExperienceMetadata` → `buildPageMetadata` |
| Sitemap / robots | `src/app/sitemap.ts`, `src/app/robots.ts` |
| JSON-LD | Organization + WebSite in layout; WebPage + BreadcrumbList + FAQPage on leaves |
| Leaf copy SEO | Prefer `seoTitle` / `seoDescription` in `page-content/slug-overrides.ts` |

Set `NEXT_PUBLIC_SITE_URL` in production so canonicals and Open Graph URLs match the live domain.
---

## 10. Important behaviors & gotchas

1. **Pointer events** — Overlays mostly `pointer-events: none`; interactive islands opt in.
2. **Nested scroll** — Mega menus / chat may scroll internally; scrollbars hidden.
3. **Scrub assets required** — Missing scrub MP4 → poster / blank canvas. JPG `public/frames` is optional fallback only.
4. **Heavy assets** — Prefer dense-keyframe scrub MP4 (~4MB desktop / ~1.5MB mobile); do not ship 720 JPGs to production.
5. **No frame counters in UI** — Frame indices are internal.
6. **Hero (film)** — Analytics strip; chat is a contact affordance; no custom cursor.
7. **Composition ≠ kind** — Changing `matchKind` alone will not redesign a page; edit `page-compositions/{section}.ts`.
8. **Shared kind cards/metrics** — If a section renders `cards` / `metrics` / `stack` without props or slug overrides, leaves can look identical. Prefer composition props or `slug-overrides`.
9. **Reveal** — Content stays visible by default (transform polish only); do not gate readability on opacity `0`.
10. **Client components** — Canvas, Lenis, GSAP, nav, chapters, chatbot, composer are `"use client"`.

---

## 11. How to change common things

| Goal | Where |
|------|-------|
| Film chapter copy / frame timing | `src/data/cinematic.ts` |
| Nav labels / mega items | `src/data/navigation.ts` |
| **Leaf page structure** (section order, layouts) | `src/data/page-compositions/{section}.ts` |
| **Leaf page copy** (summary, FAQs, CTA, metrics) | `src/data/page-content/slug-overrides.ts` |
| Kind-wide fallback narrative | `src/data/page-content/kind-narratives.ts` |
| New section block type | Add `SectionId` + renderer in `SectionBlocks` + registry in `ExperienceComposer` |
| Colors / type / spacing | `src/app/globals.css` + `layout.tsx` fonts |
| Theme toggle | `src/components/theme/ThemeToggle.tsx` |
| Chat replies | `src/components/ChatBot.tsx` |
| Re-bake scrub film | `npm run scrub` |
| Optional JPG fallback | `npm run frames` (local only; gitignored) |

### Adding a new leaf checklist

1. Add leaf to `navigation.ts`
2. Add composition entry for `section/slug`
3. Add `slug-overrides` copy (summary, chapters/cards as needed, unique CTA)
4. Confirm `generateStaticParams` already covers the section
5. Hard-refresh and compare against a sibling leaf (structure + copy should differ)

---

## 12. Suggested next improvements

- Delete unused legacy section / cursor / aurora files once confirmed unused
- Compress frame JPGs (or WebP sequence) for Lighthouse
- Replace Unsplash placeholders with real client work / photography
- Deepen slug overrides for Services / Solutions the way Company was audited
- Optional real chat backend behind SK Assist
- CMS later if non-dev editors need to edit chapters/IA
- Optional: `PRODUCT.md` / design register via `/impeccable init`

---

## 13. History

- Converted from a Replit-style pnpm monorepo (API/DB stubs) → standalone Next.js UI + npm
- Video scrub replaced by JPG sequence for scrub quality
- Custom cursor removed; frame counters kept out of UI
- Display fonts evolved → **Syne** bold + Limelight deco + Manrope + Noto Mono
- Enterprise IA + mega menus + Cmd+K + mobile overlay
- Immersive detail pages introduced via experience kinds
- **2026-08-04 — Composition rewrite:** kind *layout* templates removed; explicit page compositions for all navbar leaves; page-content overrides; layout variants for cards/text/pipeline; Company leaves de-templated (no shared “what defines us / how we partner” blocks); light/dark contrast + `xp-*` spacing/type polish; theme toggle in navbar

---

## 14. Motion elevation (current craft layer)

Architecture is unchanged for the film. Detail pages use Motion for section polish.

| Layer | What improved |
|-------|----------------|
| `SectionWrapper` | Eased chapter enter/exit; scene accent; grain |
| `ScrollScrubber` | Silkier scrub lag |
| `AtmosphereLayer` | Longer scene light morphs |
| `PremiumButton` / `Magnetic` | Shine, press, spring magnetism |
| `Reveal` | Subtle Y motion; **content always readable** (no opacity-gated blanking) |
| `ExperienceShell` | Accent-aware ambient mesh |
| `ScanGrid` / `CloudStack` / FAQ | Eased scan, bars, accordion |
| Navbar | Progress + hover; theme toggle |
| Reduced motion | Honored in scrub, magnetic, CSS animations, reveal |

**Intentionally not shipped:** liquid custom cursor, decorative-only particle spam, returning to kind layout templates.
