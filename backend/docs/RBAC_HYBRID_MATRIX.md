# Hybrid RBAC Matrix

**Policy:** Organization-wide access only when required for the job. List/picker may return minimal metadata; detail / analytics / search / export / reports / notifications / files are always scoped. Backend is authoritative.

## Pipeline

```
Authentication → Permission check → Scope resolution → Query filtering → Sensitive field filtering → Response → Frontend render
```

## Role × resource (Picker / Full / Deny)

| Role | Companies | Projects | Users | Tickets | Requests | Analytics | Marketing | Finance | Screenshots |
|------|-----------|----------|-------|---------|----------|-----------|-----------|---------|-------------|
| `super_admin` | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| `hr` | Picker + directory | Membership full | Directory + sensitive | Via `admin_tickets` | Via `admin_requests` | Deny org admin/finance | Scoped (not unscoped) | Deny | Via `monitor_screenshots` |
| `finance` | Picker | Org **picker** only | Staff picker (minimal) | Project/self | Project/self | Deny delivery | Deny | Full module | Self only |
| `manager` | Via projects | Membership | Self + reports | Project/self | Project/self | Project-scoped | Deny | Deny | Self / monitor perm |
| `developer`/`tester`/`qa` | Via projects | Membership | Self + project peers | Project/self | Own / project | Project-scoped | Deny | Deny | Self |
| `freelancer` | Via projects | Membership | Self + peers | Project/self | Own | Project-scoped | Operational scoped | Freelancer finance view | Self |
| `bde` | Owned customers | Membership | Staff picker (minimal) | Project/self | Project/self | Deny org | Deny | Deny | Self |
| `digital` | Via digital projects | Digital membership | Digital + freelancer picker | Project/self | Project/self | Marketing only | Scoped digital | Deny | Self |
| `client` | Own company | Company projects | Self only | Own | Own | Client hub | Deny | Deny | Deny |

**Picker** = `{ id, name, status, … }` minimal metadata.\
**Full** = complete record / nested delivery data / sensitive fields where allowed.

## Query flags

| Flag | Effect |
|------|--------|
| `?picker=1` or `?fields=picker` on `GET /projects` | Minimal project rows |
| `?picker=1` on `GET /companies` | Minimal company rows |
| `GET /projects` as `finance` | Always picker-shaped (org-wide linker) |
| `GET /users?staff=1` | Staff picker; projection depends on role |

## Key modules

| Path | Role |
|------|------|
| [`services/access/access-context.js`](../src/services/access/access-context.js) | User profile ACL, staff picker, projections |
| [`services/access/list-scope.js`](../src/services/access/list-scope.js) | Project/company id scopes |
| [`services/access/company-access.js`](../src/services/access/company-access.js) | Detail access (incl. hr membership read) |
| [`services/ticket-support.js`](../src/services/ticket-support.js) | Ticket list/detail scope |
| [`middlewares/permission.js`](../src/middlewares/permission.js) | Module×action gates |
| Frontend [`RoleGate.tsx`](../../frontend/src/components/layout/RoleGate.tsx) | UI mirror; deny unmapped `/admin/*` |

## Migration notes

1. **Users:** Non-client staff can no longer `GET /users/:id` for arbitrary users — only self, hr/sa, manager→reports, or shared project membership.
2. **Staff picker:** Manager limited to self + direct reports. Finance/bde/delivery get picker projection (no email/phone).
3. **Tickets/requests:** finance/bde/digital no longer see org-wide lists; need `admin_tickets` / `admin_requests` or project scope.
4. **Analytics:** `GET /analytics/projects/:id` and `/analytics/bugs` enforce project access.
5. **Reports:** `POST /reports` requires project access (virtual log projects exempt).
6. **Presence:** Non hr/sa get peers/reports only, not full live map.
7. **Settings:** Non hr/sa get operational subset (branding + work policy + screenshots).
8. **Marketing:** `hr` is no longer unscoped in `getScopedDigitalUserAccess`; digital projects filtered by `type === "digital"`.
9. **Screenshots:** Org-wide list/delete requires `monitor_screenshots` permission (not bare `hr` role).
10. **Frontend:** Mapped `/admin/project-documents`, `/hrm/letters`; removed unconditional `dev_*` RoleGate bypass; unmapped `/admin/*` denied.

## Validation checklist

* \[ ] Backend unit tests: `list-scope-rbac`, `users-idor-scope`, `tickets-requests-scope`, `analytics-scope`
* \[ ] Finance expense create: project/company pickers still populate
* \[ ] HR employee create: company picker still works
* \[ ] Developer `GET /users/:otherId` → 403 (unless same project)
* \[ ] Client cannot list other companies
* \[ ] Finance/bde/digital tickets list not org-wide
* \[ ] Analytics project without membership → 403
* \[ ] Nav URLs unchanged; RoleGate redirects intact

## Risks

| Risk | Mitigation |
|------|------------|
| Assignee dropdowns miss email | Use `name` / `employeeId`; picker intentionally omits email |
| HR ticket workflow | `hr_admin` template includes `admin_tickets:view` |
| Digital on non-digital membership | Digital scope filters `type===digital`; freelancer uses membership |
| Screenshot delete for HR | Uses `monitor_screenshots:view` (hr\_admin has it) |
