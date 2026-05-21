# Graph Report - cms-app  (2026-05-20)

## Corpus Check
- 136 files · ~70,437 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 887 nodes · 2407 edges · 45 communities (43 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7bfd9ac7`
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
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 48|Community 48]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 195 edges
2. `useAuth()` - 47 edges
3. `Button` - 38 edges
4. `Badge()` - 29 edges
5. `Card` - 29 edges
6. `CardContent` - 28 edges
7. `Skeleton()` - 25 edges
8. `CardHeader` - 22 edges
9. `CardTitle` - 22 edges
10. `Input` - 22 edges

## Surprising Connections (you probably didn't know these)
- `cn()` --calls--> `clsx`  [INFERRED]
  src/lib/utils.ts → package.json
- `KpiMetricCard()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/dashboard-kit.tsx → src/lib/utils.ts
- `KpiInlineStat()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/dashboard-kit.tsx → src/lib/utils.ts
- `OmniSlash()` --calls--> `cn()`  [EXTRACTED]
  src/components/layout/Navbar.tsx → src/lib/utils.ts
- `SidebarNavLink()` --calls--> `cn()`  [EXTRACTED]
  src/components/layout/Sidebar.tsx → src/lib/utils.ts

## Communities (45 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (94): ClientFormValues, clientSchema, CHART_COLORS, EmployeeFormValues, employeeSchema, MilestoneFormValues, milestoneSchema, ProjectFormValues (+86 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (61): devDependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, framer-motion, @hookform/resolvers (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.20
Nodes (9): AppLogo(), AppLogoProps, sizeClass, BRAND, EmailFormValues, emailSchema, EmployeeFormValues, employeeSchema (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (35): useIsMobile(), cn(), Kbd(), KbdGroup(), ResizableHandle(), ResizablePanelGroup(), SheetFooter(), Sidebar() (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (16): getApiErrorMessage(), defaultNotif, defaultWorkspace, getNotificationPrefs(), getWorkspacePrefs(), NotificationPrefs, read(), saveNotificationPrefs() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (14): iconSpring, Sidebar, SidebarNavLink(), SidebarProps, spring, useBadgeCounts(), findActiveNavGroupLabel(), getHomeHref() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (24): AdminAnalytics, AdminClients, AdminDashboard, AdminDiscussions, AdminEmployees, AdminProjectDetail, AdminProjects, AdminRequests (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (15): authHeaders(), createInventoryCredential(), createInventoryEnvironment(), createInventoryResource(), getInventorySummary(), inv(), InventorySummary, listInventoryActivities() (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (12): ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (16): PageShellProps, ProjectPriorityBanner(), ProjectPriorityBannerProps, AccordionContent, AccordionItem, AccordionTrigger, EmptyState(), EmptyStateProps (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (11): Field(), FieldContent(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), FieldLegend(), FieldSeparator() (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (17): AdminClients(), canViewAsClient(), DiscussionsPage(), AdminEmployees(), canViewAsEmployee(), AdminProjectDetail(), ClientAnalytics(), ClientPortal() (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, jsx, lib, moduleResolution, noEmit, paths, resolveJsonModule (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (13): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (24): AdminAnalytics, AdminClients, AdminDashboard, AdminDiscussions, AdminEmployees, AdminProjectDetail, AdminProjects, AdminRequests (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (17): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Item(), ItemActions(), ItemContent(), ItemDescription() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (13): RealtimeContext, RealtimeContextType, RealtimeProvider(), firebaseConfig, initFirebase(), isFirebaseConfigured(), registerServiceWorker(), requestFirebaseToken() (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (9): dependencies, firebase, jspdf, jspdf-autotable, socket.io-client, name, private, type (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (8): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea()

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 24 - "Community 24"
Cohesion: 0.36
Nodes (6): RoleGate(), UserRole, getProjectsListHref(), RouteBreadcrumb, RouteMeta, STATIC_ROUTES

### Community 25 - "Community 25"
Cohesion: 0.19
Nodes (15): AuthContext, AuthContextType, AuthProvider(), getApiBase(), refreshAccessToken(), clearTokens(), getAccessToken(), getRefreshToken() (+7 more)

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (5): ProtectedRoute(), ProtectedRouteProps, AppLayout(), AuthenticatedShell(), PageOutlet()

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (6): HubSection, ProjectHubNav(), ProjectHubNavProps, ProjectHubTab, sectionForTab(), SECTIONS

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (16): BRAND_THEME_CLASSES, FontSize, PrimaryColor, Theme, ThemeContext, ThemeContextValue, ThemeProvider(), applyAccentVariables() (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (13): useToast(), getInitials(), ProfilePage(), Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (5): scripts, build, dev, serve, typecheck

### Community 32 - "Community 32"
Cohesion: 0.06
Nodes (65): AdminDashboard(), BUG_SEVERITIES, getGreeting(), KpiCard(), Panel(), PIPELINE_COLORS, PIPELINE_STAGES, SERVICES (+57 more)

### Community 33 - "Community 33"
Cohesion: 0.50
Nodes (3): firebaseConfig, messaging, notificationOptions

### Community 34 - "Community 34"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 41 - "Community 41"
Cohesion: 0.50
Nodes (4): useTheme(), SettingsPage(), Toaster(), ToasterProps

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (11): Navbar(), NavbarProps, OmniSlash(), spring, WayfinderTrail(), PageShell(), formatNavbarClock(), getSearchShortcutLabel() (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.05
Nodes (27): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+19 more)

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (27): AdminTickets(), DataViewMode, useDataViewMode(), AdvancedTableProps, DefaultGridCard(), GRID_CARD_TONES, DataViewToggle(), DataViewToggleProps (+19 more)

## Knowledge Gaps
- **352 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+347 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 17`, `Community 19`, `Community 22`, `Community 23`, `Community 26`, `Community 28`, `Community 30`, `Community 32`, `Community 34`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 48`?**
  _High betweenness centrality (0.450) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 1` to `Community 20`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `clsx` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _352 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05843996062992126 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09615384615384616 - nodes in this community are weakly interconnected._