# Graph Report - website  (2026-08-06)

## Corpus Check
- 138 files · ~108,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 793 nodes · 1643 edges · 41 communities (34 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e429f7c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 45 edges
2. `usePrefersReducedMotion()` - 32 edges
3. `getHubLanding()` - 23 edges
4. `leafExperienceMetadata()` - 22 edges
5. `buildExperience()` - 20 edges
6. `sectionSlugs()` - 19 edges
7. `Satyakabir Technologies — Project Documentation & Code Analysis` - 18 edges
8. `compilerOptions` - 16 edges
9. `SectionHubPage()` - 14 edges
10. `getSectionLeaves()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `ResultRow()` --calls--> `usePrefersReducedMotion()`  [EXTRACTED]
  src/components/digital/BusinessResults.tsx → src/components/experiences/primitives.tsx
- `BusinessHero()` --calls--> `Reveal()`  [INFERRED]
  src/components/home/BusinessHero.tsx → src/components/experiences/primitives.tsx
- `TiltCard()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/TiltCard.tsx → src/lib/utils.ts
- `sitemap()` --calls--> `allIndexablePaths()`  [EXTRACTED]
  src/app/sitemap.ts → src/data/seo.ts
- `CareersIndexPage()` --calls--> `getHubLanding()`  [EXTRACTED]
  src/app/careers/page.tsx → src/data/first-viewport.ts

## Communities (41 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (11): body, deco, display, metadata, mono, ChatBot(), MissionControl(), Theme (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (41): CaseStudyChapter, CaseStudyDetail, caseStudyDetails, CaseStudyFaq, CaseStudyMetric, caseStudySlugs, CaseStudyTimelineItem, ExperienceKind (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (40): deliverViaResend(), deliverViaWebhook(), POST(), industryCatalog, industryDetails, projectCatalog, serviceCatalog, serviceDetails (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (14): 10. Important behaviors & gotchas, 11. How to change common things, 12. Suggested next improvements, 13. History, 14. Motion elevation (current craft layer), 1. Product summary, 2. Quick start, 6. Homepage chapters (film map) (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (46): metadata, sitemap(), CareersIndexPage(), metadata, CompanyPage(), metadata, ContactIndexPage(), metadata (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (35): dependencies, clsx, gsap, lenis, lucide-react, motion, next, react (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (43): getCaseStudy(), getIndustry(), getProject(), getService(), accentFor(), buildExperience(), ExperienceCaseBrief, ExperienceCta (+35 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (29): CapabilityCards(), MediaMosaic(), PillCloud(), PipelineFlow(), RelatedStrip(), StackPills(), FaqAccordion(), LifecycleRail() (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (17): CaseStudy, ChooseUsCard, EcosystemNode, EcosystemStage, ImpactStat, PresenceMarker, ReelScene, ResultKpi (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (11): filterActions(), MISSION_ACTIONS, MissionAction, MissionActionId, MissionActionKind, MissionSuggestion, pushRecent(), RecentEntry (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (8): easeExpoInOut, easeSoft, revealTransition, springSnappy, springSoft, staggerChildren, TiltCard(), TiltCardProps

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (16): desktopFilter, desktopMp4, desktopWidth, __dirname, ffmpeg, input, mobileMp4, mobileWidth (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (43): metadata, Logo(), LogoProps, sizes, contact, breadcrumbsFor(), ctaNav, findNavLeaf() (+35 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (14): ExperienceCard, ExperiencePipelineStep, ResolvedPageContent, resolvePageContent(), resolveRelated(), kindNarratives, getSlugOverride(), slugOverrides (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (13): chooseUsCards, CompanyScale(), FinalCta(), MOTES, GlobalPresence(), DigitalSection(), TechStack(), TestimonialExperience() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (7): ecosystemGroups, ecosystemNodes, ServicesEcosystem(), HERO_CAPABILITY_PHRASES, HeroCapabilityTypewriter(), HeroCapabilityTypewriterProps, quantize()

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (37): AtmosphereLayer(), AtmosphereVisual, ChapterProgress(), ChapterProgressProps, scrollToFrame(), CinematicHome(), ScrollScrubber(), ScrollScrubberProps (+29 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (13): businessResults, caseStudies, industryBadges, transformIndustries, BusinessResults(), ResultRow(), CaseStudies(), BAR_SET (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (14): 9.0 How pages are built, 9.10 Contact — `/contact`, 9.1 Home — `/`, 9.2 Company — `/company`, 9.3 Services — `/services`, 9.4 Solutions — `/solutions`, 9.5 Technologies — `/technologies`, 9.6 Industries — `/industries` (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (13): CinematicCanvas(), CinematicCanvasProps, impactStats, transformationFlow, DigitalTransformation(), Point, AuroraField(), CountUp() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.28
Nodes (9): 3. High-level architecture, code:block2 (┌───────────────────────────────────────────────────────────), code:block3 (01  FilmIsland → ScrollScrubber   #inside        the cinemat), code:block4 (User scroll (Lenis; native scroll if reduced-motion)), code:block5 (navigation leaf (section + slug)), Homepage order, Runtime data flow (detail / leaf pages), Runtime data flow (homepage) (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (10): args, __dirname, ffmpeg, input, outDir, require, result, root (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (9): 4. Repository map, 6b. Business sections (`components/digital/`), 6b. Homepage digital act (`components/digital/`), code:block6 (Cinematic-Scroll/), code:css (@media (scripting: enabled) {), Deleted, Legacy / unused (still in tree), Protecting the scrubber (read before touching the homepage) (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (4): springMagnetic, Magnetic(), MagneticProps, PremiumButtonProps

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (7): appDir, bg, brandDir, __dirname, publicDir, root, src

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (10): ScrollToTop(), reelScenes, AgencyReel(), CloudStack(), MetricTicker(), ParticleField(), Reveal(), ScanGrid() (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (9): 5.1 App entry & layout, 5.2 Cinematic engine, 5.3 Chapter system (`ChapterStage.tsx`), 5.4 Navigation, 5.5 Detail pages — composition engine, 5.6 Layout variants (`BlockLayout`), 5.7 ChatBot, 5.8 UI primitives (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (7): presenceMarkers, presenceStats, graticulePath(), LATITUDES, LONGITUDES, project(), Projected

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (4): ChatMessage, ChatRole, QUICK_PROMPTS, easeExpoOut

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (4): code:bash (npm install), Docs, Run, Satyakabir Technologies — Cinematic Scroll

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (4): 7. Design system, Color, Experience page utilities, Spacing & chrome

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (5): __dirname, logoPath, outPath, root, svg

## Knowledge Gaps
- **256 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+251 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 20` to `Community 0`, `Community 2`, `Community 4`, `Community 7`, `Community 9`, `Community 10`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 24`, `Community 26`, `Community 29`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `usePrefersReducedMotion()` connect `Community 26` to `Community 0`, `Community 8`, `Community 9`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 28`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `PremiumButton()` connect `Community 13` to `Community 2`, `Community 4`, `Community 7`, `Community 17`, `Community 20`, `Community 24`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _256 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07769423558897243 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06144393241167435 - nodes in this community are weakly interconnected._