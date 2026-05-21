# Graph Report - Content-Management-Hub  (2026-05-20)

## Corpus Check
- 241 files · ~117,019 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1791 nodes · 3804 edges · 112 communities (104 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 196 edges
2. `useAuth()` - 47 edges
3. `Button` - 39 edges
4. `Badge()` - 31 edges
5. `Card` - 31 edges
6. `CardContent` - 30 edges
7. `Skeleton()` - 26 edges
8. `requireAuth()` - 24 edges
9. `CardHeader` - 24 edges
10. `CardTitle` - 24 edges

## Surprising Connections (you probably didn't know these)
- `createClientPortalUser()` --calls--> `getNextSequence()`  [INFERRED]
  artifacts/api-server/src/lib/client-portal.ts → lib/db/src/schema/counter.ts
- `updateClientPortalPassword()` --calls--> `getNextSequence()`  [INFERRED]
  artifacts/api-server/src/lib/client-portal.ts → lib/db/src/schema/counter.ts
- `generateEmployeeId()` --calls--> `getNextSequence()`  [INFERRED]
  artifacts/api-server/src/lib/employeeId.ts → lib/db/src/schema/counter.ts
- `logInventoryActivity()` --calls--> `getNextSequence()`  [INFERRED]
  artifacts/api-server/src/lib/inventory-helpers.ts → lib/db/src/schema/counter.ts
- `generateBugNumber()` --calls--> `getNextSequence()`  [INFERRED]
  artifacts/api-server/src/routes/bugs.ts → lib/db/src/schema/counter.ts

## Communities (112 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (18): formatTicketRow(), formatTicketRows(), TicketRow, body, description, id, l, p (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (61): devDependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, framer-motion, @hookform/resolvers (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): dependencies, @aws-sdk/client-s3, bcryptjs, compression, cookie-parser, cors, exceljs, express (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (42): ActivityFeedItem(), ChartCard(), KpiInlineStat(), KpiMetricCard(), OverviewTile(), SystemHealthRow(), useIsMobile(), cn() (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (24): notifyUser(), assertAssigneeRole(), assertProjectMember(), notifyAssignment(), resolveBugAssignee(), resolveTaskAssignee(), generateBugNumber(), getOrCreateSettings() (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (22): clientVisibilityFilter(), getProjectAccess(), decryptSecret(), encryptSecret(), getKey(), logInventoryActivity(), notifyProjectMembers(), { encrypted, iv, authTag } (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (28): ApiError, applyBaseUrl(), AuthTokenGetter, BodyType, buildErrorMessage(), customFetch(), CustomFetchOptions, ErrorType (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (15): defaultNotif, defaultWorkspace, getNotificationPrefs(), getWorkspacePrefs(), NotificationPrefs, read(), saveNotificationPrefs(), saveWorkspacePrefs() (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (15): authHeaders(), createInventoryCredential(), createInventoryEnvironment(), createInventoryResource(), getInventorySummary(), inv(), InventorySummary, listInventoryActivities() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (30): ProtectedRoute(), ProtectedRouteProps, AppLayout(), AuthenticatedShell(), PageOutlet(), AdminAnalytics, AdminClients, AdminDashboard (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (52): DB, isDatabaseConnected(), safeUrl, whenDatabaseReady(), ensureLocalUploadDir(), getStorageBackend(), localFilename(), resolvePublicFileUrl() (+44 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (18): formatRequestRow(), formatRequestRows(), RequestRow, body, description, id, l, p (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (16): BRAND_THEME_CLASSES, FontSize, PrimaryColor, Theme, ThemeContext, ThemeContextValue, ThemeProvider(), applyAccentVariables() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (23): apkDownloadLogSchema, ApkPlatform, apkPlatforms, ApkRelease, apkReleaseSchema, ApkReleaseType, apkReleaseTypes, ApkAudience (+15 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (25): catMap, completionMap, completionOverTime, devHoursMap, endOfToday, heatMap, heatmapData, hoursMap (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, customConditions, isolatedModules, lib, module, moduleResolution, noEmitOnError (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (21): Navbar(), NavbarProps, OmniSlash(), spring, WayfinderTrail(), PageShell(), PageShellProps, formatNavbarClock() (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (20): activitySchema, credentialAccessLogSchema, credentialSchema, deviceSchema, environmentSchema, folderSchema, InventoryCredentialType, inventoryCredentialTypes (+12 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (33): JwtPayload, signAccessToken(), signRefreshToken(), verifyAccessToken(), verifyRefreshToken(), extractBearerToken(), Request, requireAuth() (+25 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (7): asyncHandler(), wrapRouterHandlers(), data, router, featureRouters, PUBLIC_API_PATHS, router

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (17): dependencies, bcryptjs, mongoose, @workspace/db, devDependencies, tsx, @types/bcryptjs, @types/node (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (30): employeeIdFromCounter(), generateEmployeeId(), previewEmployeeId(), toIso(), formatUser(), UserDoc, formatComment(), formatLog() (+22 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (25): accentMap, DashboardHero(), ExecutiveStatCard(), fadeUp, KpiSimpleCard(), PageKpiRow(), PageKpiSkeleton(), PanelCard() (+17 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (34): assertCompanyAccess(), assertProjectAccess(), getClientCompanyForUser(), getCompanyAccess(), getProjectAccess(), projectCompanyId(), resolveCompanyIdFromBody(), computeCompletionPct() (+26 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, jsx, lib, moduleResolution, noEmit, paths, resolveJsonModule (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (16): 1. Set up Environment Configuration, 2. Initialize and Seed the Database, 3. Start the Applications, App branding (CMS), code:bash (DATABASE_URL=mongodb://127.0.0.1:27017/nexus_cms), code:bash (LINODE_OBJECT_BUCKET=your-bucket-name), code:powershell (# Seed initial agency, user, and demonstration data), code:powershell (npx pnpm --filter @workspace/api-server run dev) (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (13): dependencies, mongoose, zod, devDependencies, @types/node, exports, ./schema, name (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (13): CredentialHistory, credentialHistorySchema, CredentialTrigger, credentialTriggers, passwordResetTokensSchema, Session, sessionsSchema, User (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (13): devDependencies, prettier, typescript, license, name, pnpm, onlyBuiltDependencies, private (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (12): ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (18): MilestoneFormValues, milestoneSchema, EmailFormValues, emailSchema, EmployeeFormValues, employeeSchema, ROLE_STYLES, Alert (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (21): AppLogo(), AppLogoProps, sizeClass, iconSpring, Sidebar, SidebarNavLink(), SidebarProps, spring (+13 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (16): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Field(), FieldContent(), FieldDescription(), FieldError() (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.19
Nodes (13): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (10): Bug, BugPlatform, bugPlatforms, bugPriorities, BugPriority, bugSchema, bugSeverities, BugSeverity (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (9): dependencies, @tanstack/react-query, exports, name, peerDependencies, react, private, type (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, declarationMap, emitDeclarationOnly, lib, outDir, rootDir, extends (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (9): dependencies, firebase, jspdf, jspdf-autotable, socket.io-client, name, private, type (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, declarationMap, emitDeclarationOnly, outDir, rootDir, types, extends (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (8): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut()

### Community 47 - "Community 47"
Cohesion: 0.08
Nodes (35): ApkReleaseFormValues, apkReleaseSchema, LogFormValues, logSchema, WORK_CATEGORIES, EditFormValues, editSchema, TaskDetailPage() (+27 more)

### Community 48 - "Community 48"
Cohesion: 0.06
Nodes (38): createClientPortalUser(), updateClientPortalPassword(), formatCompanyRecord(), getCompanyActivity(), projectIdsForCompany(), paginateModel(), PaginateOptions, PaginationSlice (+30 more)

### Community 49 - "Community 49"
Cohesion: 0.16
Nodes (22): RequestRow, AdminTickets(), TicketFormValues, ticketSchema, RequestFormValues, requestSchema, DataViewMode, useDataViewMode() (+14 more)

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, declarationMap, emitDeclarationOnly, outDir, rootDir, extends, include

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (8): RequestStatus, requestStatuses, RequestType, requestTypes, requestUrgencies, RequestUrgency, ResourceRequest, resourceRequestSchema

### Community 52 - "Community 52"
Cohesion: 0.28
Nodes (8): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea()

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (7): devDependencies, orval, name, private, scripts, codegen, version

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): dependencies, zod, exports, name, private, type, version

### Community 56 - "Community 56"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 58 - "Community 58"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (6): HubSection, ProjectHubNav(), ProjectHubNavProps, ProjectHubTab, sectionForTab(), SECTIONS

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (6): Report, reportSchema, ReportStatus, reportStatuses, ReportType, reportTypes

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (6): Ticket, ticketPriorities, TicketPriority, ticketSchema, TicketStatus, ticketStatuses

### Community 63 - "Community 63"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, types, extends, include

### Community 64 - "Community 64"
Cohesion: 0.07
Nodes (27): 10. PDF reports (optional), 11. Verify, 1. Upload the project, 2. Install dependencies and build (SSH), 3. Production `.env` (repo root), 4. Seed database (once, SSH), 5. Run the API with Plesk Node.js, 6. Serve the React app (document root) (+19 more)

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (5): delay, exec, ext, ignore, watch

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (5): scripts, build, dev, serve, typecheck

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (3): apiClientReactSrc, apiZodSrc, root

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (4): Comment, commentSchema, ThreadType, threadTypes

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): Client, clientSchema, ClientStatus, clientStatuses

### Community 70 - "Community 70"
Cohesion: 0.40
Nodes (4): compileOnSave, extends, files, references

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (45): AdminClients(), canViewAsClient(), ClientFormValues, clientSchema, AdminEmployees(), canViewAsEmployee(), CHART_COLORS, EmployeeFormValues (+37 more)

### Community 72 - "Community 72"
Cohesion: 0.50
Nodes (3): firebaseConfig, messaging, notificationOptions

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (16): DiscussionsPage(), AdminProjectDetail(), ClientAnalytics(), ClientPortal(), CommandPalette(), CommandPaletteProps, useAuth(), useRealtime() (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.24
Nodes (3): ErrorBoundary, State, ImpersonationBanner()

### Community 85 - "Community 85"
Cohesion: 0.11
Nodes (13): IdLookupCache, formattedLogs, id, l, logs, p, pagination, { projectId, page = "1", limit = "20" } (+5 more)

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (15): RealtimeContext, RealtimeContextType, RealtimeProvider(), getApiBaseUrl(), firebaseConfig, initFirebase(), isFirebaseConfigured(), registerServiceWorker() (+7 more)

### Community 87 - "Community 87"
Cohesion: 0.07
Nodes (30): AdminAnalytics, AdminClients, AdminDashboard, AdminDiscussions, AdminEmployees, AdminProjectDetail, AdminProjects, AdminRequests (+22 more)

### Community 88 - "Community 88"
Cohesion: 0.27
Nodes (9): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+1 more)

### Community 89 - "Community 89"
Cohesion: 0.19
Nodes (15): AuthContext, AuthContextType, AuthProvider(), getApiBase(), refreshAccessToken(), clearTokens(), getAccessToken(), getRefreshToken() (+7 more)

### Community 90 - "Community 90"
Cohesion: 0.11
Nodes (19): HttpError, isHttpError(), statusToCode(), ApiErrorBody, badRequest(), conflict(), formatZodError(), humanizeField() (+11 more)

### Community 91 - "Community 91"
Cohesion: 0.13
Nodes (10): AdminDashboard(), BUG_SEVERITIES, getGreeting(), KpiCard(), Panel(), PIPELINE_STAGES, SERVICES, stagger (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.24
Nodes (9): SettingsPage(), useTheme(), useToast(), getInitials(), ProfilePage(), SettingsPage(), Toaster(), ToasterProps (+1 more)

### Community 93 - "Community 93"
Cohesion: 0.08
Nodes (26): formatNotificationRow(), NOTIFICATION_LIST_PROJECTION, unreadNotificationFilter(), broadcast(), parsePagination(), { content }, id, l (+18 more)

### Community 94 - "Community 94"
Cohesion: 0.50
Nodes (4): priorityClass(), ProjectCard(), statusBadgeClass(), getProjectDetailHref()

### Community 95 - "Community 95"
Cohesion: 0.27
Nodes (7): DataViewToggle(), DataViewToggleProps, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 96 - "Community 96"
Cohesion: 0.22
Nodes (8): Task, taskPriorities, TaskPriority, taskSchema, TaskStatus, taskStatuses, TaskType, taskTypes

### Community 97 - "Community 97"
Cohesion: 0.14
Nodes (14): devDependencies, esbuild-plugin-pino, nodemon, pino-pretty, thread-stream, @types/bcryptjs, @types/compression, @types/cookie-parser (+6 more)

### Community 98 - "Community 98"
Cohesion: 0.50
Nodes (4): formatDetailValue(), getColumnDetailContent(), TableDetailPanel(), TableDetailPanelProps

### Community 99 - "Community 99"
Cohesion: 0.70
Nodes (4): backfillFromProjects(), backfillProjects(), main(), normalizeCompanies()

### Community 100 - "Community 100"
Cohesion: 0.12
Nodes (15): BugRow, formatBugRow(), formatBugRows(), { assigneeId }, id, l, limit, newAssignee (+7 more)

### Community 102 - "Community 102"
Cohesion: 0.27
Nodes (8): ErrorPayload, getApiErrorMessage(), payloadMessage(), STATUS_HINTS, toastApiError(), FileUploader(), FileUploaderProps, UploadCategory

### Community 103 - "Community 103"
Cohesion: 0.19
Nodes (4): EmptyState(), EmptyStateProps, HoverCardContent, PopoverContent

### Community 104 - "Community 104"
Cohesion: 0.33
Nodes (6): scripts, build, dev, dev:once, start, typecheck

### Community 105 - "Community 105"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 106 - "Community 106"
Cohesion: 0.33
Nodes (5): SheetContentProps, SheetFooter(), SheetHeader(), SheetOverlay, sheetVariants

### Community 107 - "Community 107"
Cohesion: 0.50
Nodes (4): ErrorPayload, getApiErrorMessage(), payloadMessage(), STATUS_HINTS

### Community 108 - "Community 108"
Cohesion: 0.50
Nodes (3): artifactDir, buildAll(), esbuild

### Community 109 - "Community 109"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

## Knowledge Gaps
- **909 isolated node(s):** `name`, `version`, `license`, `build`, `typecheck:libs` (+904 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `Community 10` to `Community 9`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 3` to `Community 1`, `Community 7`, `Community 12`, `Community 17`, `Community 21`, `Community 25`, `Community 29`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 45`, `Community 46`, `Community 47`, `Community 49`, `Community 52`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 71`, `Community 88`, `Community 91`, `Community 92`, `Community 94`, `Community 95`, `Community 98`, `Community 103`, `Community 106`, `Community 109`, `Community 110`, `Community 111`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 1` to `Community 43`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `name`, `version`, `license` to the rest of the system?**
  _909 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10952380952380952 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._