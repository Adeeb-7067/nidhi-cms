# Graph Report - frontend\src\components\cms  (2026-07-27)

## Corpus Check
- 8 files · ~1,752 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 30 nodes · 53 edges · 5 communities (3 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `25c0b304`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]

## God Nodes (most connected - your core abstractions)
1. `CmsEmptyState()` - 3 edges
2. `CmsErrorState()` - 3 edges
3. `CmsChipTab` - 2 edges
4. `CmsChipTabs()` - 2 edges
5. `CmsConfirmDialog()` - 2 edges
6. `CmsColumnAlign` - 2 edges
7. `CmsColumn` - 2 edges
8. `CmsDataTableEmpty` - 2 edges
9. `CmsDataTableProps` - 2 edges
10. `CmsDataTable()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (5 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.36
Nodes (7): CmsConfirmDialog(), CmsStatusChip(), cmsStatusDotClass, CmsStatusRegistryEntry, CmsStatusTone, cmsStatusToneClass, createStatusChip()

### Community 1 - "Community 1"
Cohesion: 0.24
Nodes (8): alignClass, CmsColumn, CmsColumnAlign, CmsDataTable(), CmsDataTableEmpty, CmsDataTableProps, CmsEmptyState(), CmsErrorState()

### Community 2 - "Community 2"
Cohesion: 0.50
Nodes (3): CmsFilterBar(), CmsFilterOption, CmsSelectFilter

## Knowledge Gaps
- **1 isolated node(s):** `alignClass`
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `alignClass` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._