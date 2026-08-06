# Graph Report - website\src  (2026-08-06)

## Corpus Check
- 116 files · ~89,957 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 562 nodes · 1280 edges · 20 communities (18 shown, 2 thin omitted)
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
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 39 edges
2. `usePrefersReducedMotion()` - 30 edges
3. `leafExperienceMetadata()` - 22 edges
4. `sectionSlugs()` - 19 edges
5. `buildExperience()` - 17 edges
6. `getSectionLeaves()` - 14 edges
7. `DigitalSection()` - 13 edges
8. `RevealHeading()` - 13 edges
9. `PageComposition` - 13 edges
10. `SectionHubPage()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `TiltCard()` --calls--> `cn()`  [EXTRACTED]
  components/ui/TiltCard.tsx → lib/utils.ts
- `sitemap()` --calls--> `allIndexablePaths()`  [EXTRACTED]
  app/sitemap.ts → data/seo.ts
- `generateStaticParams()` --calls--> `sectionSlugs()`  [EXTRACTED]
  app/careers/[slug]/page.tsx → data/navigation.ts
- `generateMetadata()` --calls--> `leafExperienceMetadata()`  [EXTRACTED]
  app/careers/[slug]/page.tsx → data/experiences.ts
- `generateStaticParams()` --calls--> `sectionSlugs()`  [EXTRACTED]
  app/company/[slug]/page.tsx → data/navigation.ts

## Communities (20 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (36): Logo(), LogoProps, sizes, CinematicCanvas(), CinematicCanvasProps, contact, site, ctaNav (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (49): generateMetadata(), generateStaticParams(), generateMetadata(), generateStaticParams(), generateMetadata(), generateStaticParams(), generateMetadata(), generateStaticParams() (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (36): AtmosphereLayer(), AtmosphereVisual, ChapterProgress(), ChapterProgressProps, scrollToFrame(), CinematicHome(), ScrollScrubber(), ScrollScrubberProps (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (23): AtmosphereId, about, coreStack, faqs, hero, industries, infrastructure, media (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (16): ExperiencePayload, CapabilityCards(), MediaMosaic(), PillCloud(), PipelineFlow(), RelatedStrip(), StackPills(), pickFromSlug() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (31): ExperienceComposer(), registry, SectionComponent, careersCompositions, companyCompositions, img, contactCompositions, insightsCompositions (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (25): metadata, metadata, sitemap(), metadata, metadata, metadata, allIndexablePaths(), BuildMetaInput (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (17): CaseStudy, ChooseUsCard, ecosystemGroups, EcosystemNode, ecosystemNodes, EcosystemStage, ImpactStat, PresenceMarker (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (22): accentFor(), ExperienceCard, ExperienceCta, ExperienceKind, ExperiencePipelineStep, images, KindProfile, matchKind() (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (10): body, deco, display, metadata, mono, MissionControl(), Theme, ThemeContext (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (14): chooseUsCards, scaleCounters, scaleMilestones, stackLayers, CompanyScale(), FinalCta(), MOTES, GlobalPresence() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (11): caseStudies, impactStats, transformationFlow, CaseStudies(), DigitalTransformation(), Point, AuroraField(), CountUp() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (10): businessResults, industryBadges, transformIndustries, BusinessResults(), ResultRow(), BAR_SET, IndustriesTransform(), IndustryWall() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (14): filterActions(), MISSION_ACTIONS, MissionAction, MissionActionId, MissionActionKind, MissionSuggestion, PINNED_SERVICES, pushRecent() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (15): reelScenes, richTestimonials, AgencyReel(), TestimonialExperience(), CloudStack(), FaqAccordion(), GlowPanel(), LifecycleRail() (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (9): easeExpoInOut, easeSoft, revealTransition, springMagnetic, springSnappy, springSoft, staggerChildren, TiltCard() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (7): presenceMarkers, presenceStats, graticulePath(), LATITUDES, LONGITUDES, project(), Projected

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (5): ChatBot(), ChatMessage, ChatRole, QUICK_PROMPTS, easeExpoOut

## Knowledge Gaps
- **112 isolated node(s):** `display`, `deco`, `body`, `mono`, `metadata` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `usePrefersReducedMotion()` connect `Community 14` to `Community 2`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 16`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `PremiumButton()` connect `Community 0` to `Community 2`, `Community 4`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `display`, `deco`, `body` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06292966684294024 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07494824016563147 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05605499735589635 - nodes in this community are weakly interconnected._