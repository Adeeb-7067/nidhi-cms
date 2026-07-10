# Graph Report - backend\src  (2026-07-10)

## Corpus Check
- 315 files · ~151,934 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2179 nodes · 7165 edges · 90 communities (87 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b58bd8e`
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
- [[_COMMUNITY_Community 89|Community 89]]

## God Nodes (most connected - your core abstractions)
1. `badRequest()` - 264 edges
2. `notFound()` - 261 edges
3. `parseIdParam()` - 213 edges
4. `getNextSequence()` - 212 edges
5. `optionalString()` - 94 edges
6. `forbidden()` - 80 edges
7. `parsePagination()` - 64 edges
8. `logHrmAudit()` - 55 edges
9. `getOrCreateSettings()` - 49 edges
10. `conflict()` - 44 edges

## Surprising Connections (you probably didn't know these)
- `postAlertsDismiss()` --calls--> `parseIdParam()`  [EXTRACTED]
  controllers/alerts.controller.js → utils/route-errors.js
- `getAnalyticsWorkspace()` --calls--> `buildWorkspaceDashboard()`  [EXTRACTED]
  controllers/analytics.controller.js → services/workspace-dashboard.js
- `postAuthLogout()` --calls--> `optionalString()`  [EXTRACTED]
  controllers/auth.controller.js → utils/route-errors.js
- `postAuthForgotPassword()` --calls--> `isEmailConfigured()`  [INFERRED]
  controllers/auth.controller.js → lib/email.js
- `postAuthVerifyResetOtp()` --calls--> `optionalString()`  [EXTRACTED]
  controllers/auth.controller.js → utils/route-errors.js

## Communities (90 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (55): cancelLeaveRequest(), cancelWfhRequest(), deleteAsset(), deleteCandidate(), deleteDepartment(), deleteExperienceLetter(), deleteHoliday(), deleteOnboardingRecord() (+47 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (64): applyTrackStatusUpdates(), BUG_STATUSES, canSetDevStatus(), canSetFinalStatus(), canSetQaStatus(), CLOSED_BUG_STATUSES, cryptoRandom(), defaultTrackFields() (+56 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (53): normalizeAttendanceStatus(), PAID_ATTENDANCE_STATUSES, PRESENT_LIKE_STATUSES, PRIMARY_ATTENDANCE_STATUSES, correctionStatuses, hrmEmployeeRoles, attendanceCorrectionSchema, buildAttendanceContext() (+45 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (54): getUploadMaxBytesForCategory(), UPLOAD_MAX_BYTES, formatReportRow(), getReportsByIdDownload(), LOG_REPORT_TYPES, postReports(), create(), formatScreenshot() (+46 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (57): builtInAssignableCmsRoles, canAccessHrm(), cmsActions, cmsModuleGroups, cmsModules, defaultTemplateByRole, isHrmAdminRole(), legacyModuleMap (+49 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (48): escapeHtml(), experienceBody(), formatLetterDate(), generateExperienceLetterHtml(), pronouns(), relievingBody(), tenurePhrase(), hrmLetterSchema (+40 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (45): deleteAlertsById(), postAuthFcmToken(), postAuthForgotPassword(), postAuthResetPassword(), patchProjectsById(), postProjects(), patchUsersMePassword(), updateBudget() (+37 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (40): formatComment(), formatCommentsPage(), getComments(), getCompanyTeamMentionCandidates(), getProjectCommentPreviews(), isDirectDiscussionThread(), isProjectDiscussionThread(), mapCommentRow() (+32 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (42): embeddedDocumentStatuses, embeddedDocumentTypes, employeeBloodGroups, employeeGenders, employeeMaritalStatuses, employeePositions, employeeTypes, employeeWeekDays (+34 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (30): bdeTargetSchema, salesConfigSchema, salesConfigTypes, followupSchema, followupStatuses, followupTypes, installmentSchema, installmentStatuses (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (35): addLeaveFraction(), aggregateAttendanceForPayroll(), buildLeavePayrollByDate(), computePayrollLineAmounts(), evaluatePayrollReadiness(), PAYROLL_PAID_STATUSES, resolveContractSalary(), BANK_ENCRYPT_FIELDS (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (26): alertDeliverySchema, alertAudienceTypes, alertSchema, alertStatuses, auditLogSchema, clientTeamActivityActions, clientTeamActivitySchema, clientTeamMemberSchema (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (37): isPresentLikeStatus(), loadFirstSessionStarts(), buildApprovalPipeline(), buildAttendanceTrendPoints(), buildDashboardAnalyticsFromSummaries(), buildDashboardInsights(), buildDepartmentStrength(), buildEmployeeSelfSummary() (+29 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (37): deleteDocument(), isProfileDocumentId(), reviewDocument(), addStaffComment(), appendLog(), approveProposal(), assertProposalAccess(), CLIENT_RESPONDABLE_STATUSES (+29 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (36): patchHrmSettings(), applyCorrection(), excuseLateArrival(), reviewCorrection(), logHrmAudit(), getHrmPolicyContext(), workDayKeyForDate(), buildBalanceTransitionOps() (+28 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (23): clientVisibilityFilter(), getProjectsByProjectIdInventoryActivities(), getProjectsByProjectIdInventoryBuilds(), formatDeviceRow(), getProjectsByProjectIdInventoryDevices(), postProjectsByProjectIdInventoryDevices(), getProjectsByProjectIdInventoryEnvironments(), patchProjectsByProjectIdInventoryEnvironmentsById() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (28): createInstallment(), createInstallmentsFromProposal(), enrichInstallments(), getInstallmentById(), listInstallments(), nextReceiptNumber(), proposalFinalTotal(), receiveInstallmentPayment() (+20 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (30): allocateOldestFirst(), backfillCurrentMonthAccrual(), computeAvailableBalance(), computeCarryForwardAmount(), currentAccrualPeriodKey(), ensureBalanceRow(), ensureUserLeaveAccrualForPeriod(), findAccrualLeaveType() (+22 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (24): enrichIncome(), listIncome(), recordIncome(), backfillSalesPaymentsToFinance(), mirrorSalesPaymentToFinanceInTx(), syncSalesPayments(), detectTransactionSupport(), isStandaloneError() (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (24): patchAuthMe(), adminSetUserPassword(), getUsers(), getUsersById(), getUsersPreviewEmployeeId(), patchUsersById(), patchUsersByIdPassword(), postUsers() (+16 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (23): getClientCompanyForUser(), getCompanyAccess(), getProjectAccess(), projectCompanyId(), resolveCompanyIdFromBody(), isDeveloperRole(), isDevPortalStaffRole(), getAnalyticsClientHub() (+15 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (17): createVendor(), createDepartment(), deactivateDepartment(), updateDepartment(), createHoliday(), deleteHoliday(), updateHoliday(), seedLeaveTypes() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.21
Nodes (27): deleteClientTeamMember(), findMemberInCompany(), formatMember(), generateTemporaryPassword(), getClientTeamMe(), getClientTeamMemberById(), loadAdminContext(), patchClientTeamMember() (+19 more)

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (26): getAnalyticsDashboard(), getPresence(), getPresenceMe(), postPresenceHeartbeat(), initRealtime(), router, computeStatus(), countOnlineByRoles() (+18 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (16): isPublicApiRequest(), PUBLIC_API_PATH_PREFIXES, PUBLIC_API_PATHS, requireRole(), router, router, router, router (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (22): getCustomersSummary(), getBdeScope(), getDashboard(), getReports(), getRevenueTrend(), parseDateRange(), withCreatedAtRange(), computeOverdueByCustomer() (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (24): deleteClientsById(), enrichClientPortalPresence(), enrichClientsBatch(), formatClient(), getClientsById(), patchClientsById(), portalAvatarFromUser(), postClients() (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (21): getDirectConversationContacts(), getDirectConversations(), postDirectConversation(), directConversationSchema, dropLegacyParticipantIdsUniqueIndex(), buildClientSubtitleMap(), buildDirectConversationPairKey(), canInitiateDirectMessage() (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (12): fireAlert(), resolveRecipientIds(), runAlertSchedulerTick(), getFirebaseAdmin(), logger, emitToUsers(), stringifyFcmData(), sendWebPushToUser() (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (16): getNotifications(), postNotificationsBroadcast(), postNotificationsMarkAllRead(), getFinanceNotifications(), markAllFinanceNotificationsRead(), markFinanceNotificationRead(), syncFinanceAlerts(), upsertFinanceAlert() (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (15): verifyAccessToken(), _authCache, extractBearerToken(), getCachedUser(), requireAuth(), requireClientAdmin(), router, router (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.16
Nodes (22): getLogsComplianceCalendar(), getLogsDailySummary(), getWorkPolicy(), normalizeReminderHour(), addDaysToDateString(), buildComplianceCalendar(), buildDailyLogSummary(), complianceAlertAlreadySent() (+14 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (23): isPausedSessionResumableToday(), isSessionWithinMaxDuration(), resolveWorkDayTimezone(), sessionPolicyStopReason(), clockIn(), closeActiveSession(), closeActiveSessions(), closeSessionsExceedingMaxDuration() (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (18): loadUserMeta(), HttpError, isHttpError(), statusToCode(), duplicateKeyMessage(), errorHandler(), isCastError(), normalizeLegacyStatus() (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (18): candidateSources, dailyAttendanceSources, DEFAULT_ONBOARDING_TASKS, EXIT_WORKFLOW_STAGES, exitRequestStatuses, holidayScopes, holidayTypes, onboardingStatuses (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (18): deleteConfig(), getConfig(), postConfig(), salesPreferencesSchema, deleteProduct(), updateProduct(), applyDocumentBrandingUpdates(), DEFAULTS (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (20): getClientTeamActivity(), getClientTeamMembers(), getClients(), getCompanies(), getRequests(), getRequestsById(), patchRequestsById(), postRequests() (+12 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (13): requireHrmAccess(), requireAnyPermission(), requirePermission(), p(), router, p(), router, router (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (21): handleListDailyTotals(), loadSessionsByUserDay(), loadSessionWindowData(), loadSessionsForUserDay(), buildShiftMapForRange(), closeSessionAtShiftEnd(), closeSessionsPastShiftEnd(), computeShiftEndUtc() (+13 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (12): getAllowedOrigins(), getFrontendDistPath(), getRequiredPort(), auditMiddleware(), _auditQueue, flushAuditQueue(), responseCompression, notFoundHandler() (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (20): clientAsProposalCustomer(), customerUpdatesToClientSet(), formatClientAsCustomer(), resolveCustomerCreatorUserId(), attachCreatedByUsers(), bootstrapCustomerDiscussion(), createCustomer(), customerIdsWithPayments() (+12 more)

### Community 41 - "Community 41"
Cohesion: 0.16
Nodes (18): getPaymentById(), getPaymentsSummary(), listPayments(), computePaymentsSummary(), computeUnifiedOutstanding(), financeInvoiceOutstanding(), getUnifiedPayment(), listUnifiedPayments() (+10 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (16): bankAccountSchema, attachmentSchema, expenseCategories, expenseSchema, expenseStatuses, financePaymentModes, incomeSchema, incomeStatuses (+8 more)

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (19): returnAssetsForUser(), addUtcDays(), advanceExitStage(), approveExitRequest(), autoDeactivateDueEmployees(), cancelExitRequest(), computeNoticeDaysRemaining(), createExitRequest() (+11 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (21): isHrmAdminRole(), deleteDocument(), getDocuments(), getHrmEmployee(), getLeaveBalances(), getPayslipById(), getShiftAssignments(), patchAttendanceDailyOverride() (+13 more)

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (18): ALLOWED_STOP_REASONS, formatSession(), handleClockIn(), handleClockOut(), handleForceTerminate(), handleGetActive(), handleHeartbeat(), handleListActiveSessions() (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (15): assignShift(), computeExpectedMinutes(), createShiftTemplate(), DEFAULT_OFFICE_SHIFT, endOpenShiftAssignments(), formatExpectedHours(), getDefaultShiftTemplate(), normalizeShiftTemplate() (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.19
Nodes (16): getHrmSettings(), getSettings(), parseComplianceTimezone(), parseReminderHour(), parseRequiredDailyHours(), parseScreenshotInterval(), parseScreenshotRetention(), patchSettings() (+8 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (16): formatMemberResponse(), formatMilestones(), getProjectsById(), getProjectsByIdClientTeam(), getProjectsByIdHistory(), getProjectsByIdLogs(), getProjectsByIdMembers(), getProjectsByIdMilestones() (+8 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (17): isHrmEmployeeRole(), countDocuments(), assertOnboardingEligibleEmployee(), EMPLOYEE_LIST_PROJECTION, enrichEmployees(), generateTemporaryPassword(), getHrmEmployeeDetail(), getLatestPayrollNetForUser() (+9 more)

### Community 50 - "Community 50"
Cohesion: 0.11
Nodes (12): departmentStatuses, documentStatuses, payrollRunStatuses, hrmAuditLogSchema, departmentSchema, employeeDocumentSchema, payrollLineSchema, payrollRunSchema (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (16): assertCanEditLog(), buildLogsListQuery(), canAccessLog(), formatLog(), getLogs(), getLogsById(), patchLogsById(), postLogs() (+8 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (10): clockableStaffRoles, developerStaffRoles, hrmAdminRoles, impersonatableStaffRoles, monitorableStaffRoles, router, upload, uploadLimiter (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (16): buildInvoicePayloadFromInstallment(), createPaidInvoiceForInstallmentPayment(), ensureInvoiceForInstallment(), loadProposalForInstallment(), nextInvoiceNumber(), resolveInstallmentInvoiceDueDate(), createInvoiceFromInstallment(), applyInstallmentPaymentInTx() (+8 more)

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (16): buildTransportOptions(), getFromAddress(), getSmtpPass(), getSmtpUser(), getTransporter(), resolveAppUrl(), sendClientTeamInvitationEmail(), sendCustomerPaymentReminderEmail() (+8 more)

### Community 55 - "Community 55"
Cohesion: 0.24
Nodes (15): assertBuddyNotSelf(), buildDefaultOnboardingTasks(), buildDefaultOnboardingTasksFromTitles(), buildOnboardingTasks(), computeOnboardingProgress(), createOnboardingFromCandidate(), createOnboardingRecord(), deleteOnboardingRecord() (+7 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (13): collectProfileDocuments(), createDocument(), dedupeDocuments(), listDocuments(), loadUsersForDocumentScope(), profileDocId(), profileFieldDoc(), USER_DOC_FIELDS (+5 more)

### Community 57 - "Community 57"
Cohesion: 0.22
Nodes (15): adminPermissions(), CLIENT_PERMISSION_LEVELS, CLIENT_PORTAL_SECTIONS, CLIENT_SECTION_LABELS, defaultMemberPermissions(), isValidLevel(), isValidSection(), LEVEL_RANK (+7 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (13): staffEmployeeRoles, formatAuthUser(), getAuthMe(), postAuthImpersonateByUserId(), postAuthLogin(), postAuthLogout(), postAuthRefresh(), postAuthRequestChangePasswordOtp() (+5 more)

### Community 59 - "Community 59"
Cohesion: 0.21
Nodes (13): computePeriodSummary(), fiscalYearRange(), gstCollectedInRange(), gstPaidInRange(), listTaxSummaries(), monthRange(), quarterRange(), taxDeposited() (+5 more)

### Community 60 - "Community 60"
Cohesion: 0.12
Nodes (15): activitySchema, credentialAccessLogSchema, credentialSchema, deviceSchema, environmentSchema, folderSchema, inventoryCredentialTypes, inventoryDeviceStatuses (+7 more)

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (12): startEmployeeExitJob(), isDatabaseConnected(), safeUrl, whenDatabaseReady(), runHeartbeatStaleSessionCleanup(), runScreenshotPurge(), runShiftEndSessionCleanup(), runStaleSessionCleanup() (+4 more)

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (12): assertCompanyAccess(), getCompaniesById(), getCompaniesByIdActivity(), getCompaniesByIdProjects(), getCompaniesByIdTickets(), patchCompaniesById(), postCompanies(), resolveGstNumber() (+4 more)

### Community 63 - "Community 63"
Cohesion: 0.21
Nodes (13): assetCategories, assetConditions, assetStatuses, assetSchema, categoryTagPrefix(), createAsset(), deleteAsset(), getAsset() (+5 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (14): getAttendanceCorrections(), getAttendanceDaily(), getAttendanceVariance(), getHrmEmployees(), getLeaveRequests(), getWfhRequests(), parseDateRange(), patchAttendanceCorrection() (+6 more)

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (10): ASSIGNABLE_ROLE_VALUES, getAlerts(), patchAlertsById(), postAlerts(), postAlertsDismiss(), validateAlertInput(), getUsersByIdCredentials(), formatAlertRow() (+2 more)

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (12): computeCustomerFinancials(), loadCustomerFinancialsMap(), resolveCustomerFinancials(), sumInstallmentCollected(), sumInstallmentOutstanding(), sumInstallmentScheduled(), BILLABLE_INVOICE_STATUS_FILTER, invoiceOutstanding() (+4 more)

### Community 67 - "Community 67"
Cohesion: 0.26
Nodes (11): assertProjectAccess(), formatRelease(), getApkReleasesById(), postProjectsByIdApkReleases(), deleteProjectsById(), getProjectsByIdApkReleases(), APK_AUDIENCES, apkReleaseCustomName() (+3 more)

### Community 68 - "Community 68"
Cohesion: 0.24
Nodes (10): EXPENSE_CATEGORY_LABELS, computeBankLedgers(), computeClientLedgers(), computeExpenseCategoryLedgers(), computeVendorLedgers(), createBankAccount(), getBankLedgers(), getClientLedgers() (+2 more)

### Community 69 - "Community 69"
Cohesion: 0.27
Nodes (9): combineFilters(), getTickets(), patchTicketsById(), postTickets(), validateStoredFileUrls(), IdLookupCache, formatTicketRow(), formatTicketRows() (+1 more)

### Community 70 - "Community 70"
Cohesion: 0.15
Nodes (12): apkDownloadLogSchema, apkPlatforms, apkReleaseSchema, apkReleaseTypes, apkAudiences, apkScheduleSchema, milestoneSchema, milestoneStatuses (+4 more)

### Community 71 - "Community 71"
Cohesion: 0.20
Nodes (7): getConsentStatus(), getMonitoringAnalytics(), MISSING_CLOCK_OUT_STOP_REASONS, emptyAnalytics(), getMonitoringAnalytics(), monthBounds(), round1()

### Community 72 - "Community 72"
Cohesion: 0.31
Nodes (12): apiFieldForDuplicate(), duplicateKeyToApiBody(), duplicateKeyToHttpError(), FIELD_LABELS, fieldFromIndexName(), findMongoDuplicateKeyError(), isMongoDuplicateKeyError(), labelForKey() (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.28
Nodes (12): sweepOverdueInvoices(), enrichInvoices(), getInvoiceAging(), getInvoiceById(), getInvoicesSummary(), listInvoices(), nextInvoiceNumber(), remindInvoice() (+4 more)

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (8): getSharedBrowser(), launchBrowser(), withBrowserPage(), generateExcelReport(), generatePdfReport(), loadProjectLogs(), logDateFilter(), persistGeneratedFile()

### Community 75 - "Community 75"
Cohesion: 0.25
Nodes (9): assertTicketAccess(), buildTicketAudienceCondition(), buildTicketListFilter(), isStaffTicketRole(), loadTicketOrThrow(), OPEN_TICKET_STATUSES, STAFF_CREATOR_ROLES, TICKET_AUDIENCES (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.36
Nodes (9): getDashboard(), getExpenseBreakdown(), getRevenueTrend(), computeDashboardKpis(), computeExpenseCategoryBreakdown(), computeMonthlyRevenueVsExpense(), getPayrollCostForPeriod(), monthBounds() (+1 more)

### Community 77 - "Community 77"
Cohesion: 0.38
Nodes (9): computeDepartmentProfitability(), computeMonthlyPnl(), computeProjectProfitability(), computeRevenueTrend(), computeYearlyPnl(), lastNMonths(), payrollCostByMonth(), getPnl() (+1 more)

### Community 78 - "Community 78"
Cohesion: 0.25
Nodes (9): budgetSchema, budgetStatuses, budgetTypes, computeSpentForBudget(), createBudget(), deleteBudget(), listBudgets(), parseFiscalYear() (+1 more)

### Community 79 - "Community 79"
Cohesion: 0.20
Nodes (9): bugAttachmentSchema, bugIssueSchema, bugPlatforms, bugPriorities, bugSchema, bugSeverities, bugStatuses, finalStatuses (+1 more)

### Community 80 - "Community 80"
Cohesion: 0.44
Nodes (6): nextFinanceNumber(), recordIncomingPayment(), normalizeFinanceInvoice(), calcInvoiceTotal(), deriveIncomeStatus(), deriveInvoiceStatus()

### Community 81 - "Community 81"
Cohesion: 0.43
Nodes (7): createInitialComment(), normalizeAttachmentsInput(), notifyNewAssignees(), patchBugsById(), patchBugsByIdAssign(), postBugs(), postBugsBatch()

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (4): getAllTargetsForMonth(), getBdeTargets(), parseOptionalNumber(), upsertBdeTarget()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (5): leaveDayParts, leaveRequestStatuses, leaveBalanceSchema, leaveRequestSchema, leaveTypeSchema

### Community 84 - "Community 84"
Cohesion: 0.40
Nodes (4): ticketAudiences, ticketPriorities, ticketSchema, ticketStatuses

### Community 86 - "Community 86"
Cohesion: 0.83
Nodes (3): decryptSecret(), encryptSecret(), getKey()

## Knowledge Gaps
- **270 isolated node(s):** `app`, `PUBLIC_API_PATH_PREFIXES`, `PAID_ATTENDANCE_STATUSES`, `PRESENT_LIKE_STATUSES`, `LEVEL_RANK` (+265 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `notFound()` connect `Community 13` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 33`, `Community 35`, `Community 36`, `Community 40`, `Community 41`, `Community 43`, `Community 44`, `Community 46`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 58`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 67`, `Community 69`, `Community 73`, `Community 75`, `Community 78`, `Community 80`, `Community 81`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `badRequest()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 10`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 26`, `Community 27`, `Community 29`, `Community 31`, `Community 33`, `Community 35`, `Community 36`, `Community 38`, `Community 40`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 58`, `Community 59`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 67`, `Community 68`, `Community 69`, `Community 71`, `Community 73`, `Community 78`, `Community 80`, `Community 81`, `Community 82`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `getNextSequence()` connect `Community 21` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 22`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 63`, `Community 65`, `Community 67`, `Community 68`, `Community 69`, `Community 73`, `Community 78`, `Community 80`, `Community 81`, `Community 82`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `badRequest()` (e.g. with `recordAdminManualClockSessions()` and `applyCorrection()`) actually correct?**
  _`badRequest()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `notFound()` (e.g. with `reviewCorrection()` and `loadUserMeta()`) actually correct?**
  _`notFound()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `app`, `PUBLIC_API_PATH_PREFIXES`, `PAID_ATTENDANCE_STATUSES` to the rest of the system?**
  _270 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03849544519541581 - nodes in this community are weakly interconnected._