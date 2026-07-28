/**
 * Strict parity with disambiguated path mapping (no basename collisions).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(backend, "..");

function gitLs(treePath) {
  try {
    return execSync(`git ls-tree -r --name-only HEAD -- ${treePath}`, {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function gitShow(file) {
  try {
    return execSync(`git show HEAD:${file}`, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20e6,
    });
  } catch {
    return null;
  }
}

function isShim(content) {
  return Boolean(
    content &&
      (content.includes("@deprecated Shim") ||
        (/^export\s+\*\s+from\s+["']\.\./m.test(content.trim()) &&
          content.length < 400)),
  );
}

function exportNames(content) {
  const names = new Set();
  if (!content) return names;
  for (const m of content.matchAll(
    /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_]+)/g,
  )) {
    names.add(m[1]);
  }
  for (const m of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const bit = part.trim();
      if (!bit || bit === "default") continue;
      const as = bit.match(/([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)/);
      if (as) names.add(as[2]);
      else {
        const id = bit.match(/^([A-Za-z0-9_]+)/);
        if (id) names.add(id[1]);
      }
    }
  }
  return names;
}

function hasSymbol(content, name) {
  if (!content) return false;
  if (exportNames(content).has(name)) return true;
  return (
    content.includes(`function ${name}`) ||
    content.includes(`async function ${name}`) ||
    content.includes(`const ${name} `) ||
    content.includes(`const ${name}=`) ||
    content.includes(`class ${name}`)
  );
}

function routeSignatures(content) {
  const set = new Set();
  if (!content) return set;
  for (const m of content.matchAll(
    /router\.(get|post|put|patch|delete|use)\(\s*[`'"]([^`'"]+)[`'"]/gi,
  )) {
    set.add(`${m[1].toLowerCase()} ${m[2]}`);
  }
  return set;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".js")) out.push(full);
  }
  return out;
}

/** Explicit old → new map for known renames / ambiguous basenames */
const EXPLICIT = new Map([
  [
    "backend/src/routes/finance.routes.js",
    "src/modules/finance/routes.js",
  ],
  ["backend/src/routes/hrm.routes.js", "src/modules/hrm/routes.js"],
  [
    "backend/src/routes/marketing.routes.js",
    "src/modules/marketing/routes.js",
  ],
  ["backend/src/routes/sales.routes.js", "src/modules/sales/routes.js"],
  [
    "backend/src/controllers/reports.controller.js",
    "src/modules/work/controllers/reports.controller.js",
  ],
  [
    "backend/src/controllers/tasks.controller.js",
    "src/modules/work/controllers/tasks.controller.js",
  ],
  [
    "backend/src/controllers/finance/reports.controller.js",
    "src/modules/finance/controllers/reports.controller.js",
  ],
  [
    "backend/src/controllers/marketing/tasks.controller.js",
    "src/modules/marketing/controllers/tasks.controller.js",
  ],
  [
    "backend/src/services/permissions.service.js",
    "src/modules/identity/services/permissions.service.js",
  ],
  [
    "backend/src/services/hrm/permissions.service.js",
    "src/modules/hrm/services/permissions.service.js",
  ],
  [
    "backend/src/models/schema/audit.js",
    "src/modules/platform/schema/audit.js",
  ],
  [
    "backend/src/models/schema/hrm/audit.js",
    "src/modules/hrm/schema/audit.js",
  ],
  [
    "backend/src/models/schema/reports.js",
    "src/modules/work/schema/reports.js",
  ],
  [
    "backend/src/models/schema/marketing/reports.js",
    "src/modules/marketing/schema/reports.js",
  ],
  [
    "backend/src/models/schema/tasks.js",
    "src/modules/work/schema/tasks.js",
  ],
  [
    "backend/src/models/schema/marketing/tasks.js",
    "src/modules/marketing/schema/tasks.js",
  ],
  [
    "backend/src/services/bugs/bug-workflow.js",
    "src/modules/work/services/bug-workflow.js",
  ],
]);

function inferModulePath(oldRel) {
  if (EXPLICIT.has(oldRel)) return EXPLICIT.get(oldRel);
  // backend/src/controllers/foo.controller.js
  // backend/src/controllers/finance/x.controller.js
  // backend/src/services/foo.js
  // backend/src/services/finance/foo.js
  // backend/src/routes/foo.routes.js
  // backend/src/models/schema/foo.js
  // backend/src/models/schema/finance/foo.js
  const rel = oldRel.replace(/^backend\/src\//, "");

  const domainFromNested = (kind, rest) => {
    // finance/x.js → modules/finance/kind/x.js
    const parts = rest.split("/");
    if (parts.length >= 2) {
      const domain = parts[0];
      const file = parts.slice(1).join("/");
      return `src/modules/${domain}/${kind}/${file}`;
    }
    return null;
  };

  if (rel.startsWith("controllers/")) {
    const rest = rel.slice("controllers/".length);
    const nested = domainFromNested("controllers", rest);
    if (nested) return nested;
    // flat controller — need domain map by filename heuristics below
  }
  if (rel.startsWith("services/")) {
    const rest = rel.slice("services/".length);
    if (rest.startsWith("access/")) {
      return `src/modules/access/services/${rest.slice("access/".length)}`;
    }
    if (rest.startsWith("jobs/")) {
      return `src/modules/jobs/services/${rest.slice("jobs/".length)}`;
    }
    if (rest.startsWith("alerts/")) {
      return `src/modules/alerts/services/${rest.slice("alerts/".length)}`;
    }
    if (rest.startsWith("inventory/")) {
      return `src/modules/inventory/services/${rest.slice("inventory/".length)}`;
    }
    if (rest.startsWith("project-documents/")) {
      return `src/modules/admin/services/${rest.slice("project-documents/".length)}`;
    }
    const nested = domainFromNested("services", rest);
    if (nested) return nested;
  }
  if (rel.startsWith("models/schema/")) {
    const rest = rel.slice("models/schema/".length);
    const nested = domainFromNested("schema", rest);
    if (nested) return nested;
  }
  if (rel.startsWith("routes/") && rel.endsWith(".routes.js")) {
    const name = path.basename(rel, ".routes.js");
    // try common domains
  }
  return null;
}

const DOMAIN_HINTS = {
  // filename → module
  "admin-media.controller.js": "admin",
  "admin-media.service.js": "admin",
  "project-documents.controller.js": "admin",
  "project-document-secrets.js": "admin",
  "renewal-reminder-job.js": "admin",
  "auth.controller.js": "identity",
  "users.controller.js": "identity",
  "permissions.controller.js": "identity",
  "client-team.controller.js": "identity",
  "client-team.js": "identity",
  "client-company-provision.js": "identity",
  "client-portal.js": "identity",
  "employeeId.js": "identity",
  "password-otp.js": "identity",
  "user-access.js": "identity",
  "users.js": "identity",
  "clients.controller.js": "crm",
  "companies.controller.js": "crm",
  "projects.controller.js": "crm",
  "search.controller.js": "crm",
  "analytics.controller.js": "crm",
  "clients.js": "crm",
  "projects.js": "crm",
  "tasks.controller.js": "work",
  "bugs.controller.js": "work",
  "logs.controller.js": "work",
  "apk.controller.js": "work",
  "requests.controller.js": "work",
  "reports.controller.js": "work",
  "tickets.controller.js": "work",
  "warnings.controller.js": "work",
  "apk-access.js": "work",
  "daily-log-compliance.js": "work",
  "daily-log-virtual-projects.js": "work",
  "report-purge-job.js": "work",
  "reporting.js": "work",
  "ticket-support.js": "work",
  "work-assignments.js": "work",
  "bug-workflow.js": "work",
  "tasks.js": "work",
  "bugs.js": "work",
  "logs.js": "work",
  "apk.js": "work",
  "requests.js": "work",
  "reports.js": "work",
  "tickets.js": "work",
  "warnings.js": "work",
  "comments.controller.js": "collab",
  "notifications.controller.js": "collab",
  "direct-conversations.controller.js": "collab",
  "comment-chat-resource.js": "collab",
  "comment-mentions.js": "collab",
  "comment-notification-recipients.js": "collab",
  "direct-conversation-migration.js": "collab",
  "direct-conversations.js": "collab",
  "discussion-previews.js": "collab",
  "discussion-project-access.js": "collab",
  "push-notifications.js": "collab",
  "comments.js": "collab",
  "notifications.js": "collab",
  "screenshots.controller.js": "monitoring",
  "presence.controller.js": "monitoring",
  "work-sessions.controller.js": "monitoring",
  "monitoring.controller.js": "monitoring",
  "screenshots.service.js": "monitoring",
  "presence.js": "monitoring",
  "work-sessions.service.js": "monitoring",
  "monitoring.service.js": "monitoring",
  "monitoring-analytics.service.js": "monitoring",
  "screenshot-purge-job.js": "monitoring",
  "shift-end-clockout.service.js": "monitoring",
  "work-session-notifications.js": "monitoring",
  "work-session-policy.js": "monitoring",
  "work-session-sync.js": "monitoring",
  "EmployeeScreenshot.js": "monitoring",
  "MonitoringConsent.js": "monitoring",
  "WorkSession.js": "monitoring",
  "alerts.controller.js": "alerts",
  "alert-scheduler-job.js": "alerts",
  "alerts.js": "alerts",
  "alert-deliveries.js": "alerts",
  "settings.controller.js": "settings",
  "company-settings.js": "settings",
  "settings.js": "settings",
  "uploads.controller.js": "uploads",
  "health.controller.js": "platform",
  "workspace-dashboard.js": "platform",
  "dashboard-activity.js": "platform",
  "audit.js": "platform",
  "counter.js": "platform",
  "job-runs.js": "jobs",
  "withJobLock.js": "jobs",
  "hrm.controller.js": "hrm",
};

function resolveNewPath(oldRel) {
  const explicit = inferModulePath(oldRel);
  if (explicit && fs.existsSync(path.join(backend, explicit))) return explicit;

  const base = path.basename(oldRel);
  const domain = DOMAIN_HINTS[base];
  const rel = oldRel.replace(/^backend\/src\//, "");

  let kind = "services";
  if (rel.includes("/controllers/") || rel.startsWith("controllers/")) kind = "controllers";
  else if (rel.includes("/routes/") || rel.startsWith("routes/")) kind = "routes";
  else if (rel.includes("models/schema")) kind = "schema";

  if (domain) {
    let file = base;
    if (kind === "routes" && base.endsWith(".routes.js")) {
      const candidate = `src/modules/${domain}/routes/${base}`;
      if (fs.existsSync(path.join(backend, candidate))) return candidate;
    }
    const candidate = `src/modules/${domain}/${kind}/${file}`;
    if (fs.existsSync(path.join(backend, candidate))) return candidate;
  }

  // nested already handled; last resort: search modules for unique basename under correct kind
  const all = walk(path.join(backend, "src/modules")).filter((f) =>
    f.replaceAll("\\", "/").includes(`/${kind}/`) && path.basename(f) === base,
  );
  if (all.length === 1) {
    return path.relative(backend, all[0]).replaceAll("\\", "/");
  }
  if (all.length > 1 && domain) {
    const hit = all.find((f) => f.replaceAll("\\", "/").includes(`/modules/${domain}/`));
    if (hit) return path.relative(backend, hit).replaceAll("\\", "/");
  }
  return null;
}

const areas = [
  "backend/src/controllers",
  "backend/src/services",
  "backend/src/routes",
  "backend/src/models/schema",
];

const missingFiles = [];
const exportGaps = [];
const routeGaps = [];
const matched = [];
let realOld = 0;
let shims = 0;

for (const area of areas) {
  for (const oldRel of gitLs(area)) {
    if (!oldRel.endsWith(".js")) continue;
    if (oldRel.endsWith("routes/index.js")) continue;
    if (oldRel.endsWith("models/schema/index.js")) continue;
    const oldContent = gitShow(oldRel);
    if (!oldContent) continue;
    if (isShim(oldContent)) {
      shims += 1;
      continue;
    }
    realOld += 1;
    const neuRel = resolveNewPath(oldRel);
    if (!neuRel || !fs.existsSync(path.join(backend, neuRel))) {
      missingFiles.push(oldRel);
      continue;
    }
    const newContent = fs.readFileSync(path.join(backend, neuRel), "utf8");
    matched.push({ old: oldRel, neu: neuRel });
    const missingExports = [...exportNames(oldContent)].filter(
      (n) => !hasSymbol(newContent, n),
    );
    if (missingExports.length) {
      exportGaps.push({ old: oldRel, neu: neuRel, missingExports });
    }
    if (oldRel.includes("/routes/") || oldRel.endsWith("routes.js")) {
      const oldRoutes = [...routeSignatures(oldContent)];
      const newRoutes = routeSignatures(newContent);
      const missingRoutes = oldRoutes.filter((r) => !newRoutes.has(r));
      if (missingRoutes.length) {
        routeGaps.push({ old: oldRel, neu: neuRel, missingRoutes });
      }
    }
  }
}

const oldIndex = gitShow("backend/index.js") || "";
const newIndex = fs.readFileSync(path.join(backend, "index.js"), "utf8");
const startRe =
  /\b(start[A-Za-z0-9_]+|migrateDirectConversationIndexes|ensureDefaultRoleTemplates|backfillSystemTemplatePermissions|assignRoleTemplatesToUsers|seedLeaveTypes)\b/g;
const oldStarts = new Set([...oldIndex.matchAll(startRe)].map((m) => m[1]));
const newStarts = new Set([...newIndex.matchAll(startRe)].map((m) => m[1]));

const oldRoutesIndex = gitShow("backend/src/routes/index.js") || "";
const newRoutesIndex = fs.readFileSync(
  path.join(backend, "src/routes/index.js"),
  "utf8",
);
const oldMounts = [
  ...oldRoutesIndex.matchAll(/import\s+(\w+Routes)\s+from/g),
].map((m) => m[1]);
const newMounts = [
  ...newRoutesIndex.matchAll(/import\s+(\w+Routes)\s+from/g),
].map((m) => m[1]);

const report = {
  realOldFilesCompared: realOld,
  matched: matched.length,
  shimsSkippedAtHead: shims,
  missingFiles,
  exportGaps,
  routeGaps,
  missingJobStarters: [...oldStarts].filter((s) => !newStarts.has(s)),
  missingRouteMounts: oldMounts.filter((m) => !newMounts.includes(m)),
  addedRouteMounts: newMounts.filter((m) => !oldMounts.includes(m)),
};

fs.writeFileSync(
  path.join(backend, "scripts/.parity-strict.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
