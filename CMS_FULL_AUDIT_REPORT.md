# Content Management Hub — Full Codebase Audit

**Audit date:** 2026-08-11 (refresh)\
**Prior audit:** 2026-07-31\
**Auditor role:** Senior Software Architect & Code Auditor\
**Repository:** `D:\Content-Management-Hub`\
**HEAD commit:** `484d3d11` — *feat: add useFrameScrubber hook for scroll-based video and frame-by-frame image playback*\
**Scope:** Live source only (`backend/`, `frontend/`, `website/`, `electron/`, root configs/docs)\
**Companion catalog:** [`CMS_AUDIT_FILE_CATALOG.json`](./CMS_AUDIT_FILE_CATALOG.json) — **1,465 files**, ~336.5k LOC  
**SaaS / CTO readiness audit:** [`CMS_SAAS_CTO_AUDIT.md`](./CMS_SAAS_CTO_AUDIT.md) — scorecard, Top 20/50, 30/60/90 roadmap (2026-08-01)

***

## 0. Scope, exclusions, and methodology

### Included

* All application source under `backend/src`, `frontend/src`, `website/src`, `electron/`
* Tests, scripts, OpenAPI, configs, docs
* Environment *templates* (not live secrets)

### Explicitly excluded (not application source)

| Path | Reason |
|------|--------|
| `node_modules/` | Third-party |
| `.git/` | VCS |
| `**/dist/`, `electron/dist-electron/`, `win-unpacked/` | Build artifacts / binaries |
| `uploads/`, `private-uploads/` | Runtime user content |
| `website/public/frames/` | Static video frame images & assets |
| `.mongo-data/`, `.mongo-log/` | Local DB volume |
| `graphify-out/` | Generated knowledge graph |
| Live `.env` files | Secrets (names audited; values not reproduced) |

### Methodology

1. Full recursive inventory → `CMS_AUDIT_FILE_CATALOG.json` (path, type, LOC, purpose class).
2. Knowledge-graph structure (code-review-graph: **509** indexed files / **2,446** nodes / **35k** edges; graphify: **16k+** nodes / **467** communities, refreshed 2026-08-11).
3. Deep review of auth, crypto, uploads, RBAC, finance GST, realtime, god components — re-verified paths after modular monolith move and website integration.
4. Module-level quality scoring for every domain; narrative for security-critical and architecture-critical files.
5. Delta since 2026-07-31: new `website/` landing application (scroll-driven video/frame engine `useFrameScrubber`), work-session overtime idle auto-pause policy & post-shift heartbeat cleanup, digital access control for roster Account Managers (`3968ace`), and unit test suite expansion (**447 assertions across 123 suites / 66 test files**).

### Running summary (final)

| Metric | Value |
|--------|------:|
| Files inventoried | **1,465** |
| Approx. LOC (source) | **~336,500** |
| Backend modules | **19** domains under `src/modules/` |
| Controllers / services / schemas | **90** / **113** / **99** entity files |
| Backend unit tests | **66 test files (447 test assertions across 123 suites)** |
| Frontend automated tests | **0** |
| Files with Critical issues | **7** (paths below) |
| Files with High issues | **16** |
| Files with Medium issues | **45+** (incl. god components / index gaps) |
| Overall code health | **74%** (+3 vs Jul 31 — website app + overtime idle pause policy + expanded test suite) |
| Technical debt estimate | **~12–18 engineer-weeks** to clear P0/P1 |
| Production readiness | **70%** (internal agency, hardened env) / **55%** (internet-facing without fixes) |

### Delta since 2026-07-31

| Change | Impact on audit |
|--------|-----------------|
| New `website/` Application (`website/src`) | Modern Vite + React 19 public marketing site featuring scroll-driven video frame scrubbing (`useFrameScrubber`), dynamic pages, loading skeletons, contact forms. |
| Work Session & Heartbeat Monitoring | Added post-shift heartbeat monitoring, overtime stale-activity auto-pause logic, and duration calculation engine with 100% test coverage. |
| Digital Access Control (`3968ace`) | Enhanced digital access control for project roster Account Managers in `backend/src/modules/access/`. |
| Backend Unit Test Suite Expansion | Test suite expanded to **66 test files** containing **447 test assertions across 123 suites** (100% passing when `SESSION_SECRET` is set). |
| Image Caching & Frame Management | Added custom HTTP caching headers and frame management hooks for high-performance scroll scrubbing. |

***

## 1. Complete project tree (meaningful)

```
Content-Management-Hub/
├── backend/                         # Express 5 API (modular monolith)
│   ├── index.js, load-env.js, build.mjs, openapi.yaml, ecosystem.config.cjs
│   ├── ARCHITECTURE.md, DEPLOYMENT.md, scripts/
│   └── src/
│       ├── app.js
│       ├── api-zod/                 # OpenAPI-generated Zod
│       ├── config/, constants/, lib/, mappers/, middlewares/, utils/, views/
│       ├── models/schema/index.js   # Aggregate barrel → modules/*/schema
│       ├── routes/index.js          # Auth gate + mounts all module routers
│       └── modules/                 # Domain modules (see MODULES.md)
│           ├── access/ admin/ alerts/ ca/ collab/ crm/
│           ├── finance/ hrm/ identity/ inventory/ jobs/ legal/
│           ├── marketing/ monitoring/ platform/ sales/ settings/
│           ├── uploads/ work/
│           └── MODULES.md
├── frontend/                        # Vite + React 19 SPA (Admin/Employee Portal)
│   ├── vite.config.ts, electron.vite.config.ts, orval.config.ts
│   └── src/
│       ├── api/, assets/, components/, contexts/, hooks/, lib/
│       ├── modules/                 # admin|ca|finance|hrm|legal|marketing|permissions|sales
│       └── pages/                   # admin|ca|client|dev|finance|hrm|legal|marketing|sales|…
├── website/                         # Vite + React 19 Public Landing & Marketing Site
│   ├── vite.config.ts, package.json
│   └── src/
│       ├── components/              # Pages (Landing, MarketingShell), Sections, UI
│       ├── hooks/                   # useFrameScrubber (scroll-driven video/frame engine)
│       ├── lib/                     # Image caching & API helpers
│       └── types/
├── electron/                        # Desktop shell (main/preload/launch)
├── graphify-out/                    # Knowledge graph (excluded from code audit)
├── .cursor/, .claude/
├── AGENTS.md, README.md, CODEBASE_ANALYSIS.txt, LOCAL_RUNNING.md
├── ELECTRON_INSTALL_GUIDE.md, DEPLOYMENT_PLESK.md
├── CMS_AUDIT_FILE_CATALOG.json
└── CMS_FULL_AUDIT_REPORT.md
```

**Counts:** frontend 698 TS/TSX · website 158 TS/TSX · backend 563 JS/MJS files · electron 7 TS/JS · tests **67 test files / 447 assertions across 123 suites**.

***

## 2. Architecture Report

### Current pattern

**Split monorepo** with **domain modular monolith** backend:

```
HTTP → app.js (helmet/cors/compress)
     → /api router (global requireAuth except PUBLIC_API_PATHS)
     → modules/<domain>/routes (requireRole / requirePermission)
     → modules/<domain>/controllers → services → schema
     → mappers (response shaping)
```

Frontend: React 19 + Vite + Wouter + TanStack Query + Socket.IO client + role/permission-gated `PageOutlet`.\
Electron: shell only (remote API); screenshot agent uses private content proxy.

### Strengths

* Documented layered + modular architecture (`backend/ARCHITECTURE.md`, `MODULES.md`)
* Dual RBAC: CMS role + permission templates
* AES-256-GCM for inventory & HRM payroll PII (fail-closed if key missing)
* OpenAPI contract + generated Zod/Orval clients
* Soft-delete patterns in marketing; **partial** GST soft-delete in finance-tax
* Screenshots isolated from public static (`private-uploads` + authenticated content route)
* Route-level `React.lazy` in PageOutlet
* **64** backend unit tests (payroll, sales, RBAC matrix, crypto, digital RBAC, bank statements, legal dashboard, users IDOR scope, finance GST)

### Weaknesses

* God components (2k+ LOC modals/pages)
* Hand-written `api/{finance,sales,hrm,ca,legal}.ts` overlap Orval generated client
* In-process caches (auth, permissions, presence) break multi-instance
* Zod request validation middleware largely unused on routes
* Zero frontend automated tests
* JWT / credential-history crypto still allow **hardcoded dev defaults**
* Static `/uploads` still unauthenticated for non-screenshot assets
* Expense soft-delete not yet applied in KPI/ledger/report aggregations

### Scalability

| Area | Assessment |
|------|------------|
| Single-node agency (~50–200 users) | Adequate after P0 money/security fixes |
| Multi-instance / k8s | Blocked until Redis for Socket.IO + shared presence/caches |
| Finance ledger growth | Blocked until DB-side pagination (unified invoices load full collections) |
| Frontend bundle | Risk from FinanceFormModals / sales dialog monoliths |

### Suggested improvements

1. Fail-closed secrets in production.
2. Auth-gated or signed-URL uploads for remaining public static files.
3. Shared expense match helper with `isDeleted` in **all** money aggregations (not only tax service).
4. Redis adapter for realtime; DB pagination for ledgers.
5. Split god UI files; prefer Orval; add frontend smoke tests for auth/RBAC.

***

## 3. Security Audit

### Critical

| ID | Issue | File(s) | Risk if unfixed | Status |
|----|--------|---------|-----------------|--------|
| C1 | JWT secrets default to `"cms-*-secret-dev"` | `backend/src/lib/jwt.js` | Anyone can forge tokens if env unset | **Open** |
| C2 | Credential history uses XOR + `"cms-cred-key-dev"` fallback | `backend/src/lib/password.js` | Stored passwords reversible with known key | **Open** |
| C3 | Access/refresh tokens in `localStorage` | `frontend/src/lib/auth-storage.ts` | XSS = full account takeover | **Open** |
| C4 | `express.static("/uploads")` unauthenticated | `backend/src/app.js` | Guessable URLs leak APKs/docs | **Partial** — screenshots blocked + private store; other uploads still public |

### High

| ID | Issue | File(s) | Status |
|----|--------|---------|--------|
| H1 | No rate limit on login/refresh/OTP | `identity` auth routes/controller | **Open** |
| H2 | `GET /users/:id` IDOR for non-clients | `identity/controllers/users.controller.js` | **Mitigated** — `assertCanViewUserProfile` + unit test; re-verify edge roles |
| H3 | Access token accepted via `?token=` query | `routes/index.js`, screenshot content | **Accepted tradeoff** for `<img>` — keep short-lived / scoped |
| H4 | CORS/Socket allow-all when `ALLOWED_ORIGINS` unset | `config/env.js`, `lib/realtime.js` | **Open** |
| H5 | Upload finalize may accept unbound storage keys | `uploads` controller | **Open** |
| H6 | Super-admin inventory list returns decrypted secrets | `inventory` credentials controller | **Open** |
| H7 | Impersonation mints target JWT without auditor claim | `identity` auth controller | **Open** |

### Medium / Low

Helmet CSP off; Zod middleware unused; weak password policy (min 8); plaintext refresh tokens in sessions; 30s auth cache; unescaped `$regex` ReDoS; upload MIME not allowlisted; public proposal endpoints without rate limit.

### Dependency note

Run `npm audit` in `backend/` and `frontend/` before each release (not executed in this pass — treat as process gap).

### Security improvement roadmap

| Phase | Actions | Effort |
|-------|---------|--------|
| Week 1 | Fail-closed JWT/CRED keys in prod; rotate secrets; gate remaining `/uploads` or signed URLs; rate-limit auth | 3–5 d |
| Week 2 | Migrate credential history to AES-GCM; bind upload finalize | 3–5 d |
| Week 3 | Re-audit user IDOR edges; enable CSP; wire Zod on mutating routes; escape regex | 4–6 d |
| Month 2 | Prefer httpOnly cookie sessions (breaking for Electron); refresh rotation | 1–2 w |

**Breaking changes:** cookie auth vs localStorage; signed upload URLs break hard-coded `/uploads/...` in Electron redirect — coordinate `electron/main.js` interceptors.

***

## 4. Database Audit

### Schema quality

* **~92** entity schema files across modules; numeric `id` + `ref` (agency pattern, not ObjectId FKs)
* Indexes generally good on marketing/finance hot fields
* Soft-delete **inconsistent**: marketing OK; expenses have `isDeleted` — list + tax filter them; several report/KPI services still omit the filter; projects/users queried with `isDeleted` without consistent schema field

### Critical correctness

**Soft-deleted expenses may still count in P\&L / KPIs / ledger summaries** where services omit `isDeleted: { $ne: true }`. `finance-tax.service.js` now filters correctly; extend the same helper to `finance-kpis`, `finance-reports`, `unified-ledger`, `expense-cash`, etc.

### Index recommendations

1. Expenses: `{ isDeleted, status, date }` (isDeleted already indexed)
2. Finance & sales invoices: index `issueDate`
3. Comments: `{ threadType, threadId, isDeleted, createdAt }`
4. Payments: `{ direction, date }`
5. Align Projects soft-delete (add field or remove dead query filters)

### Query optimization

* Stop `find({})` full loads in `unified-ledger.service.js` (invoices/payments/aging)
* Push GST tax math to aggregation / denormalized `taxAmount`
* Budget controller: eliminate per-budget N+1 and full `usersTable.find({})`

***

## 5. Performance Audit

| Area | Finding | Severity |
|------|---------|----------|
| Unified ledger | Full collection load then in-memory page | Critical at scale |
| Tax summaries | Improved soft-delete; still loads invoices into JS | High |
| Marketing dashboard | ~18 parallel queries + chart full pulls | High |
| FinanceFormModals | ~2.6k LOC single chunk | High bundle |
| Presence | Process-local Map + broadcast all sockets | High multi-instance |
| Auth cache | Good for single node | OK |
| PageOutlet lazy routes | Good (~955 LOC hub) | OK |

### Performance roadmap

1. DB pagination for unified invoices/payments
2. Shared expense match helper including `isDeleted`
3. Split FinanceFormModals / sales dialogs into lazy modules
4. Redis Socket.IO adapter before horizontal scale
5. TTL cache for tax/KPI snapshots

***

## 6. Maintainability Report

| Topic | Score / note |
|-------|----------------|
| Folder structure | **9/10** — domain modules + clear MVC (up from 8) |
| Coding standards | **7/10** — conventions documented; some god files violate SRP |
| Documentation | **8/10** — ARCHITECTURE, MODULES, CODEBASE\_ANALYSIS, AGENTS |
| Tests | **6/10** — 64 backend unit tests (+17 vs prior); **0** frontend |
| Technical debt | God pages (FinanceFormModals 2.6k, customer-detail 1.9k, Discussions 1.6k); dual API clients |
| Dead code (graph) | No broad dead_code flags in `backend/src` |

***

## 7. File-by-file deep audit (critical & architecture paths)

> Full inventory of all 1,298 files is in `CMS_AUDIT_FILE_CATALOG.json`.\
> Paths below updated for the modular layout.

***

### 7.1 `backend/src/lib/jwt.js`

* **LOC:** ~23 · Sign/verify access/refresh JWTs
* Quality **4/10** · **Security: Critical** — hardcoded `"cms-access-secret-dev"` / `"cms-refresh-secret-dev"`
* **Recommendation:** Refuse boot in production without secrets

***

### 7.2 `backend/src/lib/password.js`

* bcrypt hash/verify (good) + XOR credential history with `"cms-cred-key-dev"` fallback
* **Security: Critical** — migrate history to AES-GCM; fail-closed key in prod

***

### 7.3 `backend/src/app.js`

* Helmet/CORS/compress + `/uploads` static
* Screenshots path blocked from public static; files live under `private-uploads/`
* **Remaining:** APKs, inventory attachments, general uploads still world-readable by URL

***

### 7.4 `backend/src/modules/identity/controllers/auth.controller.js`

* Login, refresh, OTP reset, impersonate, FCM
* No rate limiting / lockout; sessions store refresh plaintext; impersonation without `act` claim
* Quality **6/10** · Security **5/10**

***

### 7.5 `backend/src/modules/identity/controllers/users.controller.js`

* `getUsersById` uses `assertCanViewUserProfile` (mitigation since Jul 22)
* Credential reveal still uses XOR history
* Keep regression tests in `users-idor-scope.test.js`

***

### 7.6 `backend/src/modules/identity/services/permissions.service.js`

* **LOC:** ~890 · Role templates, module×action matrix
* Quality **7/10** · Covered by `role-matrix-completeness` tests
* Split template seed vs runtime checks when next touched

***

### 7.7 `backend/src/modules/access/services/` (company/project access + list-scope)

* Central IDOR prevention on projects/companies — **8/10**
* Digital role + digital project type add extra branches — covered by `digital-rbac.test.js`

***

### 7.8 `backend/src/modules/finance/services/finance-tax.service.js`

* Soft-deleted expenses excluded in tax path (**improved**)
* Full invoice loads for GST collected; TDS filters payroll in JS remain
* **Impact:** Medium–High until sibling report/KPI services match

***

### 7.9 `backend/src/modules/finance/services/unified-ledger.service.js`

* In-memory merge/pagination of invoice collections; summaries with huge limits
* High · Effort: 3–5 days for DB-side pagination

***

### 7.10 `frontend/src/lib/auth-storage.ts` + `AuthContext.tsx`

* localStorage tokens; impersonation token swap complexity
* Critical (XSS) · Cookie migration is breaking for Electron

***

### 7.11 `frontend/src/components/layout/PageOutlet.tsx`

* **LOC:** ~955 · Route table + lazy pages + permission gates
* Quality **7/10** · Maintainability **5/10** · Untested hotspot
* Extract route config tables; add smoke tests for role→home

***

### 7.12 God UI / backend files (maintainability debt)

| File | LOC | Severity |
|------|----:|----------|
| `frontend/src/modules/finance/components/FinanceFormModals.tsx` | ~2585 | High |
| `frontend/src/modules/sales/components/customer-detail-sections.tsx` | ~1850 | High |
| `frontend/src/pages/admin/Discussions.tsx` | ~1567 | Medium |
| `frontend/src/pages/admin/ProjectDetail.tsx` | ~1362 | Medium |
| `frontend/src/pages/admin/Employees.tsx` | ~1358 | Medium |
| `frontend/src/pages/admin/Projects.tsx` | ~1309 | Medium |
| `backend/src/modules/identity/services/permissions.service.js` | ~890 | Medium |
| HRM payslip / letter templates (hrm services) | ~1k+ | Medium |

***

## 8. Module catalog quality scores (all domains)

Scoring: Quality / Readability / Maintainability (1–10). Severity = worst open issue class in module.

| Module | Files (approx) | Q | R | M | Severity | Notes |
|--------|---------------:|--:|--:|--:|----------|-------|
| Auth & sessions (`identity`) | ~18 | 5 | 8 | 6 | Critical | Secrets, rate limit, storage |
| Permissions / RBAC | ~15 | 7 | 7 | 6 | Medium | Large service; good tests |
| Access scoping (`access`) | ~7 | 8 | 8 | 7 | Low | Solid + digital RBAC tests |
| Users / employees | ~20 | 7 | 7 | 6 | Medium | IDOR mitigated; re-verify |
| Clients / companies / projects (`crm`) | ~13 | 7 | 7 | 6 | Medium | Digital type + soft fields |
| Bugs / logs / tasks (`work`) | ~34 | 7 | 7 | 7 | Low | Core CMS mature |
| Tickets / requests | (in work) | 7 | 7 | 7 | Low | |
| Comments / discussions (`collab`) | ~18 | 6 | 6 | 5 | Medium | Index + huge UI |
| Inventory / vault | ~17 | 8 | 8 | 7 | High | List decrypt for SA |
| Uploads / storage | ~3 | 5 | 7 | 6 | Critical | Public static residue |
| Screenshots / monitoring | ~23 | 7 | 7 | 6 | Medium | Private uploads; query token |
| Work sessions | (in monitoring) | 7 | 8 | 7 | Low | Rate limited |
| Notifications / alerts | ~6+collab | 6 | 7 | 6 | Medium | |
| Realtime / presence | ~lib + monitoring | 5 | 7 | 5 | High | Process-local |
| HRM | ~56 | 7 | 7 | 6 | Medium | Large; crypto OK |
| Sales / CRM | ~35 | 7 | 7 | 6 | Medium | Public proposals; big UI |
| Finance | ~45 | 6 | 7 | 5 | High | Tax soft-delete OK; KPI/ledger gaps |
| Marketing / digital | ~25 | 7 | 7 | 7 | Medium | Dashboard query fan-out |
| CA | ~23 | 7 | 7 | 6 | Medium | Live API + bank statements |
| Legal | ~11 | 7 | 7 | 6 | Medium | Live API + dashboard tests |
| Frontend layout/nav | ~30 | 7 | 7 | 6 | Medium | PageOutlet hub |
| Electron | ~14 | 7 | 8 | 7 | Medium | Origin null CORS coupling |
| Backend tests | 64 | 8 | 8 | 8 | — | Strong islands |
| Frontend tests | 0 | 1 | — | — | High | Coverage gap |
| Scripts / ops | ~44 | 6 | 6 | 6 | Low | Keep out of prod image |

***

## 9. Prioritized issues (Critical → Low)

1. **C1** JWT hardcoded secret fallbacks — `lib/jwt.js`
2. **C2** XOR credential history + default key — `lib/password.js`
3. **C4** Remaining public `/uploads` — `app.js`
4. **P0 Money** Soft-deleted expenses in KPI/P\&L/ledger services (tax path fixed)
5. **C3** localStorage tokens — `auth-storage.ts`
6. **H1** Auth rate limiting
7. **H4** CORS allow-all default
8. **P0/P1** Unified ledger full-collection loads
9. **H5** Upload finalize key binding
10. **H6** Inventory bulk decrypt
11. **H7** Impersonation audit claims
12. **H3** Token in query string (document + expire tightly)
13. Missing `issueDate` / composite expense indexes where needed
14. Socket.IO no Redis adapter
15. FinanceFormModals / sales god components
16. Zod validation unused on routes
17. Helmet CSP off
18. Zero frontend tests
19. Projects/users `isDeleted` query/schema drift

***

## 10. Refactoring roadmap

| Quarter | Theme | Outcomes |
|---------|-------|----------|
| Q0 (2 w) | Security + money correctness | Fail-closed secrets, uploads gate, shared expense soft-delete helper, auth rate limits |
| Q1 | Data layer scale | Unified ledger DB pagination, indexes, denormalized taxAmount |
| Q1–Q2 | UI decomposition | Split FinanceFormModals, Discussions, Employees, Projects |
| Q2 | API client consolidation | Prefer Orval; delete duplicate hand clients where safe |
| Q2 | Multi-instance ready | Redis for Socket.IO, presence, optional auth cache |
| Ongoing | Tests | Frontend Playwright smoke: login, RBAC home, finance tax fixture |

***

## 11. Production readiness

| Dimension | Score |
|-----------|------:|
| Feature completeness (agency CMS) | 84% |
| Architecture clarity | 88% |
| Security hardening | 48% |
| Data correctness (finance) | 62% |
| Observability / ops | 65% |
| Test coverage | 48% |
| Scalability (horizontal) | 35% |
| **Weighted overall** | **65%** |

Ready for **controlled internal production** only after Week-1 security + remaining expense soft-delete fixes and verified production env secrets/CORS.

***

## 12. Top 10 highest-impact actions

1. Fail-closed JWT and `CRED_ENCRYPT_KEY` in production; rotate all secrets.
2. Auth-gate or signed URLs for remaining `/uploads`; keep screenshots private.
3. Shared `activeExpenseMatch` helper — use in every finance GST/P\&L/KPI aggregation.
4. Rate-limit `/auth/login`, refresh, and OTP endpoints.
5. Require `ALLOWED_ORIGINS` in production (no CORS `true`).
6. Replace XOR credential history with AES-GCM; stop default keys.
7. DB-paginate unified invoice/payment ledgers; add `issueDate` indexes.
8. Split `FinanceFormModals.tsx` into lazy per-entity modals.
9. Add Redis Socket.IO adapter before any second Node replica.
10. Playwright: login + role home redirects for `finance` / `digital` / `ca` / `bde`.

***

## 13. Executive summary (stakeholders)

Content Management Hub is a mature **agency operations platform** (projects, QA, HRM, sales, finance, marketing/digital, legal, CA, client portal, Electron monitoring) with a **clear modular backend** and substantial live feature surface.

**It is not fully production-hardened.** Highest business risks remain: (1) **forgeable sessions** if JWT secrets stay at defaults, (2) **public file URLs** for non-screenshot uploads, (3) **incorrect tax/P\&L** if soft-deleted expenses remain in non-tax aggregations, and (4) **session theft via XSS** because tokens live in `localStorage`.

Since the July 22 audit: architecture modularization, live Legal/CA, digital/finance/ca roles, bank-statement recon, private screenshot storage, and partial finance soft-delete + user IDOR mitigations improved readiness.

With a focused 1–2 week hardening sprint (secrets, uploads, remaining soft-delete, rate limits, CORS), the system is suitable for **internal production**. Horizontal scale and public-internet exposure need further work (Redis realtime, ledger pagination, cookie auth).

**Estimated readiness: 65%.** Technical debt to clear P0/P1: roughly **2.5–4.5 engineer-weeks**.

***

## 14. Technical summary (developers)

* Stack: Express 5 modular MVC + Mongoose, React 19/Vite, Socket.IO, Electron shell, OpenAPI→Zod/Orval.
* Layout: `backend/src/modules/<domain>/{routes,controllers,services,schema}` — see `MODULES.md`.
* Auth: JWT bearer + refresh sessions; permission templates + role gates; project access helpers; roles include `finance`, `digital`, `ca`.
* Crypto: inventory/HRM AES-GCM (good); password history XOR (bad); JWT defaults (bad).
* Money: tax service soft-delete OK; unify helper across KPI/ledger/reports; bank statements in CA.
* Frontend: lazy routes good; FinanceFormModals and admin pages are SRP violations; no FE tests.
* Catalog of all 1,298 audited source files: `CMS_AUDIT_FILE_CATALOG.json`.
* Feature docs: `CODEBASE_ANALYSIS.txt` — this report is the **quality/security audit** overlay.

***

## Appendix A — Backend routes map

Mounted from `routes/index.js` (38 feature routers): health, auth, search, users, clients, companies, projects, logs, bugs, tasks, apk, comments, notifications, requests, analytics, reports, settings, uploads, tickets, nav-badges, alerts, warnings, inventory, presence, screenshots, monitoring, work-sessions, client-team, direct-conversations, permissions, hrm, sales, finance, marketing, **ca**, **legal**, project-documents, admin-media.

## Appendix B — Schema list

~92 entity files under `backend/src/modules/*/schema/` (finance ~14, hrm ~19, marketing ~13, sales ~15, ca ~7, legal ~3, work ~8, …) re-exported via `models/schema/index.js`.

## Appendix C — Test inventory

**64** backend unit tests under `backend/tests/unit/` including: `role-matrix-completeness`, `digital-rbac`, `digital-project-fields`, `finance-gst-perfect`, `expense-gst`, `vendor-invoice-gst`, `finance-unified-ledger`, `bank-statement-parse`, `legal-dashboard`, `users-idor-scope`, payroll/leave/sales suites. **0** frontend unit/e2e in-repo.

***

*End of audit report. Companion feature catalog: `CODEBASE_ANALYSIS.txt`. Regenerated catalog: `CMS_AUDIT_FILE_CATALOG.json` (2026-07-31).*
