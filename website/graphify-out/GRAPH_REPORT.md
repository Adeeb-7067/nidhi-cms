# Graph Report - website  (2026-08-05)

## Corpus Check
- 126 files · ~92,358 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 693 nodes · 1359 edges · 39 communities (31 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3968acea`
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

## God Nodes (most connected - your core abstractions)
1. `cn()` - 37 edges
2. `usePrefersReducedMotion()` - 26 edges
3. `leafExperienceMetadata()` - 22 edges
4. `sectionSlugs()` - 19 edges
5. `buildExperience()` - 17 edges
6. `compilerOptions` - 16 edges
7. `Satyakabir Technologies — Project Documentation & Code Analysis` - 16 edges
8. `getSectionLeaves()` - 14 edges
9. `DigitalSection()` - 13 edges
10. `RevealHeading()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `generateStaticParams()` --calls--> `sectionSlugs()`  [EXTRACTED]
  src/app/industries/[slug]/page.tsx → src/data/navigation.ts
- `TiltCard()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/TiltCard.tsx → src/lib/utils.ts
- `sitemap()` --calls--> `allIndexablePaths()`  [EXTRACTED]
  src/app/sitemap.ts → src/data/seo.ts
- `generateStaticParams()` --calls--> `sectionSlugs()`  [EXTRACTED]
  src/app/careers/[slug]/page.tsx → src/data/navigation.ts
- `generateMetadata()` --calls--> `leafExperienceMetadata()`  [EXTRACTED]
  src/app/careers/[slug]/page.tsx → src/data/experiences.ts

## Communities (39 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (61): businessResults, caseStudies, CaseStudy, ChooseUsCard, chooseUsCards, ecosystemGroups, EcosystemNode, ecosystemNodes (+53 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (31): ExperienceComposer(), registry, SectionComponent, careersCompositions, companyCompositions, img, contactCompositions, insightsCompositions (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (26): industryCatalog, industryDetails, projectCatalog, serviceCatalog, serviceDetails, about, contact, coreStack (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (41): 10. Important behaviors & gotchas, 11. How to change common things, 12. Suggested next improvements, 13. History, 14. Motion elevation (current craft layer), 1. Product summary, 2. Quick start, 3. High-level architecture (+33 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (20): sitemap(), metadata, metadata, metadata, absoluteUrl(), allIndexablePaths(), BuildMetaInput, buildPageMetadata() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (34): dependencies, clsx, gsap, lenis, lucide-react, motion, next, react (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): leafExperienceMetadata(), sectionSlugs(), generateMetadata(), generateStaticParams(), generateMetadata(), generateStaticParams(), generateMetadata(), generateStaticParams() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (23): getIndustry(), getProject(), getService(), accentFor(), buildExperience(), ExperienceCta, experienceMetadata(), images (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (14): body, deco, display, metadata, mono, metadata, organizationJsonLd(), SITE_ICONS (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (14): ChatBot(), ChatMessage, ChatRole, QUICK_PROMPTS, easeExpoInOut, easeExpoOut, easeSoft, revealTransition (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (16): desktopFilter, desktopMp4, desktopWidth, __dirname, ffmpeg, input, mobileMp4, mobileWidth (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (13): Logo(), LogoProps, sizes, ctaNav, navigation, FilmLoadingVeil(), CommandPalette(), MobileNav() (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (14): ExperienceKind, flattenNavigation(), ResolvedPageContent, resolvePageContent(), resolveRelated(), kindNarratives, getSlugOverride(), slugOverrides (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (11): findNavLeaf(), leaf(), MegaFeatured, NavGroup, NavItem, unsplash, slugify(), iconMap (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): CinematicCanvas(), CinematicCanvasProps, homeHero, cn(), GlassCard(), GlassCardProps, Magnetic(), MagneticProps (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (8): metadata, CinematicHome(), FilmIsland(), PostFilmNarrative, PreFilmNarrative, useFilmInView(), useFrameScrubber(), useLenis()

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (11): ChapterProgress(), ChapterProgressProps, scrollToFrame(), chapters, frameToScrollPct(), filmTrackRange(), Range, scrollPastFilm() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (11): AtmosphereLayer(), AtmosphereVisual, AtmosphereId, atmospheres, ChapterCard, ChapterLayout, ChapterLink, ChapterStat (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (7): Breadcrumbs(), PremiumNavbar, DIRECT_LINKS, sectionLeaves(), SiteFooter(), socialLinks, MarketingShell()

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (10): args, __dirname, ffmpeg, input, outDir, require, result, root (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (10): ExperienceCard, ExperiencePayload, ExperiencePipelineStep, MediaMosaic(), PillCloud(), RelatedStrip(), StackPills(), Reveal() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (10): CloudStack(), FaqAccordion(), GlowPanel(), LifecycleRail(), MetricTicker(), ParticleField(), ScanGrid(), TechOrbit() (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (7): appDir, bg, brandDir, __dirname, publicDir, root, src

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (4): NavLayout, NavLeaf, benefits, features

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (9): CapabilityCards(), PipelineFlow(), pickFromSlug(), SectionChaptersAlternating(), SectionChaptersEditorial(), SectionChaptersGrid(), SectionHighlightBand(), SectionMetrics() (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (4): framePath(), ScrubMode, VideoWithRVFC, withBase()

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (4): breadcrumbsFor(), breadcrumbJsonLd(), ExperiencePage(), ExperienceShell()

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (4): code:bash (npm install), Docs, Run, Satyakabir Technologies — Cinematic Scroll

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (3): ScrollScrubber(), ScrollScrubberProps, ChapterStage()

## Knowledge Gaps
- **222 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+217 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 16` to `Community 0`, `Community 2`, `Community 7`, `Community 10`, `Community 13`, `Community 15`, `Community 19`, `Community 23`, `Community 24`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `PremiumButton()` connect `Community 13` to `Community 2`, `Community 7`, `Community 16`, `Community 17`, `Community 26`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `usePrefersReducedMotion()` connect `Community 0` to `Community 24`, `Community 23`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _222 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05126050420168067 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10434782608695652 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._