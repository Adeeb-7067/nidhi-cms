# Graph Report - Content-Management-Hub  (2026-05-21)

## Corpus Check
- 239 files · ~119,354 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1669 nodes · 3697 edges · 104 communities (98 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a6d629ec`
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
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 98|Community 98]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 196 edges
2. `useAuth()` - 48 edges
3. `Button` - 39 edges
4. `Badge()` - 30 edges
5. `Card` - 27 edges
6. `CardContent` - 26 edges
7. `Skeleton()` - 26 edges
8. `requireAuth()` - 23 edges
9. `Input` - 22 edges
10. `CardHeader` - 20 edges

## Surprising Connections (you probably didn't know these)
- `cn()` --calls--> `clsx`  [INFERRED]
  frontend/src/lib/utils.ts → frontend/package.json
- `main()` --calls--> `getNextSequence()`  [INFERRED]
  backend/scripts/seed-more.ts → backend/src/models/schema/counter.ts
- `main()` --calls--> `getNextSequence()`  [INFERRED]
  backend/scripts/seed.ts → backend/src/models/schema/counter.ts
- `generateBugNumber()` --calls--> `getNextSequence()`  [INFERRED]
  backend/src/controllers/bugs.controller.ts → backend/src/models/schema/counter.ts
- `guard()` --calls--> `getProjectAccess()`  [INFERRED]
  backend/src/controllers/inventory.controller.ts → backend/src/services/company-access.ts

## Communities (104 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (137): ClientFormValues, clientSchema, CHART_COLORS, EmployeeFormValues, employeeSchema, MilestoneFormValues, milestoneSchema, ProjectFormValues (+129 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (15): authHeaders(), createInventoryCredential(), createInventoryEnvironment(), createInventoryResource(), getInventorySummary(), inv(), InventorySummary, listInventoryActivities() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (58): devDependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, framer-motion, @hookform/resolvers (+50 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (17): TaskDetailPage(), TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_TYPE_LABELS, taskPriorityClass(), taskStatusClass(), MemberWorkTab, TaskRow() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (13): DB, isDatabaseConnected(), safeUrl, whenDatabaseReady(), initFirebaseAdmin(), initRealtime(), notifyExpiry(), runExpiryCheck() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (29): useIsMobile(), Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction() (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (18): expiresAt, router, category, router, upload, ensureLocalUploadDir(), getStorageBackend(), localFilename() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (22): formatComment(), formatLog(), formattedLogs, id, logs, pagination, projects, query (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (30): LoginLottie(), LoginLottieProps, Lottie, AppLogo(), AppLogoProps, sizeClass, appName, appShortName (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (17): projectId, router, limit, q, regex, router, router, verifyAccessToken() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (30): body, companyName, contactPerson, email, formatClient(), id, loginEmail, { page, limit, skip } (+22 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (28): ApiError, applyBaseUrl(), AuthTokenGetter, BodyType, buildErrorMessage(), customFetch(), CustomFetchOptions, ErrorType (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (22): body, deadline, id, name, pagination, priority, projectId, projectIds (+14 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (30): 10. PDF reports (optional), 11. Verify, 1. Upload the project, 2. Install dependencies and build (SSH), 3. Production env, 4. Seed database (once, SSH), 5. Run the API with Plesk Node.js, 6. Serve the React app (document root) (+22 more)

### Community 14 - "Community 14"
Cohesion: 0.36
Nodes (9): isHttpError(), formatZodError(), toApiErrorBody(), duplicateKeyMessage(), errorHandler(), isCastError(), isMongoDuplicateKey(), MongoErr (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (25): catMap, completionMap, completionOverTime, devHoursMap, endOfToday, heatMap, heatmapData, hoursMap (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (9): id, { page, limit, skip }, q, router, unreadFilter, parsePagination(), formatNotificationRow(), NOTIFICATION_LIST_PROJECTION (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (23): apkDownloadLogSchema, ApkPlatform, apkPlatforms, ApkRelease, apkReleaseSchema, ApkReleaseType, apkReleaseTypes, ApkAudience (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (24): AdminAnalytics, AdminClients, AdminDashboard, AdminDiscussions, AdminEmployees, AdminProjectDetail, AdminProjects, AdminRequests (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (21): accessToken, allowedRoles, email, fcmToken, forgotPasswordLimiter, identifier, loginLimiter, { name, designation, avatarUrl } (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (10): defaultNotif, defaultWorkspace, getNotificationPrefs(), getWorkspacePrefs(), NotificationPrefs, read(), saveNotificationPrefs(), saveWorkspacePrefs() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (19): avatarUrl, body, credId, currentPassword, email, id, name, newPassword (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (31): { assigneeId }, id, newAssignee, pagination, params, router, updateObj, guard() (+23 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (20): activitySchema, credentialAccessLogSchema, credentialSchema, deviceSchema, environmentSchema, folderSchema, InventoryCredentialType, inventoryCredentialTypes (+12 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (18): { encrypted, iv, authTag }, filtered, id, l, limit, notDeleted, p, { password } (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (21): dependencies, @aws-sdk/client-s3, bcryptjs, compression, cookie-parser, cors, exceljs, express (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (22): generateBugNumber(), { content }, id, { page, limit, skip }, q, recipientIds, router, threadIdNum (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (21): AdminClients(), canViewAsClient(), DiscussionsPage(), AdminEmployees(), canViewAsEmployee(), AdminProjectDetail(), ClientAnalytics(), ClientPortal() (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (15): CommandPalette(), Navbar(), NavbarProps, OmniSlash(), spring, formatNavbarClock(), getSearchShortcutLabel(), getTimeGreeting() (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, esModuleInterop, isolatedModules, lib, module, moduleResolution, noEmitOnError (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (18): 1. Install dependencies, 2. Environment files, 3. Seed the database, 4. Start dev servers, 5. Production build, Backend — `backend/.env`, code:powershell (cd backend), code:env (DATABASE_URL=mongodb://127.0.0.1:27017/nexus_cms) (+10 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (30): ActivityFeedItem(), ChartCard(), KpiInlineStat(), KpiMetricCard(), OverviewTile(), SystemHealthRow(), cn(), ProjectPriorityBanner() (+22 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (9): AuthProvider(), RealtimeProvider(), ThemeProvider(), useTheme(), QUERY_STALE, Login, queryClient, Toaster() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (10): WayfinderTrail(), PageShell(), PageShellProps, getRouteBreadcrumbs(), getRouteMeta(), RouteBreadcrumb, RouteMeta, STATIC_ROUTES (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (23): body, description, id, pagination, projectIds, query, router, searchClause (+15 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (15): body, description, id, pagination, projectId, query, router, status (+7 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (10): AdminDashboard(), BUG_SEVERITIES, getGreeting(), KpiCard(), Panel(), PIPELINE_STAGES, SERVICES, stagger (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (16): devDependencies, esbuild-plugin-pino, nodemon, pino-pretty, thread-stream, tsx, @types/bcryptjs, @types/compression (+8 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (27): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (13): AuthContext, AuthContextType, refreshAccessToken(), clearTokens(), getAccessToken(), getRefreshToken(), hasStoredSession(), setTokens() (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (13): CredentialHistory, credentialHistorySchema, CredentialTrigger, credentialTriggers, passwordResetTokensSchema, Session, sessionsSchema, User (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (12): RealtimeContext, RealtimeContextType, firebaseConfig, initFirebase(), isFirebaseConfigured(), registerServiceWorker(), requestFirebaseToken(), subscribeForegroundMessages() (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (12): ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem (+4 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (14): BRAND_THEME_CLASSES, FontSize, Theme, ThemeContext, ThemeContextValue, applyAccentVariables(), BRAND_LOGO_COLORS, BrandLogoColorKey (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.23
Nodes (5): logger, auditMiddleware(), responseCompression, notFoundHandler(), App()

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (14): RoleGate(), SidebarNavLink(), SidebarProps, spring, findActiveNavGroupLabel(), getHomeHref(), getNavSections(), getSectionDefaultHref() (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (17): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Item(), ItemActions(), ItemContent(), ItemDescription() (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.38
Nodes (9): buildObjectKey(), getPublicUrl(), getS3Client(), normalizeCategory(), normalizeFolderPrefix(), sanitizeFilename(), uploadBufferToObjectStorage(), uploadLocalFileToObjectStorage() (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (10): Bug, BugPlatform, bugPlatforms, bugPriorities, BugPriority, bugSchema, bugSeverities, BugSeverity (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.15
Nodes (8): ErrorBoundary, ProtectedRoute(), ProtectedRouteProps, AppLayout(), AuthenticatedShell(), ImpersonationBanner(), PageOutlet(), Sidebar

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 55 - "Community 55"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, serve, typecheck, type (+1 more)

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (8): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut()

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (8): DataViewMode, DataViewToggle(), DataViewToggleProps, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (9): scripts, build, dev, dev:once, migrate-company, seed, seed-more, start (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.20
Nodes (9): CMS Backend (API), code:block1 (src/), code:powershell (cd backend), code:env (ALLOWED_ORIGINS=https://app.yourdomain.com), Core dependencies (security-related), MVC layout, Scripts, Setup (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (9): dependencies, firebase, jspdf, jspdf-autotable, lottie-react, react, react-dom, socket.io-client (+1 more)

### Community 62 - "Community 62"
Cohesion: 0.28
Nodes (8): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea()

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (8): RequestStatus, requestStatuses, RequestType, requestTypes, requestUrgencies, RequestUrgency, ResourceRequest, resourceRequestSchema

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (8): Task, taskPriorities, TaskPriority, taskSchema, TaskStatus, taskStatuses, TaskType, taskTypes

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (7): CMS Frontend, code:powershell (cd frontend), code:env (# Must match your deployed API origin (no trailing slash)), code:env (VITE_API_BASE_URL=http://localhost:8080), Scripts, Setup, Two-domain deployment

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (6): Report, reportSchema, ReportStatus, reportStatuses, ReportType, reportTypes

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (6): Ticket, ticketPriorities, TicketPriority, ticketSchema, TicketStatus, ticketStatuses

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (6): HubSection, ProjectHubNav(), ProjectHubNavProps, ProjectHubTab, sectionForTab(), SECTIONS

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (4): AssignBugBody, ListAssignableMembersParams, data, router

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (5): delay, exec, ext, ignore, watch

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (5): apiProxy, appRoot, env, port, socketProxy

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (4): Key Tools, MCP Tools: code-review-graph, When to use graph tools FIRST, Workflow

### Community 77 - "Community 77"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 78 - "Community 78"
Cohesion: 0.40
Nodes (4): Client, clientSchema, ClientStatus, clientStatuses

### Community 79 - "Community 79"
Cohesion: 0.40
Nodes (4): Comment, commentSchema, ThreadType, threadTypes

### Community 80 - "Community 80"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 81 - "Community 81"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 82 - "Community 82"
Cohesion: 0.50
Nodes (4): formatDetailValue(), getColumnDetailContent(), TableDetailPanel(), TableDetailPanelProps

### Community 83 - "Community 83"
Cohesion: 0.50
Nodes (3): artifactDir, buildAll(), esbuild

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (3): description, name, private

### Community 85 - "Community 85"
Cohesion: 0.50
Nodes (3): code:powershell (cd backend), Content Management Hub, Quick start (local)

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (4): priorityClass(), ProjectCard(), statusBadgeClass(), getProjectDetailHref()

### Community 87 - "Community 87"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 88 - "Community 88"
Cohesion: 0.53
Nodes (4): setBaseUrl(), apiUrl(), configureApiClient(), getApiBaseUrl()

### Community 89 - "Community 89"
Cohesion: 0.50
Nodes (3): firebaseConfig, messaging, notificationOptions

### Community 91 - "Community 91"
Cohesion: 0.70
Nodes (4): backfillFromProjects(), backfillProjects(), main(), normalizeCompanies()

### Community 98 - "Community 98"
Cohesion: 0.70
Nodes (4): storeGeneratedFile(), generateExcelReport(), generatePdfReport(), persistGeneratedFile()

## Knowledge Gaps
- **806 isolated node(s):** `name`, `private`, `description`, `artifactDir`, `watch` (+801 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `Community 48` to `Community 33`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 32` to `Community 0`, `Community 2`, `Community 3`, `Community 5`, `Community 8`, `Community 28`, `Community 34`, `Community 38`, `Community 39`, `Community 41`, `Community 45`, `Community 46`, `Community 49`, `Community 50`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 62`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 72`, `Community 80`, `Community 81`, `Community 82`, `Community 86`, `Community 87`, `Community 92`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 2` to `Community 55`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `name`, `private`, `description` to the rest of the system?**
  _806 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05084189296937292 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.034482758620689655 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._