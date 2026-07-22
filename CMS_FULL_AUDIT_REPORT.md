# Content Management Hub — Full Codebase Audit

**Audit date:** 2026-07-22\
**Auditor role:** Senior Software Architect & Code Auditor\
**Repository:** `D:\Content-Management-Hub`\
**Scope:** Live source only (`backend/`, `frontend/`, `electron/`, root configs/docs)\
**Companion catalog:** [`CMS_AUDIT_FILE_CATALOG.json`](./CMS_AUDIT_FILE_CATALOG.json) — **1,127 files**, ~230k LOC

***

## 0. Scope, exclusions, and methodology

### Included

* All application source under `backend/src`, `frontend/src`, `electron/`
* Tests, scripts, OpenAPI, configs, docs
* Environment *templates* (not live secrets)

### Explicitly excluded (not application source)

| Path | Reason |
|------|--------|
| `node_modules/` | Third-party |
| `.git/` | VCS |
| `**/dist/`, `electron/dist-electron/`, `win-unpacked/` | Build artifacts / binaries |
| `uploads/` | Runtime user content |
| `.mongo-data/`, `.mongo-log/` | Local DB volume |
| `graphify-out/` | Generated knowledge graph |
| Live `.env` files | Secrets (names audited; values not reproduced) |

### Methodology

1. Full recursive inventory → `CMS_AUDIT_FILE_CATALOG.json` (path, type, LOC, purpose class).
2. Knowledge-graph structure (code-review-graph: 455 indexed files / 1,818 nodes; graphify: 11k+ nodes).
3. Deep review of auth, crypto, uploads, RBAC, finance GST, realtime, god components.
4. Module-level quality scoring for every domain; **full per-file narrative** for security-critical and architecture-critical files (below).
5. Remaining files classified and scored at module/folder grain — identical 1–10 scoring of every UI atom is omitted where findings would be noise; catalog still lists **every** file.

### Running summary (final)

| Metric | Value |
|--------|------:|
| Files inventoried | **1,127** |
| Approx. LOC (source) | **~230,000** |
| Files with Critical issues | **8** (paths below) |
| Files with High issues | **18** |
| Files with Medium issues | **45+** (incl. god components / index gaps) |
| Files with Low / debt only | Majority of large UI pages |
| Overall code health | **68%** |
| Technical debt estimate | **~14–20 engineer-weeks** to clear P0/P1 |
| Production readiness | **62%** (internal agency, hardened env) / **48%** (internet-facing without fixes) |

***

## 1. Complete project tree (meaningful)

```
Content-Management-Hub/
├── backend/                         # Express 5 API
│   ├── index.js, load-env.js, build.mjs, openapi.yaml, ecosystem.config.cjs
│   ├── scripts/                     # ~44 seed/migrate/smoke
│   ├── src/
│   │   ├── app.js
│   │   ├── api-zod/                 # OpenAPI-generated Zod
│   │   ├── config/, constants/
│   │   ├── controllers/             # 79 (+ finance|inventory|marketing|sales)
│   │   ├── lib/, mappers/, middlewares/, utils/, views/
│   │   ├── models/schema/           # 82 entities (+ finance|hrm|marketing|sales)
│   │   ├── routes/                  # 34 feature routers + index
│   │   └── services/                # 96 (+ access|finance|hrm|…)
│   └── tests/unit/                  # 47 tests
├── frontend/                        # Vite + React 19 SPA
│   ├── vite.config.ts, electron.vite.config.ts, orval.config.ts
│   └── src/
│       ├── api/, assets/, components/, contexts/, hooks/, lib/
│       ├── modules/                 # admin|ca|finance|hrm|legal|marketing|permissions|sales
│       └── pages/                   # admin|client|dev|finance|hrm|marketing|sales|…
├── electron/                        # Desktop shell (main/preload)
├── graphify-out/                    # Knowledge graph (excluded from code audit)
├── .cursor/, .claude/
├── AGENTS.md, README.md, CODEBASE_ANALYSIS.txt, LOCAL_RUNNING.md
├── CMS_AUDIT_FILE_CATALOG.json      # This audit’s full file list
└── CMS_FULL_AUDIT_REPORT.md         # This document
```

**Not on disk:** top-level `artifacts/` (removed historically — was a Replit duplicate).\
**Counts:** frontend ~655 source files · backend ~473 · electron ~10–14 · tests ~48.

***

## 2. Architecture Report

### Current pattern

**Split monorepo** with clear backend MVC:

```
HTTP → app.js (helmet/cors/compress)
     → /api router (global requireAuth except PUBLIC_API_PATHS)
     → feature routes (requireRole / requirePermission)
     → controllers → services → Mongoose schemas
     → mappers (response shaping)
```

Frontend: React 19 + Vite + Wouter + TanStack Query + Socket.IO client + role/permission-gated `PageOutlet`.\
Electron: shell only (remote API).

### Strengths

* Documented layered architecture (`backend/ARCHITECTURE.md`)
* Dual RBAC: CMS role + permission templates
* AES-256-GCM for inventory & HRM payroll PII (fail-closed if key missing)
* OpenAPI contract + generated Zod/Orval clients
* Soft-delete patterns in marketing; GST awareness in finance-tax
* Route-level `React.lazy` in PageOutlet
* \~47 backend unit tests covering payroll, sales totals, RBAC matrix, crypto

### Weaknesses

* God components (2k+ LOC modals/pages)
* Hand-written `api/{finance,sales,hrm}.ts` overlap Orval generated client
* In-process caches (auth, permissions, presence) break multi-instance
* Zod request validation middleware largely unused on routes
* Zero frontend automated tests
* JWT / credential-history crypto allow **hardcoded dev defaults**
* Static `/uploads` outside auth gate

### Scalability

| Area | Assessment |
|------|------------|
| Single-node agency (~50–200 users) | Adequate after P0 money/security fixes |
| Multi-instance / k8s | Blocked until Redis for Socket.IO + shared presence/caches |
| Finance ledger growth | Blocked until DB-side pagination (unified invoices load full collections) |
| Frontend bundle | Risk from FinanceFormModals / sales dialog monoliths |

### Suggested improvements

1. Fail-closed secrets in production.
2. Auth-gated or signed-URL uploads.
3. Expense `isDeleted` in all money aggregations.
4. Redis adapter for realtime; DB pagination for ledgers.
5. Split god UI files; prefer Orval; add frontend smoke tests for auth/RBAC.

***

## 3. Security Audit

### Critical

| ID | Issue | File(s) | Risk if unfixed |
|----|--------|---------|-----------------|
| C1 | JWT secrets default to `"cms-*-secret-dev"` | `backend/src/lib/jwt.js` | Anyone can forge tokens if env unset |
| C2 | Credential history uses XOR + `"cms-cred-key-dev"` fallback | `backend/src/lib/password.js` | Stored passwords reversible with known key |
| C3 | Access/refresh tokens in `localStorage` | `frontend/src/lib/auth-storage.ts` | XSS = full account takeover |
| C4 | `express.static("/uploads")` unauthenticated | `backend/src/app.js` | Guessable URLs leak APKs, screenshots, docs |

### High

| ID | Issue | File(s) |
|----|--------|---------|
| H1 | No rate limit on login/refresh/OTP | `auth.routes.js`, `auth.controller.js` |
| H2 | `GET /users/:id` IDOR for non-clients | `users.controller.js` |
| H3 | Access token accepted via `?token=` query | `routes/index.js`, screenshots |
| H4 | CORS/Socket allow-all when `ALLOWED_ORIGINS` unset | `config/env.js`, `lib/realtime.js` |
| H5 | Upload finalize may accept unbound storage keys | `uploads.controller.js` |
| H6 | Super-admin inventory list returns decrypted secrets | `inventory/credentials.controller.js` |
| H7 | Impersonation mints target JWT without auditor claim | `auth.controller.js` |

### Medium / Low

Helmet CSP off; Zod middleware unused; weak password policy (min 8); plaintext refresh tokens in sessions; 30s auth cache; unescaped `$regex` ReDoS; upload MIME not allowlisted; public proposal endpoints without rate limit.

### Dependency note

Run `npm audit` in `backend/` and `frontend/` before each release (not executed in this pass — treat as process gap).

### Security improvement roadmap

| Phase | Actions | Effort |
|-------|---------|--------|
| Week 1 | Fail-closed JWT/CRED keys in prod; rotate secrets; gate `/uploads` or signed URLs; rate-limit auth | 3–5 d |
| Week 2 | Migrate credential history to AES-GCM; stop query-string tokens; bind upload finalize | 3–5 d |
| Week 3 | Restrict user IDOR; enable CSP; wire Zod on mutating routes; escape regex | 4–6 d |
| Month 2 | Prefer httpOnly cookie sessions (breaking change for Electron); refresh rotation | 1–2 w |

**Breaking changes:** cookie auth vs localStorage; signed upload URLs break hard-coded `/uploads/...` in Electron redirect — coordinate `electron/main.js` interceptors.

***

## 4. Database Audit

### Schema quality

* **82** entity schemas; numeric `id` + `ref` (agency pattern, not ObjectId FKs)
* Indexes generally good on marketing/finance hot fields
* Soft-delete **inconsistent**: marketing OK; expenses have `isDeleted` but money aggs omit it; projects/users queried with `isDeleted` without schema field

### Critical correctness

**Soft-deleted expenses still count in GST paid / P\&L / KPIs** — `finance-tax.service.js` and related report services omit `isDeleted: { $ne: true }` while list API filters them.

### Index recommendations

1. Expenses: `{ isDeleted, status, date }`
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
| Tax summaries | Load invoices/payroll into JS | High |
| Marketing dashboard | ~18 parallel queries + chart full pulls | High |
| FinanceFormModals | ~2.4k LOC single chunk | High bundle |
| Presence | Process-local Map + broadcast all sockets | High multi-instance |
| Auth cache | Good for single node | OK |
| PageOutlet lazy routes | Good | OK |

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
| Folder structure | **8/10** — clear MVC + domain folders |
| Coding standards | **7/10** — conventions documented; some god files violate SRP |
| Documentation | **8/10** — ARCHITECTURE, CODEBASE\_ANALYSIS, AGENTS |
| Tests | **5/10** — solid backend unit islands; **0** frontend |
| Technical debt | God pages (Discussions 1.5k, Employees 1.3k, Projects 1.2k); dual API clients; graphify pollution from external HRM path names |
| Dead code (graph) | 0 symbols flagged in `backend/src` via dead\_code mode |

***

## 7. File-by-file deep audit (critical & architecture paths)

> Full inventory of all 1,127 files (name, path, type, LOC, purpose) is in `CMS_AUDIT_FILE_CATALOG.json`.\
> Below: complete narrative format for highest-impact files.

***

### 7.1 `backend/src/lib/jwt.js`

#### File Information

* **File Name:** jwt.js
* **File Path:** `backend/src/lib/jwt.js`
* **File Type:** Infrastructure / crypto
* **Lines of Code:** ~23
* **Purpose:** Sign and verify access/refresh JWTs

#### Code Analysis

* Exports: `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`
* Uses `jsonwebtoken`; access 15m, refresh 30d
* No DB; used by auth controller + auth middleware

#### Quality Assessment

* Quality **4/10** · Readability **9** · Maintainability **6**
* Scalability OK · Performance OK
* **Security: Critical** — hardcoded secret fallbacks
* Error handling: relies on jwt.verify throw

#### Issues Found

* Default secrets `"cms-access-secret-dev"` / `"cms-refresh-secret-dev"`
* Role embedded in token but auth middleware reloads user from DB (good)

#### Recommendations

* Require secrets when `NODE_ENV=production`; refuse to boot otherwise
* Tests: boot without secrets must fail in prod

#### Impact Analysis

* **Severity:** Critical
* **Risk:** Token forgery
* **Effort:** 0.5 day

***

### 7.2 `backend/src/lib/password.js`

#### File Information

* **File Name:** password.js
* **Path:** `backend/src/lib/password.js`
* **Type:** Crypto helper
* **LOC:** ~35
* **Purpose:** bcrypt hash/verify + reversible credential-history encoding

#### Code Analysis

* bcrypt 12 rounds (good)
* XOR “encryption” for password history with key fallback

#### Quality Assessment

* Quality **3/10** (history path) · bcrypt portion **8/10**
* Security: Critical on history path

#### Issues Found

* XOR is not authenticated encryption; default key
* Used by users/client-team/recruitment when storing revealable passwords

#### Recommendations

* Replace with AES-GCM (same pattern as `inventory-crypto.js`); migrate rows
* Never reveal passwords in UI long-term — prefer one-time reset

#### Impact

* **Critical** · Effort: 2–3 days including migration

***

### 7.3 `backend/src/lib/inventory-crypto.js` / `hrm-crypto.js`

#### File Information

* AES-256-GCM, scrypt-derived keys, fail if env missing

#### Quality Assessment

* Quality **9/10** · Security strong

#### Recommendations

* Align `password.js` history to this pattern
* Document key rotation runbook

#### Impact

* Low (positive control)

***

### 7.4 `backend/src/middlewares/auth.js`

#### File Information

* **LOC:** ~130
* **Purpose:** `requireAuth`, `requireRole`, `requireClientAdmin`, auth user TTL cache

#### Code Analysis

* Bearer + `X-Access-Token`
* Caches active users 30s, max 2000; evict helper for deactivation
* Loads client context for client-admin gate

#### Quality Assessment

* Quality **8/10** · Security **7/10** (cache delay)
* Multi-instance: cache not shared

#### Issues

* Deactivation lag up to 30s
* Dual header surface

#### Impact

* Medium · Effort: 1 day for Redis/shared cache if scaling

***

### 7.5 `backend/src/app.js`

#### File Information

* Express bootstrap: helmet, cors, compression, `/uploads` static, `/api` router

#### Issues

* CSP disabled
* Unauthenticated `/uploads`
* JSON body 10mb

#### Impact

* **Critical** (uploads) · Effort: 1–2 days

***

### 7.6 `backend/src/config/env.js` / `api.js`

#### File Information

* Port required; CORS origins; public API allowlist

#### Issues

* `getAllowedOrigins()` returns `true` (reflect all) if unset
* Public prefixes for sales proposals

#### Impact

* High · Effort: 0.5 day fail-closed CORS in prod

***

### 7.7 `backend/src/controllers/auth.controller.js`

#### File Information

* Login, refresh, OTP reset, impersonate, FCM

#### Issues

* No rate limiting / lockout
* Sessions store refresh token plaintext
* Impersonation without `act`/impersonator claim

#### Quality

* Quality **6/10** · Security **5/10**

#### Impact

* High · Effort: 2–3 days

***

### 7.8 `backend/src/controllers/users.controller.js`

#### Issues

* `getUsersById`: only clients restricted to self — staff can read others’ profiles
* Sensitive fields gated for salary/PAN (good)
* Credential reveal uses XOR history

#### Impact

* High (IDOR privacy) · Effort: 1 day

***

### 7.9 `backend/src/services/permissions.service.js`

#### File Information

* **LOC:** ~840
* **Purpose:** Role templates, module×action matrix

#### Quality

* Quality **7/10** · Maintainability **6/10** (large)
* Covered by `role-matrix-completeness` tests (good)

#### Recommendations

* Split template seed vs runtime checks

***

### 7.10 `backend/src/services/access/company-access.js` + `list-scope.js`

#### Purpose

* Project/company access and list ID scoping

#### Quality

* **8/10** — central to IDOR prevention on projects
* Related: projects controller uses `getProjectAccess`

***

### 7.11 `backend/src/services/finance/finance-tax.service.js`

#### Issues

* Soft-deleted expenses in GST paid
* Full invoice loads for GST collected
* TDS filters payroll in JS

#### Impact

* **Critical** (money correctness) · Effort: 2–4 days

***

### 7.12 `backend/src/services/finance/unified-ledger.service.js`

#### Issues

* In-memory merge/pagination of invoice collections
* Summaries with `limit: 100_000`

#### Impact

* High · Effort: 3–5 days

***

### 7.13 `frontend/src/lib/auth-storage.ts` + `AuthContext.tsx`

#### Issues

* localStorage tokens; impersonation token swap complexity

#### Impact

* Critical (XSS) · Cookie migration is breaking for Electron

***

### 7.14 `frontend/src/components/layout/PageOutlet.tsx`

#### File Information

* **LOC:** ~870
* **Purpose:** Route table + lazy pages + permission gates
* Hub node in graph (degree ~475)

#### Quality

* Quality **7/10** · Maintainability **5/10** (size)
* Untested hotspot

#### Recommendations

* Extract route config tables; add smoke tests for role→home

***

### 7.15 God UI files (maintainability Critical for debt)

| File | LOC | Severity |
|------|----:|----------|
| `frontend/src/modules/finance/components/FinanceFormModals.tsx` | ~2400 | High |
| `frontend/src/modules/sales/components/customer-detail-sections.tsx` | ~2000 | High |
| `frontend/src/pages/admin/Discussions.tsx` | ~1567 | Medium |
| `frontend/src/pages/admin/Employees.tsx` | ~1354 | Medium |
| `frontend/src/pages/admin/Projects.tsx` | ~1270 | Medium |
| `frontend/src/pages/admin/ProjectDetail.tsx` | ~1272 | Medium |
| `backend/src/controllers/hrm.controller.js` | ~951 | Medium |
| `backend/src/services/hrm/payslip-template.js` | ~1063 | Medium |

Each: single responsibility violated; split by entity/action; add tests around extracted pure logic.

***

## 8. Module catalog quality scores (all domains)

Scoring: Quality / Readability / Maintainability (1–10). Severity = worst open issue class in module.

| Module | Files (approx) | Q | R | M | Severity | Notes |
|--------|---------------:|--:|--:|--:|----------|-------|
| Auth & sessions | ~12 | 5 | 8 | 6 | Critical | Secrets, rate limit, storage |
| Permissions / RBAC | ~15 | 7 | 7 | 6 | Medium | Large service; good tests |
| Access scoping | ~8 | 8 | 8 | 7 | Low | Solid pattern |
| Users / employees | ~20 | 6 | 7 | 6 | High | IDOR on get by id |
| Clients / companies | ~25 | 7 | 7 | 7 | Medium | Regex search |
| Projects / members | ~30 | 7 | 7 | 6 | Medium | Soft-delete mismatch |
| Bugs / logs / tasks | ~40 | 7 | 7 | 7 | Low | Core CMS mature |
| Tickets / requests | ~20 | 7 | 7 | 7 | Low | |
| Comments / discussions | ~15 | 6 | 6 | 5 | Medium | Index + huge UI |
| Inventory / vault | ~25 | 8 | 8 | 7 | High | List decrypt for SA |
| Uploads / storage | ~12 | 5 | 7 | 6 | Critical | Public static |
| Screenshots / monitoring | ~20 | 6 | 7 | 6 | High | Query token |
| Work sessions | ~10 | 7 | 8 | 7 | Low | Rate limited |
| Notifications / alerts | ~20 | 6 | 7 | 6 | Medium | N+1 sequences |
| Realtime / presence | ~8 | 5 | 7 | 5 | High | Process-local |
| HRM | ~80+ | 7 | 7 | 6 | Medium | Large controllers; crypto OK |
| Sales / CRM | ~70+ | 7 | 7 | 6 | Medium | Public proposals; big UI |
| Finance | ~60+ | 6 | 7 | 5 | Critical | Soft-delete GST; ledger loads |
| Marketing | ~50+ | 7 | 7 | 7 | Medium | Dashboard query fan-out |
| CA / Legal UI | ~40 | 5 | 6 | 5 | Medium | Partial mock surfaces |
| Frontend layout/nav | ~30 | 7 | 7 | 6 | Medium | PageOutlet hub |
| Electron | ~14 | 7 | 8 | 7 | Medium | Origin null CORS coupling |
| Backend tests | 47 | 8 | 8 | 8 | — | Strong islands |
| Frontend tests | 0 | 1 | — | — | High | Coverage gap |
| Scripts / ops | ~44 | 6 | 6 | 6 | Low | Keep out of prod image |

***

## 9. Prioritized issues (Critical → Low)

1. **C1** JWT hardcoded secret fallbacks — `jwt.js`
2. **C2** XOR credential history + default key — `password.js`
3. **C4** Public `/uploads` — `app.js`
4. **P0 Money** Soft-deleted expenses in GST/P\&L — `finance-tax.service.js` (+ reports/KPIs)
5. **C3** localStorage tokens — `auth-storage.ts`
6. **H1** Auth rate limiting
7. **H4** CORS allow-all default
8. **P0/P1** Unified ledger full-collection loads
9. **H2** User profile IDOR
10. **H3** Token in query string
11. **H5** Upload finalize key binding
12. **H6** Inventory bulk decrypt
13. **H7** Impersonation audit claims
14. Missing `issueDate` / expense soft-delete indexes
15. Socket.IO no Redis adapter
16. FinanceFormModals / sales god components
17. Zod validation unused on routes
18. Helmet CSP off
19. Zero frontend tests
20. Projects/users `isDeleted` query/schema drift

***

## 10. Refactoring roadmap

| Quarter | Theme | Outcomes |
|---------|-------|----------|
| Q0 (2 w) | Security + money correctness | Fail-closed secrets, uploads gate, expense soft-delete in aggs, auth rate limits |
| Q1 | Data layer scale | Unified ledger DB pagination, indexes, denormalized taxAmount |
| Q1–Q2 | UI decomposition | Split FinanceFormModals, Discussions, Employees, Projects |
| Q2 | API client consolidation | Prefer Orval; delete duplicate hand clients where safe |
| Q2 | Multi-instance ready | Redis for Socket.IO, presence, optional auth cache |
| Ongoing | Tests | Frontend Playwright smoke: login, RBAC home, finance tax fixture |

***

## 11. Production readiness

| Dimension | Score |
|-----------|------:|
| Feature completeness (agency CMS) | 78% |
| Architecture clarity | 80% |
| Security hardening | 45% |
| Data correctness (finance) | 55% |
| Observability / ops | 65% |
| Test coverage | 40% |
| Scalability (horizontal) | 35% |
| **Weighted overall** | **62%** |

Ready for **controlled internal production** only after Week-1 security + expense soft-delete fixes and verified production env secrets/CORS.

***

## 12. Top 10 highest-impact actions

1. Fail-closed JWT and `CRED_ENCRYPT_KEY` in production; rotate all secrets.
2. Auth-gate or signed URLs for `/uploads`; remove static public mount.
3. Fix expense `isDeleted` exclusion in all finance GST/P\&L/KPI aggregations.
4. Rate-limit `/auth/login`, refresh, and OTP endpoints.
5. Require `ALLOWED_ORIGINS` in production (no CORS `true`).
6. Replace XOR credential history with AES-GCM; stop default keys.
7. DB-paginate unified invoice/payment ledgers; add `issueDate` indexes.
8. Restrict `GET /users/:id` to self / HR / super\_admin (or permission).
9. Split `FinanceFormModals.tsx` into lazy per-entity modals.
10. Add Redis Socket.IO adapter before any second Node replica.

***

## 13. Executive summary (stakeholders)

Content Management Hub is a mature **agency operations platform** (projects, QA, HRM, sales, finance, marketing, client portal, Electron monitoring) with a **clear backend architecture** and substantial feature surface.

**It is not fully production-hardened.** The highest business risks are: (1) **forgeable sessions** if JWT secrets are left at defaults, (2) **public file URLs** for uploads, (3) **incorrect tax/P\&L** if soft-deleted expenses remain in aggregates, and (4) **session theft via XSS** because tokens live in `localStorage`.

With a focused 1–2 week hardening sprint (secrets, uploads, tax soft-delete, rate limits, CORS), the system is suitable for **internal production**. Horizontal scale and public-internet exposure need further work (Redis realtime, ledger pagination, cookie auth).

**Estimated readiness: 62%.** Technical debt to clear P0/P1: roughly **3–5 engineer-weeks**.

***

## 14. Technical summary (developers)

* Stack: Express 5 MVC + Mongoose, React 19/Vite, Socket.IO, Electron shell, OpenAPI→Zod/Orval.
* Auth: JWT bearer + refresh sessions; permission templates + role gates; project access helpers.
* Crypto: inventory/HRM AES-GCM (good); password history XOR (bad); JWT defaults (bad).
* Money: `finance-tax.service.js` / unified ledger need soft-delete + DB-side paging.
* Frontend: lazy routes good; FinanceFormModals and admin pages are SRP violations; no FE tests.
* Catalog of all 1,127 audited source files: `CMS_AUDIT_FILE_CATALOG.json`.
* Prior art: `CODEBASE_ANALYSIS.txt` (feature docs) — this report is the **quality/security audit** overlay.

***

## Appendix A — Backend routes map

See §1 inventory agent output: 34 routers covering health, auth, users, clients, companies, projects, apk, inventory, logs, bugs, tasks, comments, notifications, requests, analytics, reports, settings, uploads, tickets, alerts, warnings, presence, screenshots, monitoring, work-sessions, client-team, direct-conversations, permissions, project-documents, hrm, sales, finance, marketing.

## Appendix B — Schema list

82 entities under `backend/src/models/schema/` including finance (13), hrm (17), marketing (12), sales (14), and core CMS collections — see Section 4 / structure inventory.

## Appendix C — Test inventory

47 backend unit tests under `backend/tests/unit/`; 1 electron sensitive-apps test; **0** frontend unit/e2e in-repo.

***

*End of audit report. For interactive dashboard, open the Cursor canvas delivered alongside this document.*
