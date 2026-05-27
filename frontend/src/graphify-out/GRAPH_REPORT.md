# Graph Report - frontend\src  (2026-05-27)

## Corpus Check
- 235 files · ~123,665 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1389 nodes · 4795 edges · 59 communities (57 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d53c1d3c`
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
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 58|Community 58]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 298 edges
2. `Button` - 72 edges
3. `useAuth()` - 56 edges
4. `PortalPageShell()` - 43 edges
5. `Badge()` - 41 edges
6. `Card` - 38 edges
7. `CardContent` - 36 edges
8. `Skeleton()` - 32 edges
9. `CardHeader` - 31 edges
10. `CardTitle` - 31 edges

## Surprising Connections (you probably didn't know these)
- `PageKpiRow()` --calls--> `cn()`  [EXTRACTED]
  components/dashboard/dashboard-kit.tsx → lib/utils.ts
- `KpiMetricCard()` --calls--> `cn()`  [EXTRACTED]
  components/dashboard/dashboard-kit.tsx → lib/utils.ts
- `KpiInlineStat()` --calls--> `cn()`  [EXTRACTED]
  components/dashboard/dashboard-kit.tsx → lib/utils.ts
- `StatCard()` --calls--> `cn()`  [EXTRACTED]
  components/dashboard/dashboard-kit.tsx → lib/utils.ts
- `ChartCard()` --calls--> `cn()`  [EXTRACTED]
  components/dashboard/dashboard-kit.tsx → lib/utils.ts

## Communities (59 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (53): BugBatchInput, BugBatchItem, createBugBatch(), ApiError, applyBaseUrl(), AuthTokenGetter, BodyType, buildErrorMessage() (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (54): useIsMobile(), cn(), MetaItem(), TextSection(), FollowUpCard(), Empty(), EmptyContent(), EmptyDescription() (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (50): FinancialActivityTimeline(), FinancialSummaryCard(), InstallmentCard(), InstallmentProgress(), InvoicePreview(), OutstandingBadge(), PaymentHistoryTable(), PaymentTimeline() (+42 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (38): setBaseUrl(), AuthContext, AuthContextType, refreshAccessToken(), apiUrl(), configureApiClient(), getApiBaseUrl(), clearTokens() (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (29): chartTooltip, ChannelActivity, DiscussionsPage(), BugTable(), PageKpiSkeleton(), BugListScope, formatDeadline(), priorityClass() (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (30): BugTableRow, SortKey, State, SalesEmptyState(), SalesFilterBar(), SalesPageHeader(), SalesStatusBadge(), ExecutiveAvatar() (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (37): MilestoneFormValues, milestoneSchema, EditFormValues, editSchema, openBugFormDeferred(), SharedFormValues, sharedSchema, ProjectBugsPanel() (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (34): LoginBackground(), ORBS, PARTICLES, LoginLottie(), LoginLottieProps, ORBITALS, SPHERES, AppLogo() (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (40): BugBatchCreate(), BugFormDialog(), BugStatusBadge(), BugTrackStatusBadges(), BugTrackStatusRow(), BatchInputMode, buildBatchParentTitle(), DraftBugRow (+32 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (33): CommandPaletteProps, ApkReleaseFormValues, apkReleaseSchema, REPORT_TYPE_LABELS, REPORT_TYPE_OPTIONS, RequestFormValues, requestSchema, PortalEmptyState() (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (31): AdminClients(), AdminEmployees(), canViewAsEmployee(), EmployeeFormValues, employeeSchema, AdminProjects(), AdminRequests(), RequestRow (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.04
Nodes (44): AdminAnalytics, AdminClients, AdminDashboard, AdminDiscussions, AdminEmployees, AdminProjectDetail, AdminProjects, AdminRequests (+36 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (39): BadgeVariant, customerStyles, followUpStyles, installmentStyles, invoiceStyles, leadStyles, partialPaymentStyles, paymentStyles (+31 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (28): usePresence(), useUserWithPresence(), PresenceUserFields, formatLastLogin(), formatLastSeen(), mergeUserPresence(), parsePresenceStatus(), PRESENCE_LABELS (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (19): PageShellProps, ProjectPriorityBanner(), ProjectPriorityBannerProps, AccordionContent, AccordionItem, AccordionTrigger, EmptyState(), EmptyStateProps (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (27): canViewAsClient(), ClientFormValues, ClientLastLoginCell(), ClientLastSeenCell(), ClientPortalPresenceMeta(), clientPortalPresenceUser(), ClientPresenceCell(), ClientPresenceDetailCell() (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (22): BugDetailSheet(), IssueView, FormValues, schema, TeamMemberWorkSheetProps, priorityClass(), statusIcon(), TicketDetailSheet() (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (24): BugCommentsSection(), CommandPalette(), useAuth(), PresenceProvider(), useRealtime(), DevLogs(), DevProjects(), useNotificationClick() (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (23): RevenueChartCard(), ChartGridCell(), ChartPanel(), ADMIN_DASHBOARD_MODULES, financialDashboardKpis, formatCompactCurrency(), formatPercent(), installmentCollectionTrend (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (17): AssigneeAvatars(), CommentBubble(), roleBadgeClass(), roleLabel(), UserAvatarGroup(), formatUserRole(), TICKET_CHAT_PRESETS, TicketChatPresetRole (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (20): DataViewMode, TablePaginationProps, AdvancedTableProps, DefaultGridCard(), GRID_CARD_TONES, DataViewToggle(), DataViewToggleProps, DropdownMenuCheckboxItem (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (17): LEAD_SOURCE_LABELS, typeIcons, LeadDetail(), getLeadById(), mockActivities, mockFollowUps, mockNotifications, mockProposals (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (15): ActivityTimeline(), colorMap, iconMap, ReceiptPreview(), LeadFormDrawer(), SalesAreaTrendChart(), SalesDualLineChart(), FeatureItem (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (17): RoleGate(), SidebarNavLink(), SidebarProps, spring, findActiveNavGroupLabel(), getHomeHref(), getNavSections(), getSectionDefaultHref() (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (15): DeveloperLogsView(), LogFormValues, logSchema, WORK_CATEGORIES, formatDailyLogUpdatedLabel(), formatDailyLogWorkDate(), PDFService, DailyLogDetailDialog() (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (14): defaultNotif, defaultWorkspace, getNotificationPrefs(), getWorkspacePrefs(), NotificationPrefs, read(), saveNotificationPrefs(), saveWorkspacePrefs() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (17): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Item(), ItemActions(), ItemContent(), ItemDescription() (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (13): RealtimeContext, RealtimeContextType, firebaseConfig, initFirebase(), isFirebaseConfigured(), registerServiceWorker(), requestFirebaseToken(), subscribeForegroundMessages() (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.17
Nodes (15): BRAND_THEME_CLASSES, FontSize, Theme, ThemeContext, ThemeContextValue, ThemeProvider(), applyAccentVariables(), BRAND_LOGO_COLORS (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (13): effectivePageSize(), getPaginationMeta(), isShowAllPageSize(), normalizePageLimit(), normalizePageSize(), PageLimit, resolveApiPageLimit(), SharedPaginationLimit (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (14): AdminProjectDetail(), DevBugs(), clearDiscussionsProjectFromUrl(), getDiscussionsHref(), readDiscussionsProjectIdFromUrl(), selectDiscussionsProject(), canNavigateNotification(), clearUrlSearchParam() (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (11): AuthProvider(), RealtimeProvider(), useTheme(), useToast(), SettingsPage(), ForgotPassword, Login, queryClient (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (8): ErrorBoundary, ProtectedRoute(), ProtectedRouteProps, AppLayout(), AuthenticatedShell(), ImpersonationBanner(), PageOutlet(), Sidebar

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (12): DonutSlice, SalesDonutPanel(), accentHeader, accentIcon, ChartEmptyState(), ChartPanelProps, DashboardPipelineChart(), DashboardTrendChart() (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.26
Nodes (10): ChatComposer(), ChatComposerPayload, ChatComposerProps, PendingAttachment, ChatFileUploadResult, isChatAttachmentFile(), isChatImageFile(), isChatPdfFile() (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (12): ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.19
Nodes (13): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (13): accentMap, ActivityFeedItem(), ChartCard(), chartTooltipStyle, fadeUp, KpiInlineStat(), KpiMetricCard(), KpiSimpleCard() (+5 more)

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (10): AdminAnalytics(), formatMonthLabel(), LogActivityHeatmap(), analyticsQueryOptions(), CHART_COLORS, chartTooltipStyle, DeveloperLeaderboardRow(), formatLogDateShort() (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (11): assets, ddd, fr, h, ip, layers, markers, nm (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 43 - "Community 43"
Cohesion: 0.27
Nodes (9): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (8): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut()

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (8): buildCalendarGrid(), CalendarGrid(), ComplianceSummary(), LogComplianceCalendarProps, PanelBody(), STATUS_META, WEEKDAYS, Progress

### Community 47 - "Community 47"
Cohesion: 0.28
Nodes (8): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea()

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (7): AdminDashboard(), DashboardPayload, getGreeting(), DashboardPortfolioTable(), DashboardSeverityChart(), DashboardHero(), OverviewTile()

### Community 49 - "Community 49"
Cohesion: 0.28
Nodes (7): useGetWorkspaceDashboard(), DashboardSkeleton(), ExecutiveStatCard(), QuickAction(), DevWorkspace(), getGreeting(), ROLE_LABELS

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 53 - "Community 53"
Cohesion: 0.48
Nodes (5): CommentBody(), isPdfAttachment(), LinkifiedText(), splitUrlAndSuffix(), toHref()

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (6): HubSection, ProjectHubNav(), ProjectHubNavProps, ProjectHubTab, sectionForTab(), SECTIONS

## Knowledge Gaps
- **368 isolated node(s):** `Login`, `ForgotPassword`, `queryClient`, `ImportMetaEnv`, `ImportMeta` (+363 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 30`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`?**
  _High betweenness centrality (0.384) - this node is a cross-community bridge._
- **Why does `Button` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 30`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 47`, `Community 48`, `Community 49`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 17` to `Community 0`, `Community 33`, `Community 32`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 15`, `Community 16`, `Community 48`, `Community 49`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 31`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `Login`, `ForgotPassword`, `queryClient` to the rest of the system?**
  _368 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06271186440677966 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07622504537205081 - nodes in this community are weakly interconnected._