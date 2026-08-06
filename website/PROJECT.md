# Satyakabir Technologies — Project Documentation & Code Analysis

Complete overview of the **Cinematic-Scroll** codebase: architecture, runtime flow, modules, design system, data, routes, and maintenance notes.

**Last updated:** 6 Aug 2026

---

## 1. Product summary

| | |
|--|--|
| **Product** | Premium marketing site for Satyakabir Technologies |
| **Type** | UI-only (no backend, API, auth, or database) |
| **Home experience** | Scroll-scrubbed HQ film (native `<video>` + master MP4) with timed chapter overlays, then business narrative |
| **Site IA** | Enterprise nav + hubs + **composed** detail pages for every leaf (~110 leaves) |
| **Stack** | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · GSAP · Lenis · Motion |
| **Theme** | Light + dark (navbar `ThemeToggle`) |
| **Package manager** | npm |

### Permanent principle — Universal First Impression

Every marketing surface (home arrival, 9 hubs, ~110 leaves) must answer **without scrolling**:

1. Who is this? → Satyakabir Technologies  
2. Where am I? → human section · page context (never internal kind strings)  
3. What is this page for? → one-line promise  
4. Why care? → outcomes + trust strip  
5. What next? → one primary CTA  

Shared contract: `src/data/first-viewport.ts` + `PurposeChrome` on all `hero-*` variants. Cinema enhances clarity; it never replaces it.

Visitors land on a cinematic homepage. Scroll advances the headquarters film. Overlays tell the brand story. Mega menus open company, services, solutions, technologies, industries, work, insights, careers, and contact. Each leaf page is assembled from an **explicit section list** (page composition) plus page-specific content — not a shared “kind template” layout.

**Quick map of what the site shows:** see [§9 Page inventory](#9-page-inventory--what-each-route-shows).

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

**Source film (desktop preferred):** `public/TITLE__Satyakabir_Technologies.mp4` — shown via native `<video object-fit:cover>` so quality matches opening the file in a player.  
**Scrub / mobile fallbacks:** `*.scrub.mp4`, `*.scrub.mobile.mp4`, `*.poster.jpg`  
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
          │         · PremiumNavbar (memo'd; theme toggle)
          │         · AtmosphereLayer (frame → veil; gated by useFilmInView)
          │         · CinematicCanvas (native <video> master MP4; poster/canvas fallback)
          │         · FilmIsland → ScrollScrubber (tall track + ChapterStages)
          │         · BusinessHero (#what-we-do — the stated offer)
          │         · BusinessNarrative (7 sections: proof → ecosystem → cases)
          │         · SupportingNarrative (6 sections: stack → scale → CTA)
          │         · SiteFooter
          │         · FilmLoadingVeil (fullscreen while the film decodes)
          │         · ChapterProgress (place + jump dots; film-only)
          │         · Lenis + GSAP ScrollTrigger
          │
          ├─ /{section}           → SectionHubPage (group cards → leaves)
          └─ /{section}/{slug}    → LeafMarketingPage / ExperiencePage
                    · PremiumNavbar (site + theme toggle)
                    · ExperienceShell + ExperienceComposer
                    · resolveComposition(section, slug) → SectionBlocks
                    · resolvePageContent → buildExperience payload
                    · SiteFooter
```

### Homepage order

The film opens the page, then the page says out loud what the film only implies.

```
01  FilmIsland → ScrollScrubber   #inside        the cinematic HQ tour
02  BusinessHero                  #what-we-do    the offer, capabilities, 4 trust numbers
─── BusinessNarrative ──────────────────────────────────────────────────────
03  TrustImpact                   #impact        animated proof counters
04  IndustryWall                                 industry marquee
05  IndustriesTransform           #industries    industry cards
06  BusinessResults               #results       measurable outcomes (light)
07  DigitalTransformation         #transformation stage-by-stage flow
08  ServicesEcosystem             #ecosystem     capability graph (click-to-pin)
09  CaseStudies                   #stories       client success stories
─── SupportingNarrative ────────────────────────────────────────────────────
10  TechStack                     #stack         tools + why each (light)
11  TestimonialExperience         #testimonials  client voices
12  WhyChooseUs                   #why-us        differentiators
13  CompanyScale                  #scale         timeline / growth / team
14  GlobalPresence                #global        countries served
15  FinalCta                      #start         start a conversation
16  SiteFooter
```

There is **no title card above the film**. The `arrival` chapter already paints
the brand, offer, and proof strip over the opening frames, so an intro section
would only push the scrub below the fold.

The bypass ("Skip the tour" → `#what-we-do`) is `fixed` and gated on
`useFilmInView`, so it stays reachable for the whole ~1500vh track instead of
scrolling away after one screen. It sits **top-right**: `ChapterProgress` owns
bottom-centre and the chat launcher owns bottom-right.

`ScrollScrubber` seeds its chapter gate `true` and `useFilmInView` seeds `true`
for the same reason — the film covers the viewport at scroll 0, and waiting for
GSAP's first `onToggle` or the observer's first callback left the opening frame
with no title on it.

Both narrative halves are `memo`'d and take no props. The parent re-renders on
every scrubbed frame; re-reconciling thirteen sections at 60fps starves the
scrubber.

### Runtime data flow (the film act)

```
User scroll (Lenis; native scroll if reduced-motion)
    → tall ScrollScrubber track (~1500vh, scaled to frame count)
    → GSAP ScrollTrigger scrub maps scroll → logical frame number
    → useFrameScrubber.setCurrentFrame(n)
    → video.currentTime seek on native <video> (master MP4 on desktop)
       · poster paints first on canvas; then native video takes over
       · mobile/save-data prefers lighter scrub MP4; scrub/JPG if master fails
    → ChapterStage(s) fade by exclusive [start, end] frame ranges
       · gated on useFilmInView — overlays are `fixed`, so an ungated stage
         would paint over sections below the film
    → AtmosphereLayer picks veil/glow for active chapter

… film track ends …

    → 30vh gradient outro dissolves the held final frame into the page surface
    → useFilmInView drops film + atmosphere + chapter rail out of the paint path
```

**Scroll helpers must be film-relative.** The film is a fraction of the document,
so anything jumping to "20% of the film" uses `src/lib/film-scroll.ts`
(`scrollToFilmPct` / `scrollToFilmFraction`), which measures the
`[data-film-track]` element instead of `document.scrollHeight`. Section jumps use
`scrollToId`, which offsets for the fixed navbar. Using document percentages here
silently breaks every jump the moment a section is added.

**Never read layout in a scroll handler on this page.** The scrubber writes styles
every animation frame; a handler that reads `scrollHeight` or
`getBoundingClientRect()` forces a synchronous reflow per frame and visibly
stutters the film. Film visibility uses `useFilmInView` (IntersectionObserver),
and `PremiumNavbar` caches its document height instead of re-measuring.

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
│   │   ├── home/                         # Homepage acts (composition only)
│   │   │   ├── FilmIsland.tsx            # Film wrapper + skip + outro dissolve
│   │   │   ├── FilmLoadingVeil.tsx       # Fullscreen scrub-decode veil
│   │   │   ├── BusinessHero.tsx          # #what-we-do — the stated offer
│   │   │   ├── BusinessNarrative.tsx     # memo'd: sections 03–09
│   │   │   └── SupportingNarrative.tsx   # memo'd: sections 10–15
│   │   ├── digital/                      # The 13 business sections
│   │   │   ├── primitives.tsx            # CountUp, AuroraField, DigitalSection…
│   │   │   ├── TrustImpact.tsx           # stats
│   │   │   ├── IndustryWall.tsx          # marquee
│   │   │   ├── DigitalTransformation.tsx # measured SVG flow spine
│   │   │   ├── BusinessResults.tsx       # outcome ledger (light tone)
│   │   │   ├── CaseStudies.tsx           # device stage
│   │   │   ├── IndustriesTransform.tsx   # industry bento
│   │   │   ├── AgencyReel.tsx            # pinned horizontal reel (unmounted)
│   │   │   ├── GlobalPresence.tsx        # rotating globe
│   │   │   ├── ServicesEcosystem.tsx     # node graph (click-to-pin)
│   │   │   ├── TechStack.tsx             # tools + rationale (light tone)
│   │   │   ├── WhyChooseUs.tsx           # bento
│   │   │   ├── TestimonialExperience.tsx # slider
│   │   │   ├── CompanyScale.tsx          # timeline
│   │   │   └── FinalCta.tsx              # closing frame (#start)
│   │   ├── AtmosphereLayer.tsx
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
│   │   ├── cinematic.ts                  # Frames + 9 film chapters
│   │   ├── digital.ts                    # Copy + metrics for the digital act
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
│   └── lib/                              # cn(), pickFromSlug(), film-scroll, slug helpers
├── PROJECT.md
├── README.md
└── package.json
```

### Deleted

- `HeroSection.tsx` — the film's `arrival` chapter is the film's hero;
  `BusinessHero` is the page's. A third hero component was only ever confusing.
- `Navbar.tsx` — superseded by `PremiumNavbar`.
- `LoadingScreen.tsx` — replaced by `home/FilmLoadingVeil`, which is owned by the
  film rather than by the page.
- `hooks/usePastFilm.ts` — "past the film" is the wrong question now that the page
  continues well beyond it; use `useFilmInView`.
- `digital/DigitalNarrative.tsx` — split into `home/BusinessNarrative` and
  `home/SupportingNarrative`.
- `mock.ts → navItems`, `cinematic.ts → cinematicNav` — both encoded nav targets
  as film percentages, which no longer address anything meaningful.

### Legacy / unused (still in tree)

- `AboutSection.tsx`, `ServicesSection.tsx`, … — superseded by `ChapterStage` and
  the experiences composer.
- `SiteHeader.tsx`, `DetailShell.tsx`, `CustomCursor.tsx`, `AuroraBackground.tsx`
- `digital/AgencyReel.tsx` — built but not mounted; it pins the viewport, which
  fought the film's own scroll ownership.

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
| `useFrameScrubber` | Image cache, initial batch, sliding preload, DPR canvas draw (capped at `MAX_W`) |
| `useLenis` | Lenis + `ScrollTrigger.update()` |
| `useFilmInView` | IntersectionObserver on `[data-film-track]`; gates every fixed film layer |
| `ScrollScrubber` | Tall scroll track; GSAP scrub; mounts chapters only while `isActive` |
| `FilmIsland` | Frames the tour: skip control + outro dissolve |
| `CinematicCanvas` | Fullscreen `<canvas>`; `invisible` when the film is off-screen |
| `AtmosphereLayer` | Active chapter glow/veil; unmounted when the film is off-screen |
| `FilmLoadingVeil` | Fullscreen progress until initial frames ready; never traps input |

**Scrub notes:** JPG sequence (not MP4 scrub); `FRAME_START = 4`; reduced motion snaps/simplifies.

### 5.3 Chapter system (`ChapterStage.tsx`)

One component, three layout paths: `hero`, `intro`, and standard sub-layouts (`split-stats`, `service-grid`, `project-rail`, `chip-cloud`, `quote`, `career`, `finale`, …).

**Overlay mechanics (`SectionWrapper`)**

- Fixed panels; opacity from frame vs `[start − fade, end + fade]`
- `pointer-events` only when interactive so Lenis keeps scroll
- Clears nav via `--nav-h`; side rails via `--film-rail-*`; bottom chrome via `--film-safe-bottom`
- `.section-panel--center` uses `justify-content: safe center` so tall chapters scroll from the top
- `.hero-panel` reserves bottom cue band

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

| # | id | Layout | Frames | Story |
|---|-----|--------|--------|--------|
| 00 | arrival | `hero` | 4–80 | Brand title card: name, offer, proof strip |
| 01 | lobby | `intro` | 81–155 | Headquarters |
| 02 | ai | `service-grid` | 156–240 | AI systems |
| 03 | studio | `editorial-left` | 241–320 | Product engineering |
| 04 | cloud | `cloud-ops` | 321–400 | Cloud & DevOps |
| 05 | lab | `editorial-left` | 401–470 | R&D |
| 06 | boardroom | `split-stats` | 471–545 | Outcomes |
| 07 | client | `project-rail` | 546–640 | Selected work |
| 08 | finale | `finale` | 641–720 | Closing |

Each chapter has an `atmosphere` id for veil/glow.

**Culled from 16 to 9.** Chapters for industries, testimonials, awards, stack,
careers and contact were removed: each duplicated a section that now renders
below the film with far more room, and reading that content off a scrubbing
backdrop was strictly worse. What remains is the part only the film can do —
walking the building.

Frame windows are contiguous and cover the full range, so the film never
scrolls through dead air. If you re-cut them, keep them **exclusive** so only one
overlay is on-screen at a time, and keep the track long enough that each frame
still gets ~18px of scroll (see `ScrollScrubber`).

---

## 6b. Business sections (`components/digital/`)

The film sells craft but never states the offer. These sections do, and they run
in **normal document flow after the film track**, so the cinematic experience is
untouched. Composition lives in `components/home/`, not here.

| Component | Shape |
|-----------|-------|
| `TrustImpact` | Hairline instrument panel, counters from zero |
| `IndustryWall` | Two counter-scrolling marquees, hover pauses |
| `IndustriesTransform` | Bento; imagery desaturated until hover |
| `BusinessResults` | Outcome ledger with filling measure bars (**light**) |
| `DigitalTransformation` | Node chain + SVG spine measured from real positions |
| `ServicesEcosystem` | Node graph; click pins a node and its dependencies |
| `CaseStudies` | Client index → one browser/phone device stage |
| `TechStack` | Layer tabs → per-tool rationale (**light**) |
| `TestimonialExperience` | One-up stage, auto-advance with visible timer |
| `WhyChooseUs` | Bento with mixed tile weights |
| `CompanyScale` | Self-drawing rail + counter band |
| `GlobalPresence` | Orthographic wireframe globe, arcs from the hub |
| `FinalCta` | Drenched closing frame, magnetic primary |

**Rules for this folder**

- Backgrounds go in `DigitalSection`'s `atmosphere` prop, never as children —
  children live inside the `--grid-max` container and would clip.
- Sections carry their own opaque surface. The narrative wrappers stay
  transparent so the film's outro gradient can dissolve the held final frame.
- Long-running frame loops (particles, globe) gate on `IntersectionObserver`.
- Content data lives in `src/data/digital.ts`, never inline in components.

**Tone rhythm.** Thirteen dark aurora sections in a row is visual fatigue, so
`BusinessResults` and `TechStack` use `tone="light"` (`.tone-light` re-declares the
theme tokens, so children need no light-mode variants). Keep the light beats
spread apart — one per half — and never hardcode `text-white` in a section that
might become light.

**Interactions must survive touch.** Hover-only reveals are dead weight on
tablets and touch laptops, which are a real share of enterprise traffic:
`ServicesEcosystem` pins on click, `TechStack` is driven by tabs and buttons.
Controls that imply media (play triangles) are only allowed where an asset
actually exists — otherwise they are links, or nothing.

**Trig values in markup must be quantized.** `Math.cos`/`Math.sin` are
implementation-defined, so Node and the browser disagree in the final bits and
React throws a hydration mismatch on `left: 30.5%` vs `30.499999999999982%`. Use
`quantize()` from `lib/utils` (see `ServicesEcosystem`, `TechOrbit`).

### Protecting the scrubber (read before touching the homepage)

`useFrameScrubber` seeks and draws the film on every animation frame. Anything
that competes for the main thread while scrolling shows up directly as a
stuttering, soft-looking film. Three rules:

1. **Never read layout in a scroll handler.** `scrollHeight`, `offsetHeight`,
   and `getBoundingClientRect()` force a synchronous layout, and the scrubber is
   mutating styles every frame, so the layout is always dirty. Prefer
   `IntersectionObserver` (`useFilmInView`); where a number is unavoidable,
   measure on mount and resize and cache it (see the progress handler in
   `PremiumNavbar`).
2. **Nothing frame-derived may reach the business sections.** `CinematicHome`
   re-renders per frame, so `BusinessNarrative`, `SupportingNarrative`, and
   `PremiumNavbar` are `memo`'d and take no frame props. Passing `currentFrame`
   into any of them re-reconciles that whole tree ~60×/s.
3. **Off-screen work must actually stop.** Sections use `.cv-auto`
   (`content-visibility: auto`), and any `useScroll`-driven stage must only mount
   near the viewport — `useScroll` measures its target on every scroll event.
4. **No blur over the film.** `backdrop-filter` and large `filter: blur()` force
   re-rasterisation of huge surfaces every frame; that was the cause of the
   "blurry, laggy scrub" regression. Use opaque surfaces and gradient overlays.

Off-screen, `CinematicCanvas` goes `invisible` (bitmap retained, so scrolling
back up shows the held frame instantly) and `AtmosphereLayer` unmounts entirely —
it is four gradient layers with nothing to show.

### Scroll reveal system

`globals.css` owns it. Elements set `data-reveal="pending" | "shown"` plus
optional `--reveal-from` / `--reveal-delay`:

```css
@media (scripting: enabled) {
  [data-reveal="pending"] { opacity: 0; transform: var(--reveal-from, translateY(18px)); }
}
```

The hidden state is scoped to `scripting: enabled` on purpose — a crawler, a
headless render, or a JS-disabled visitor gets the visible default instead of a
blank section. **Never hide reveal content with an inline `opacity: 0`.**

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

## 9. Page inventory — what each route shows

Source of truth for **labels and URLs:** `src/data/navigation.ts`.  
Source of truth for **leaf section order:** `src/data/page-compositions/{section}.ts`.  
Source of truth for **leaf copy:** `src/data/page-content/slug-overrides.ts` (+ kind narratives).

### 9.0 How pages are built

| Route shape | What the visitor sees |
|-------------|------------------------|
| `/` | Cinematic home (film + business narrative) — see §3 homepage order |
| `/{section}` | **Hub** — title, summary, mega-menu groups as card grids linking to leaves |
| `/{section}/{slug}` | **Leaf** — composed experience: hero → story blocks (chapters/cards/metrics/timeline/FAQ/…) → CTA → related links |
| `/sitemap.xml` | Generated URL list from navigation leaves |
| `/robots.txt` | Allow all + sitemap pointer |
| Unknown | `not-found.tsx` (`noindex`) |

**Global chrome (every page):** `PremiumNavbar` · **Mission Control** (left capsule, `⇧ Space`) · ChatBot (bottom-right) · `SiteFooter` on hubs/leaves.

**Mission Control / Actions** (`src/components/mission-control/MissionControl.tsx`) — left-edge control matching “Skip the tour” chrome (not a neon AI capsule). Opens a quiet actions panel: search, page suggestions, action list, contact. Shortcut: **Shift+Space**. `Ctrl/Cmd+K` remains CommandPalette.

**Leaf chrome (every detail page):** breadcrumbs → `ExperienceShell` ambient mesh → composed sections → `SiteFooter`.

**Hub chrome:** same shell, but content is a directory of cards (no long narrative).

Sections with hubs + leaves: `company`, `services`, `solutions`, `technologies`, `industries`, `work`, `insights`, `careers`, `contact`.

---

### 9.1 Home — `/`

**Shows:** Satyakabir as a technology engineering company that delivers digital transformation.

| Act | What you see |
|-----|----------------|
| **Film** `#inside` | Scroll-scrubbed HQ tour (native master MP4). Nine chapters (arrival → lobby → AI → studio → cloud → lab → boardroom → client → finale) with brand title, stats strip, and place-based overlays. Skip → `#what-we-do`. |
| **BusinessHero** `#what-we-do` | Stated offer, capabilities, trust numbers |
| **BusinessNarrative** | Trust counters → industry wall → industry cards → results → transformation journey → services ecosystem → case studies |
| **SupportingNarrative** | Tech stack → testimonials → why us → company scale → global presence → final CTA `#start` |
| **SiteFooter** | Links + company close |

---

### 9.2 Company — `/company`

**Hub shows:** People, principles, and presence behind Satyakabir — cards into the leaves below.

| Path | Page shows |
|------|------------|
| `/company/about-us` | Who Satyakabir is — AI-first engineering identity |
| `/company/our-story` | Origin story — Bhopal roots to global delivery |
| `/company/mission` | Mission — software that feels inevitable |
| `/company/vision` | Vision — intelligent infrastructure as default |
| `/company/leadership` | Leadership — principals who still ship |
| `/company/our-team` | Team — engineers, designers, researchers, operators |
| `/company/culture` | Culture — craft, clarity, shared ownership |
| `/company/life-at-satyakabir` | Life at SK — rituals, remote pods, HQ gravity |
| `/company/infrastructure` | How platforms are built and run |
| `/company/global-presence` | Delivery footprint across continents |
| `/company/awards` | Awards and craft proof |
| `/company/certifications` | ISO / assurance / trust signals |
| `/company/partners` | Cloud, AI, and ecosystem alliances |
| `/company/corporate-social-responsibility` | Civic / CSR technology work |
| `/careers` *(from Company mega)* | Shortcuts into Careers hub |

---

### 9.3 Services — `/services`

**Hub shows:** Practice areas — intelligence, product/platforms, cloud & assurance.

| Path | Page shows |
|------|------------|
| `/services/ai-development` | End-to-end intelligent product systems |
| `/services/machine-learning` | Production ML that survives real traffic |
| `/services/generative-ai` | Content, code, and decision copilots |
| `/services/llm-solutions` | RAG, fine-tuning, governance |
| `/services/agentic-ai` | Autonomous workflows with guardrails *(featured)* |
| `/services/web-development` | High-performance web products |
| `/services/enterprise-applications` | Systems of record that stay agile |
| `/services/product-engineering` | Prototype → release trains |
| `/services/saas-development` | Multi-tenant platforms + FinOps |
| `/services/mobile-applications` | Native, hybrid, PWA |
| `/services/ui-ux-design` | Interfaces with motion and clarity |
| `/services/cloud-engineering` | Landing zones and elastic estates |
| `/services/devops` | CI/CD, SRE, reliability budgets |
| `/services/digital-transformation` | Operating models that stick |
| `/services/cyber-security` | Zero-trust and continuous assurance |
| `/services/qa-automation` | Quality gates in every pipeline |
| `/services/maintenance-and-support` | Keep critical systems calm |
| `/services/technology-consulting` | Strategy with engineering depth |

Catalog-backed service leaves may also inject challenge / approach / deliverables from `src/data/catalog.ts`.

---

### 9.4 Solutions — `/solutions`

**Hub shows:** Packaged solution lines — core systems, industry solutions, scale.

| Path | Page shows |
|------|------------|
| `/solutions/erp` | ERP — finance/supply operations *(featured)* |
| `/solutions/crm` | CRM — pipeline and customer memory |
| `/solutions/hrms` | HRMS — people ops + compliance |
| `/solutions/finance` | Finance — close automation |
| `/solutions/healthcare` | Healthcare clinical/ops platforms |
| `/solutions/education` | Institutional learning systems |
| `/solutions/retail` | Omnichannel commerce |
| `/solutions/manufacturing` | Plant-floor → cloud visibility |
| `/solutions/real-estate` | Portfolio / transaction platforms |
| `/solutions/logistics` | Routing, tracking, control towers |
| `/solutions/construction` | Project and field coordination |
| `/solutions/government` | Citizen services with trust |
| `/solutions/startup-solutions` | MVP → product-market-fit platforms |
| `/solutions/enterprise-solutions` | Transformation programs that ship |

---

### 9.5 Technologies — `/technologies`

**Hub shows:** Stack directory — frontend, backend, cloud & AI, data & mobile.

| Path | Page shows |
|------|------------|
| `/technologies/react` | React at product scale |
| `/technologies/next-js` | Next.js App Router / edge *(featured)* |
| `/technologies/vue` | Vue reactive interfaces |
| `/technologies/angular` | Enterprise SPA architecture |
| `/technologies/node-js` | Node services and APIs |
| `/technologies/nestjs` | Structured Node for large teams |
| `/technologies/java` | Mission-critical JVM |
| `/technologies/python` | Data, AI, API services |
| `/technologies/net` | .NET / Microsoft ecosystems |
| `/technologies/aws` | AWS landing zones / scale |
| `/technologies/azure` | Azure identity and estates |
| `/technologies/google-cloud` | GCP data/ML platforms |
| `/technologies/openai` | GPT systems with governance |
| `/technologies/gemini` | Multimodal Google AI |
| `/technologies/claude` | Long-context agent workflows |
| `/technologies/llama` | Open-weight model deployment |
| `/technologies/mistral` | Efficient European model stacks |
| `/technologies/mongodb` | Document stores for velocity |
| `/technologies/postgresql` | Relational system of record |
| `/technologies/redis` | Caching / realtime |
| `/technologies/firebase` | Fast mobile backends |
| `/technologies/flutter` | Cross-platform mobile |
| `/technologies/react-native` | Shared UI across devices |
| `/technologies/swift` | Native iOS |
| `/technologies/kotlin` | Native Android |

---

### 9.6 Industries — `/industries`

**Hub shows:** Vertical markets where Satyakabir ships.

| Path | Page shows |
|------|------------|
| `/industries/healthcare` | Clinical ops / patient platforms *(featured)* |
| `/industries/finance` | Banking and capital markets |
| `/industries/insurance` | Claims, underwriting, portals |
| `/industries/retail` | Commerce and inventory intelligence |
| `/industries/manufacturing` | Industrial digital twins |
| `/industries/logistics` | Fleet and warehouse control |
| `/industries/education` | Institutional learning |
| `/industries/government` | Citizen-grade digital services |
| `/industries/automotive` | Connected vehicle platforms |
| `/industries/travel` | Booking and operations |
| `/industries/hospitality` | Guest experience platforms |
| `/industries/media` | Streaming and content ops |
| `/industries/sports` | Fan and performance platforms |
| `/industries/real-estate` | Property and transaction tech |

Extra industry catalog compositions may exist in `industry-catalog.ts` beyond the mega-menu list.

---

### 9.7 Work — `/work`

**Hub shows:** Proof of shipped work — entry points into case studies and galleries.

| Path | Page shows |
|------|------------|
| `/work/featured-projects` | Selected builds from the floor |
| `/work/case-studies` | Outcomes, architecture, lessons |
| `/work/portfolio` | Full body of work browse |
| `/work/open-source` | Shared primitives and tools |
| `/work/client-success-stories` | Client voices |
| `/work/project-gallery` | Visual archive of shipped craft |
| `/work/nexus-ai-platform` | Featured case — Nexus AI *(mega featured)* |

---

### 9.8 Insights — `/insights`

**Hub shows:** Content library — blog, research, news, FAQs.

| Path | Page shows |
|------|------------|
| `/insights/blog` | Engineering field notes |
| `/insights/research` | Applied R&D from the lab |
| `/insights/whitepapers` | Deep dives for technical leaders |
| `/insights/technology-articles` | Cross-stack patterns *(featured)* |
| `/insights/company-news` | Milestones and announcements |
| `/insights/events` | Talks, meetups, briefings |
| `/insights/resources` | Templates and toolkits |
| `/insights/faqs` | Common questions answered |

---

### 9.9 Careers — `/careers`

**Hub shows:** Why join, benefits, open roles, process.

| Path | Page shows |
|------|------------|
| `/careers/why-join-us` | Why builders choose Satyakabir |
| `/careers/benefits` | Compensation, learning, wellbeing |
| `/careers/open-positions` | Roles open now *(featured)* |
| `/careers/internships` | Internship entry paths |
| `/careers/hiring-process` | Apply → offer steps |
| `/careers/culture` | How the team collaborates and ships |

---

### 9.10 Contact — `/contact`

**Hub shows:** Ways to reach Satyakabir and start an engagement.

| Path | Page shows |
|------|------------|
| `/contact/contact-us` | Email, phone, inquiry form |
| `/contact/book-meeting` | Schedule a strategy call *(featured)* |
| `/contact/office-locations` | HQ and partner hubs |
| `/contact/support` | Help for existing engagements |
| `/contact/get-quote` | Scoped estimate — also primary navbar CTA (“Start a project”) |

---

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
3. **Film assets** — Desktop prefers the master MP4 on a native `<video>`. Missing master → scrub MP4 → poster / JPG fallback.
4. **Heavy assets** — Do not ship 720 JPGs to production; optional `public/frames` is local-only.
5. **No frame counters in UI** — Frame indices are internal.
6. **Hero (film)** — Analytics strip; chat is a contact affordance; no custom cursor.
7. **Composition ≠ kind** — Changing `matchKind` alone will not redesign a page; edit `page-compositions/{section}.ts`.
8. **Shared kind cards/metrics** — If a section renders `cards` / `metrics` / `stack` without props or slug overrides, leaves can look identical. Prefer composition props or `slug-overrides`.
9. **Reveal** — Content stays visible by default (transform polish only); do not gate readability on opacity `0`.
10. **Client components** — Film layer, Lenis, GSAP, nav, chapters, chatbot, composer are `"use client"`.

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
