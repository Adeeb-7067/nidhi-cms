import mongoose from "mongoose";
import * as schema from "@/models/schema";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Connecting to database...");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Seeding additional data...");

  const { getNextSequence } = schema;

  // ── Extra Developers ───────────────────────────────────────────────────────
  const extraDevs = [
    { name: "Frank Wilson", email: "frank@agency.com", designation: "Full Stack Developer", subType: "Fullstack" },
    { name: "Grace Kim",   email: "grace@agency.com",  designation: "UI/UX Designer",       subType: "Design" },
    { name: "Henry Patel", email: "henry@agency.com",  designation: "DevOps Engineer",       subType: "DevOps" },
    { name: "Iris Chen",   email: "iris@agency.com",   designation: "Data Analyst",          subType: "Analytics" },
  ];

  const devHash = await bcrypt.hash("Dev@123", 12);

  for (const dev of extraDevs) {
    const existing = await schema.usersTable.findOne({ email: dev.email });
    if (!existing) {
      const devCounter = await getNextSequence("employee_id_counter");
      const prefix = dev.name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2).padEnd(2, "X");
      const employeeId = `${prefix}${String(devCounter).padStart(3, "0")}`;
      
      const userId = await getNextSequence("users");
      await schema.usersTable.create({
        id: userId,
        ...dev,
        passwordHash: devHash,
        role: "developer",
        employeeId,
        status: "active"
      });
      console.log(`Created dev: ${dev.email} (${employeeId})`);
    }
  }

  // ── Extra Client Users + Companies ─────────────────────────────────────────
  const clientHash = await bcrypt.hash("Client@123", 12);
  const newClientDefs = [
    { userEmail: "sarah@techcorp.com", userName: "Sarah Mitchell", company: "TechCorp Solutions", contactPerson: "Sarah Mitchell", companyEmail: "contact@techcorp.com", phone: "+1-555-0201", address: "456 Innovation Blvd, San Francisco, CA" },
    { userEmail: "james@healthflow.com", userName: "James Reynolds", company: "HealthFlow Medical", contactPerson: "James Reynolds", companyEmail: "info@healthflow.com", phone: "+1-555-0302", address: "789 Wellness Way, Boston, MA" },
    { userEmail: "emily@retailmax.com", userName: "Emily Carter", company: "RetailMax", contactPerson: "Emily Carter", companyEmail: "ops@retailmax.com", phone: "+1-555-0403", address: "321 Commerce Dr, Chicago, IL" },
    { userEmail: "david@edutech.com", userName: "David Zhao", company: "EduTech Academy", contactPerson: "David Zhao", companyEmail: "admin@edutech.com", phone: "+1-555-0504", address: "654 Learning Lane, Austin, TX" },
  ];

  const clientIdMap: Record<string, number> = {};

  for (const cd of newClientDefs) {
    let userId: number;
    const existingUser = await schema.usersTable.findOne({ email: cd.userEmail });
    if (!existingUser) {
      const nextUserId = await getNextSequence("users");
      const u = await schema.usersTable.create({
        id: nextUserId,
        name: cd.userName,
        email: cd.userEmail,
        passwordHash: clientHash,
        role: "client",
        status: "active",
        designation: "CEO"
      });
      userId = u.id;
    } else {
      userId = existingUser.id;
    }

    const existingCompany = await schema.clientsTable.findOne({ email: cd.companyEmail });
    if (!existingCompany) {
      const nextClientId = await getNextSequence("clients");
      const c = await schema.clientsTable.create({
        id: nextClientId,
        companyName: cd.company,
        contactPerson: cd.contactPerson,
        email: cd.companyEmail,
        phone: cd.phone,
        address: cd.address,
        status: "active",
        portalLogin: true,
        userId
      });
      clientIdMap[cd.company] = c.id;
      console.log(`Created client: ${cd.company}`);
    } else {
      clientIdMap[cd.company] = existingCompany.id;
    }
  }

  // Get existing client (Acme Corp)
  const acme = await schema.clientsTable.findOne({ email: "contact@acmecorp.com" });
  if (acme) clientIdMap["Acme Corp"] = acme.id;

  const admin = await schema.usersTable.findOne({ email: "admin@agency.com" });
  const eva = await schema.usersTable.findOne({ email: "eva@agency.com" });

  if (!admin) {
    console.error("Admin user not found – run seed.ts first");
    process.exit(1);
  }

  // ── Additional Projects ────────────────────────────────────────────────────
  const projectDefs = [
    {
      name: "CRM Dashboard",
      clientKey: "TechCorp Solutions",
      description: "Enterprise CRM with Salesforce integration, lead management, pipeline views, and automated follow-up workflows.",
      status: "in_progress" as const, priority: "high" as const,
      start: "2025-02-01", deadline: "2025-09-30",
      techStack: ["React", "Next.js", "PostgreSQL", "Redis", "Docker"],
      completion: 55,
      members: [
        { email: "alice@agency.com", sub: "Frontend", pct: 60 },
        { email: "bob@agency.com",   sub: "Backend",  pct: 50 },
        { email: "frank@agency.com", sub: "Fullstack", pct: 55 },
        { email: "eva@agency.com",   sub: "PM",        pct: 55 },
      ],
    },
    {
      name: "Patient Portal",
      clientKey: "HealthFlow Medical",
      description: "HIPAA-compliant patient management portal with appointment scheduling, medical records access, and telemedicine integration.",
      status: "in_progress" as const, priority: "critical" as const,
      start: "2025-01-10", deadline: "2025-10-15",
      techStack: ["React", "Node.js", "PostgreSQL", "AWS", "HL7 FHIR"],
      completion: 40,
      members: [
        { email: "carol@agency.com", sub: "Mobile",   pct: 35 },
        { email: "bob@agency.com",   sub: "Backend",  pct: 45 },
        { email: "iris@agency.com",  sub: "Analytics", pct: 40 },
        { email: "eva@agency.com",   sub: "PM",        pct: 40 },
      ],
    },
    {
      name: "Inventory Management System",
      clientKey: "RetailMax",
      description: "Real-time inventory tracking with barcode scanning, auto-reorder triggers, supplier management, and analytics dashboard.",
      status: "scoping" as const, priority: "medium" as const,
      start: "2025-05-01", deadline: "2025-12-15",
      techStack: ["Vue", "Laravel", "MySQL", "Redis"],
      completion: 10,
      members: [
        { email: "frank@agency.com", sub: "Fullstack", pct: 10 },
        { email: "grace@agency.com", sub: "Design",    pct: 10 },
        { email: "eva@agency.com",   sub: "PM",        pct: 10 },
      ],
    },
    {
      name: "Learning Management System",
      clientKey: "EduTech Academy",
      description: "Full-featured LMS with course creation, video hosting, quizzes, certificates, progress tracking, and live webinar support.",
      status: "uat" as const, priority: "high" as const,
      start: "2024-10-01", deadline: "2025-06-30",
      techStack: ["React", "Django", "PostgreSQL", "AWS S3", "WebRTC"],
      completion: 88,
      members: [
        { email: "alice@agency.com", sub: "Frontend", pct: 90 },
        { email: "henry@agency.com", sub: "DevOps",   pct: 85 },
        { email: "iris@agency.com",  sub: "Analytics", pct: 90 },
        { email: "eva@agency.com",   sub: "PM",        pct: 88 },
      ],
    },
    {
      name: "Analytics Dashboard",
      clientKey: "TechCorp Solutions",
      description: "Executive business intelligence dashboard with real-time KPIs, custom reports, and predictive analytics powered by ML.",
      status: "completed" as const, priority: "low" as const,
      start: "2024-08-01", deadline: "2025-02-28",
      techStack: ["React", "Python", "FastAPI", "Apache Superset", "BigQuery"],
      completion: 100,
      members: [
        { email: "iris@agency.com",  sub: "Analytics", pct: 100 },
        { email: "frank@agency.com", sub: "Fullstack", pct: 100 },
        { email: "eva@agency.com",   sub: "PM",        pct: 100 },
      ],
    },
    {
      name: "Supply Chain Tracker",
      clientKey: "RetailMax",
      description: "End-to-end supply chain visibility platform with GPS tracking, ETA predictions, supplier performance scoring, and alerts.",
      status: "in_progress" as const, priority: "high" as const,
      start: "2025-03-01", deadline: "2025-11-30",
      techStack: ["React Native", "Node.js", "MongoDB", "Kafka", "Google Maps API"],
      completion: 30,
      members: [
        { email: "carol@agency.com", sub: "Mobile",   pct: 30 },
        { email: "bob@agency.com",   sub: "Backend",  pct: 32 },
        { email: "henry@agency.com", sub: "DevOps",   pct: 28 },
        { email: "eva@agency.com",   sub: "PM",        pct: 30 },
      ],
    },
    {
      name: "Telemedicine App",
      clientKey: "HealthFlow Medical",
      description: "Video consultation app with AI symptom checker, prescription management, and pharmacy integration for iOS and Android.",
      status: "scoping" as const, priority: "medium" as const,
      start: "2025-06-01", deadline: "2026-03-31",
      techStack: ["React Native", "Flutter", "Firebase", "WebRTC", "OpenAI"],
      completion: 5,
      members: [
        { email: "carol@agency.com", sub: "Mobile",   pct: 5 },
        { email: "grace@agency.com", sub: "Design",    pct: 5 },
        { email: "eva@agency.com",   sub: "PM",        pct: 5 },
      ],
    },
    {
      name: "Mobile Banking App",
      clientKey: "Acme Corp",
      description: "Feature-rich fintech mobile app with biometric auth, P2P transfers, bill payments, investment portfolio, and AI spending insights.",
      status: "on_hold" as const, priority: "critical" as const,
      start: "2025-01-01", deadline: "2025-12-31",
      techStack: ["Flutter", "Node.js", "PostgreSQL", "AWS", "Plaid API"],
      completion: 25,
      members: [
        { email: "carol@agency.com", sub: "Mobile",   pct: 25 },
        { email: "alice@agency.com", sub: "Frontend", pct: 25 },
        { email: "henry@agency.com", sub: "DevOps",   pct: 20 },
        { email: "eva@agency.com",   sub: "PM",        pct: 25 },
      ],
    },
  ];

  for (const pd of projectDefs) {
    const clientId = clientIdMap[pd.clientKey];
    if (!clientId) continue;

    const existing = await schema.projectsTable.findOne({ name: pd.name });
    let projectId: number;

    if (!existing) {
      const nextProjId = await getNextSequence("projects");
      const proj = await schema.projectsTable.create({
        id: nextProjId,
        name: pd.name,
        clientId,
        pmId: eva?.id ?? null,
        description: pd.description,
        status: pd.status,
        priority: pd.priority,
        startDate: new Date(pd.start),
        deadline: new Date(pd.deadline),
        techStack: pd.techStack,
        completionOverride: pd.completion,
      });
      projectId = proj.id;
      console.log(`Created project: ${pd.name}`);

      for (const m of pd.members) {
        const memberUser = await schema.usersTable.findOne({ email: m.email });
        if (memberUser) {
          const nextMemId = await getNextSequence("project_members");
          await schema.projectMembersTable.create({
            id: nextMemId,
            projectId,
            userId: memberUser.id,
            subType: m.sub,
            completionPct: m.pct
          });
        }
      }
    }
  }

  // Get ALL projects for logs/bugs/apk seeding
  const allProjects = await schema.projectsTable.find();
  const activeProjects = allProjects.filter(p => ["in_progress", "uat"].includes(p.status));

  // ── Daily Logs ─────────────────────────────────────────────────────────────
  const logDates = [
    "2025-04-01","2025-04-02","2025-04-03","2025-04-07","2025-04-08","2025-04-09","2025-04-10","2025-04-11",
    "2025-04-14","2025-04-15","2025-04-16","2025-04-17","2025-04-22","2025-04-23","2025-04-24","2025-04-25",
    "2025-04-28","2025-04-29","2025-04-30","2025-05-01","2025-05-05","2025-05-06","2025-05-07","2025-05-08",
    "2025-05-12","2025-05-13",
  ];

  const logTemplates = [
    { dev: "alice@agency.com", cats: ["Frontend","UI/UX"],    tasks: [
      { title: "Homepage hero section redesign", desc: "Implemented pixel-perfect hero with animated gradient background and CTA buttons.", hours: 7.5, pct: 62 },
      { title: "Component library setup",        desc: "Set up Storybook with all shared UI components documented and tested.", hours: 8, pct: 65 },
      { title: "Dashboard chart integration",    desc: "Integrated Recharts for live KPI charts with drill-down capability.", hours: 6.5, pct: 68 },
      { title: "Mobile responsiveness fixes",    desc: "Fixed 14 layout issues across breakpoints identified in QA review.", hours: 7, pct: 70 },
      { title: "Authentication UI flow",         desc: "Built complete login, register, forgot-password, and MFA screens.", hours: 8, pct: 73 },
      { title: "Search & filter components",     desc: "Built reusable filter panel with multi-select, date range, and sort controls.", hours: 7.5, pct: 76 },
    ]},
    { dev: "bob@agency.com", cats: ["Backend","API"], tasks: [
      { title: "REST API architecture setup",        desc: "Implemented Express with Zod validation, error middleware, and OpenAPI docs.", hours: 8, pct: 52 },
      { title: "Database schema design",             desc: "Designed normalized schema with proper indexing for all core entities.", hours: 7, pct: 55 },
      { title: "Authentication service",             desc: "Built JWT-based auth with refresh tokens, rate limiting, and session management.", hours: 8, pct: 58 },
      { title: "File upload service",                desc: "Implemented S3-backed file upload with virus scanning and CDN integration.", hours: 6.5, pct: 60 },
      { title: "Payment gateway integration",        desc: "Integrated Stripe for subscriptions, one-time payments, and refund handling.", hours: 8, pct: 63 },
      { title: "Email notification service",         desc: "Built transactional email service with templates and delivery tracking.", hours: 7, pct: 65 },
    ]},
    { dev: "carol@agency.com", cats: ["Mobile","iOS"], tasks: [
      { title: "React Native project bootstrap",     desc: "Set up Expo project with navigation, state management, and CI/CD pipeline.", hours: 8, pct: 38 },
      { title: "Push notification integration",      desc: "Implemented Firebase push notifications with deep linking support.", hours: 7.5, pct: 42 },
      { title: "Offline mode implementation",        desc: "Built offline-first architecture using Redux Persist and background sync.", hours: 8, pct: 46 },
      { title: "Camera & media picker",              desc: "Integrated device camera, gallery picker, and image compression.", hours: 6, pct: 48 },
      { title: "Biometric authentication",           desc: "Implemented Face ID/fingerprint auth with secure keychain storage.", hours: 7, pct: 52 },
      { title: "App store submission prep",          desc: "Prepared screenshots, app description, privacy policy, and compliance docs.", hours: 5, pct: 54 },
    ]},
    { dev: "frank@agency.com", cats: ["Fullstack","API"], tasks: [
      { title: "GraphQL API implementation",         desc: "Built GraphQL schema with DataLoader for N+1 query prevention.", hours: 8, pct: 58 },
      { title: "Real-time features with WebSockets", desc: "Implemented collaborative editing and live notifications via Socket.IO.", hours: 7.5, pct: 62 },
      { title: "Role-based access control",          desc: "Implemented RBAC with hierarchical permissions and audit logging.", hours: 8, pct: 65 },
      { title: "Data export functionality",          desc: "Built CSV/Excel/PDF export pipeline with background job processing.", hours: 7, pct: 68 },
      { title: "Third-party OAuth integration",      desc: "Integrated Google, Microsoft, and LinkedIn SSO with profile sync.", hours: 6.5, pct: 70 },
    ]},
    { dev: "henry@agency.com", cats: ["DevOps","Infrastructure"], tasks: [
      { title: "Docker containerization",            desc: "Dockerized all services with multi-stage builds and optimized layer caching.", hours: 7, pct: 30 },
      { title: "Kubernetes cluster setup",           desc: "Configured EKS cluster with auto-scaling, health checks, and PodDisruptionBudgets.", hours: 8, pct: 33 },
      { title: "CI/CD pipeline setup",               desc: "Built GitHub Actions workflows for test, build, and deploy with environment promotion.", hours: 7.5, pct: 36 },
      { title: "Monitoring & alerting setup",        desc: "Configured Prometheus/Grafana dashboards and PagerDuty alert routing.", hours: 8, pct: 38 },
      { title: "Database backup automation",         desc: "Set up automated daily backups with 30-day retention and restore testing.", hours: 6, pct: 40 },
    ]},
    { dev: "iris@agency.com", cats: ["Analytics","Data"], tasks: [
      { title: "Data warehouse design",              desc: "Designed star schema in BigQuery with ETL pipelines from transactional DB.", hours: 8, pct: 42 },
      { title: "Executive dashboard metrics",        desc: "Defined and implemented 20 KPIs with drill-down capability.", hours: 7, pct: 46 },
      { title: "Cohort analysis reports",            desc: "Built user retention and cohort analysis reports with LTV projections.", hours: 8, pct: 50 },
      { title: "ML model for churn prediction",      desc: "Trained and deployed XGBoost model for 30-day churn prediction with 87% accuracy.", hours: 8, pct: 54 },
    ]},
  ];

  let logCount = 0;
  const existingLogCheck = await schema.dailyLogsTable.findOne({ taskTitle: "Homepage hero section redesign" });

  if (!existingLogCheck) {
    for (const lt of logTemplates) {
      const devUser = await schema.usersTable.findOne({ email: lt.dev });
      if (!devUser) continue;

      const taskPool = lt.tasks;
      const projectPool = activeProjects.length > 0 ? activeProjects : allProjects;

      for (let i = 0; i < Math.min(logDates.length, 20); i++) {
        const task = taskPool[i % taskPool.length];
        const proj = projectPool[i % projectPool.length];
        
        const nextLogId = await getNextSequence("daily_logs");
        await schema.dailyLogsTable.create({
          id: nextLogId,
          developerId: devUser.id,
          projectId: proj.id,
          logDate: logDates[i % logDates.length],
          workCategories: lt.cats,
          taskTitle: task.title,
          taskDescription: task.desc,
          hoursSpent: task.hours,
          completionPct: task.pct,
          nextDayPlan: i % 3 === 0 ? "Continue with next sprint tasks" : undefined,
          blockers: i % 5 === 0 ? "Waiting for design approval" : undefined,
        });
        logCount++;
      }
    }
    console.log(`Created ${logCount} daily logs`);
  }

  // ── Bugs ────────────────────────────────────────────────────────────
  const bugTemplates = [
    { title: "Login page flickers on mobile Safari",           severity: "high"     as const, priority: "p1" as const, platform: "ios"     as const, status: "open"       as const, desc: "Login form briefly goes blank on iOS 17 before rendering. Happens on page load and back navigation." },
    { title: "Pagination resets to page 1 on sort",            severity: "medium"   as const, priority: "p2" as const, platform: "web"     as const, status: "in_progress" as const, desc: "When user sorts any column while on page 3+, pagination resets to page 1 unexpectedly." },
    { title: "File upload fails for files > 5MB",              severity: "critical" as const, priority: "p1" as const, platform: "api"     as const, status: "open"       as const, desc: "API returns 413 for files between 5-10MB despite docs claiming 25MB limit. Nginx config mismatch." },
    { title: "Dark mode toggle not persisting across tabs",    severity: "low"      as const, priority: "p3" as const, platform: "web"     as const, status: "open"       as const, desc: "Dark mode preference saved in localStorage but not synced across browser tabs using storage events." },
    { title: "Push notifications not received in background",  severity: "high"     as const, priority: "p2" as const, platform: "android" as const, status: "in_progress" as const, desc: "Android notifications fire correctly in foreground but silently fail when app is backgrounded." },
    { title: "Date picker breaks on Firefox",                  severity: "medium"   as const, priority: "p2" as const, platform: "web"     as const, status: "open"       as const, desc: "Native date input type=date renders inconsistently on Firefox 120+. Needs custom picker component." },
    { title: "Chart tooltips overflow off-screen",             severity: "low"      as const, priority: "p4" as const, platform: "web"     as const, status: "open"       as const, desc: "Recharts tooltip goes off-screen when hovering data points near the right edge of the chart." },
    { title: "Search returns stale results after update",      severity: "medium"   as const, priority: "p2" as const, platform: "web"     as const, status: "fixed"       as const, desc: "Elasticsearch index not updated immediately after record mutation. Cache invalidation bug." },
    { title: "Memory leak in real-time dashboard",             severity: "critical" as const, priority: "p1" as const, platform: "web"     as const, status: "in_progress" as const, desc: "WebSocket event listeners not cleaned up on component unmount. Page memory grows to 2GB+ over time." },
    { title: "Password strength indicator missing on reset",   severity: "low"      as const, priority: "p4" as const, platform: "web"     as const, status: "open"       as const, desc: "Password strength meter shown on register page but absent from password reset flow. UX inconsistency." },
    { title: "API response times spike during peak hours",     severity: "high"     as const, priority: "p1" as const, platform: "api"     as const, status: "in_progress" as const, desc: "P95 latency jumps from 120ms to 4.2s between 2-4pm UTC. Suspected database connection pool exhaustion." },
    { title: "CSV export includes HTML entities",              severity: "medium"   as const, priority: "p3" as const, platform: "web"     as const, status: "open"       as const, desc: "Exported CSV has &amp; instead of & in company names. Missing HTML decode step in export pipeline." },
    { title: "Session expires but user stays on dashboard",    severity: "high"     as const, priority: "p2" as const, platform: "web"     as const, status: "fixed"       as const, desc: "Expired JWT not caught on /api/dashboard endpoint. Page shows stale data instead of redirecting to login." },
    { title: "Autocomplete reveals confidential client names", severity: "critical" as const, priority: "p1" as const, platform: "web"     as const, status: "open"       as const, desc: "Search autocomplete shows all client names regardless of user's assigned projects. RBAC gap in suggestions API." },
    { title: "Report PDF has incorrect totals",                severity: "high"     as const, priority: "p1" as const, platform: "web"     as const, status: "open"       as const, desc: "Monthly billing report PDF shows wrong totals when line items have discounts. Off-by-one in discount calculation." },
    { title: "Calendar view missing weekends",                 severity: "medium"   as const, priority: "p3" as const, platform: "web"     as const, status: "open"       as const, desc: "Project timeline calendar renders Mon-Fri only. Weekends omitted breaking multi-day task spans." },
    { title: "Bulk action deselects items on pagination",      severity: "medium"   as const, priority: "p2" as const, platform: "web"     as const, status: "in_progress" as const, desc: "Checking all items and navigating to next page clears the selection. Needs cross-page selection state." },
    { title: "iOS app crashes on low storage",                 severity: "critical" as const, priority: "p1" as const, platform: "ios"     as const, status: "open"       as const, desc: "App crashes without error message when device has <500MB free space. No storage check or graceful fallback." },
    { title: "Webhook duplicate deliveries",                   severity: "high"     as const, priority: "p2" as const, platform: "api"     as const, status: "in_progress" as const, desc: "Webhook retry logic triggers even on 200 responses. Implementing idempotency keys needed." },
    { title: "Multi-select filter ignores OR logic",           severity: "medium"   as const, priority: "p3" as const, platform: "web"     as const, status: "open"       as const, desc: "Selecting Status=Open AND Status=In Progress should use OR logic but returns empty result set." },
  ];

  const david = await schema.usersTable.findOne({ email: "david@agency.com" });
  const alice = await schema.usersTable.findOne({ email: "alice@agency.com" });
  const bob = await schema.usersTable.findOne({ email: "bob@agency.com" });
  const carol = await schema.usersTable.findOne({ email: "carol@agency.com" });

  const existingBugCheck = await schema.bugsTable.findOne({ title: "Login page flickers on mobile Safari" });

  if (!existingBugCheck && david) {
    let bugIdx = 0;
    for (const bt of bugTemplates) {
      const proj = allProjects[bugIdx % allProjects.length];
      const nextBugId = await getNextSequence("bugs");
      const bugCounter = await getNextSequence("bugs_count");
      
      await schema.bugsTable.create({
        id: nextBugId,
        bugNumber: `BUG-${String(bugCounter).padStart(4, "0")}`,
        projectId: proj.id,
        reporterId: david.id,
        assigneeId: bugIdx % 3 === 0 ? alice?.id : bugIdx % 3 === 1 ? bob?.id : carol?.id,
        title: bt.title,
        description: bt.desc,
        severity: bt.severity,
        priority: bt.priority,
        status: bt.status,
        platform: bt.platform,
        buildVersion: `2.${Math.floor(bugIdx / 5)}.${bugIdx % 10}`,
      });
      bugIdx++;
    }
    console.log(`Created ${bugTemplates.length} bugs`);
  }

  // ── APK Releases ───────────────────────────────────────────────────────────
  const mobileProjects = allProjects.filter(p => p.techStack.some((t: any) => ["React Native","Flutter","iOS Native","Android Native"].includes(t)));
  const existingApk = await schema.apkReleasesTable.findOne({ version: "1.0.0-alpha" });

  if (!existingApk && carol && mobileProjects.length > 0) {
    const apkData = [
      { version: "1.0.0-alpha", build: 1, type: "alpha" as const, platform: "android" as const, audience: "team_only" as const, changelog: "Initial alpha build. Core navigation, login, and basic listing screens.", proj: 0 },
      { version: "1.1.0-beta",  build: 2, type: "beta"  as const, platform: "android" as const, audience: "team_only" as const, changelog: "Beta release: push notifications, offline mode, and bug fixes from alpha testing.", proj: 0 },
      { version: "1.2.0-beta",  build: 3, type: "beta"  as const, platform: "ios"     as const, audience: "team_only" as const, changelog: "iOS beta: Face ID support, iPad layout optimizations, and Safari WebView fixes.", proj: 0 },
      { version: "1.3.0-rc",    build: 4, type: "rc"    as const, platform: "android" as const, audience: "client_visible" as const, changelog: "Release candidate: all P1 bugs fixed, performance improvements, ready for client UAT.", proj: 1 % mobileProjects.length },
      { version: "2.0.0",       build: 5, type: "production" as const, platform: "android" as const, audience: "client_visible" as const, changelog: "Production release: payment integration, biometric auth, and 50+ UX improvements.", proj: 1 % mobileProjects.length },
    ];

    for (const apk of apkData) {
      const proj = mobileProjects[apk.proj];
      const nextApkId = await getNextSequence("apk_releases");
      await schema.apkReleasesTable.create({
        id: nextApkId,
        projectId: proj.id,
        uploaderId: carol.id,
        version: apk.version,
        buildNumber: apk.build,
        releaseType: apk.type,
        platform: apk.platform,
        audience: apk.audience,
        changelog: apk.changelog,
        fileUrl: `https://storage.agency.com/releases/${proj.id}/${apk.version}.apk`,
        minOsVersion: apk.platform === "android" ? "8.0" : "14.0",
      });
    }
    console.log("Created APK releases");
  }

  // ── Resource Requests ──────────────────────────────────────────────────────
  const existingReq = await schema.resourceRequestsTable.findOne({ title: "Figma Enterprise License" });
  const frank = await schema.usersTable.findOne({ email: "frank@agency.com" });
  const iris = await schema.usersTable.findOne({ email: "iris@agency.com" });
  const henry = await schema.usersTable.findOne({ email: "henry@agency.com" });

  if (!existingReq && allProjects.length > 0) {
    const requests = [
      { dev: alice,   type: "software_license" as const, title: "Figma Enterprise License",        urgency: "high"   as const, status: "approved"  as const, desc: "Need Figma Enterprise for the design system work across 3 active projects. Team plan insufficient.", note: "Approved. License purchased and activated." },
      { dev: bob,     type: "api_access"       as const, title: "Stripe Production API Keys",       urgency: "high"   as const, status: "approved"  as const, desc: "Payment gateway production keys needed to complete E-Commerce integration before UAT.", note: "Keys shared via Vault." },
      { dev: henry,   type: "server_hosting"   as const, title: "AWS EC2 t3.xlarge Instance",       urgency: "medium" as const, status: "approved"  as const, desc: "Additional compute needed for staging environment performance testing under 500 concurrent users.", note: "Instance spun up. Cost center: DEV-OPS-2025." },
      { dev: carol,   type: "software_license" as const, title: "Apple Developer Program Renewal",  urgency: "high"   as const, status: "pending"   as const, desc: "Annual Apple Developer account expires in 14 days. Required for iOS builds and TestFlight distribution.", note: undefined },
      { dev: frank,   type: "design_asset"     as const, title: "Premium Icon Pack — LineIcons Pro", urgency: "low"  as const, status: "pending"   as const, desc: "Consistent premium icon set needed for the CRM dashboard project. 1000+ icons, one-time $49 license.", note: undefined },
      { dev: iris,    type: "software_license" as const, title: "Tableau Desktop License",           urgency: "medium" as const, status: "rejected"  as const, desc: "Advanced data visualization for analytics reports. Alternative free tools evaluated.", note: "Rejected — Apache Superset covers requirements at zero cost." },
      { dev: bob,     type: "hardware"         as const, title: "MacBook Pro M3 Max for Load Testing", urgency: "low" as const, status: "pending"  as const, desc: "Current dev machine struggles with Docker + k6 load testing simultaneously. Requesting upgrade.", note: undefined },
      { dev: alice,   type: "other"            as const, title: "Conference: React Summit 2025",     urgency: "low"   as const, status: "approved"  as const, desc: "React Summit Amsterdam May 15-16. Valuable for upskilling on React 19, Server Components, and Suspense.", note: "Approved. Book flights and hotel in Notion." },
    ];

    let reqIdx = 0;
    for (const r of requests) {
      if (!r.dev) continue;
      const proj = allProjects[reqIdx % allProjects.length];
      const nextReqId = await getNextSequence("resource_requests");
      await schema.resourceRequestsTable.create({
        id: nextReqId,
        developerId: r.dev.id,
        projectId: proj.id,
        type: r.type,
        title: r.title,
        description: r.desc,
        urgency: r.urgency,
        status: r.status,
        adminNote: r.note,
      });
      reqIdx++;
    }
    console.log("Created resource requests");
  }

  // ── Milestones ─────────────────────────────────────────────────────────────
  const existingMilestone = await schema.milestonesTable.findOne({ title: "Discovery & Architecture" });

  if (!existingMilestone) {
    const milestonesByProject = [
      { projectName: "CRM Dashboard", milestones: [
        { title: "Discovery & Architecture", planned: "2025-02-28", actual: "2025-02-28", status: "completed" as const },
        { title: "UI Prototype Approval",    planned: "2025-03-31", actual: "2025-04-05", status: "completed" as const },
        { title: "Core API Development",     planned: "2025-05-31", status: "pending" as const },
        { title: "Integration & Testing",    planned: "2025-07-31", status: "pending" as const },
        { title: "Production Launch",        planned: "2025-09-30", status: "pending" as const },
      ]},
      { projectName: "Patient Portal", milestones: [
        { title: "HIPAA Gap Analysis",    planned: "2025-01-31", actual: "2025-01-31", status: "completed" as const },
        { title: "Core Module Delivery",  planned: "2025-04-30", actual: "2025-05-10", status: "delayed" as const },
        { title: "Interoperability UAT",  planned: "2025-07-31", status: "pending" as const },
        { title: "Go-Live",               planned: "2025-10-15", status: "pending" as const },
      ]},
      { projectName: "Learning Management System", milestones: [
        { title: "Platform Foundation",    planned: "2024-11-30", actual: "2024-11-30", status: "completed" as const },
        { title: "Course Builder Launch",  planned: "2025-01-31", actual: "2025-01-28", status: "completed" as const },
        { title: "Video Hosting & CDN",    planned: "2025-03-31", actual: "2025-03-31", status: "completed" as const },
        { title: "Public Beta",            planned: "2025-05-31", actual: "2025-05-31", status: "completed" as const },
        { title: "Production Launch",      planned: "2025-06-30", status: "pending" as const },
      ]},
      { projectName: "Supply Chain Tracker", milestones: [
        { title: "Requirements Sign-off",  planned: "2025-03-31", actual: "2025-04-02", status: "completed" as const },
        { title: "GPS Tracking MVP",       planned: "2025-06-30", status: "pending" as const },
        { title: "Supplier Portal Launch", planned: "2025-09-30", status: "pending" as const },
        { title: "Full Deployment",        planned: "2025-11-30", status: "pending" as const },
      ]},
    ];

    for (const mp of milestonesByProject) {
      const proj = allProjects.find(p => p.name === mp.projectName);
      if (!proj) continue;
      for (const m of mp.milestones) {
        const nextMsId = await getNextSequence("milestones");
        await schema.milestonesTable.create({
          id: nextMsId,
          projectId: proj.id,
          title: m.title,
          plannedDate: new Date(m.planned),
          actualDate: m.actual ? new Date(m.actual) : undefined,
          status: m.status,
        });
      }
    }
    console.log("Created milestones");
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  const existingNotif = await schema.notificationsTable.findOne({ title: "New bug assigned to you" });

  if (!existingNotif && alice && bob && carol) {
    const notifs = [
      { userId: alice.id,  type: "bug_assigned",      title: "New bug assigned to you",       body: "BUG-0001: Cart total not updating on quantity change has been assigned to you." },
      { userId: alice.id,  type: "milestone_due",     title: "Milestone due in 7 days",        body: "Core API Development milestone for CRM Dashboard is due on May 31st." },
      { userId: bob.id,    type: "bug_assigned",      title: "Critical bug needs attention",   body: "BUG-0009: Memory leak in real-time dashboard is critical priority. Please investigate." },
      { userId: bob.id,    type: "request_approved",  title: "Resource request approved",      body: "Your request for Stripe Production API Keys has been approved. Check Vault for credentials." },
      { userId: carol.id,  type: "apk_scheduled",    title: "APK release due tomorrow",       body: "The iOS beta release is scheduled for tomorrow. Please ensure the build is ready." },
      { userId: admin!.id, type: "request_pending",   title: "New resource request",           body: "Carol Davis has submitted a request for Apple Developer Program Renewal. Review required." },
      { userId: admin!.id, type: "bug_critical",      title: "Critical bug filed",             body: "BUG-0014: Autocomplete reveals confidential client names — security vulnerability. Immediate action needed." },
      { userId: admin!.id, type: "project_delayed",   title: "Project milestone delayed",      body: "Patient Portal: Core Module Delivery milestone was delayed by 10 days." },
      { userId: alice.id,  type: "comment_mention",   title: "You were mentioned in a comment", body: "@alice Can you review the filter component PR? Needs your approval before merge." },
      { userId: bob.id,    type: "deployment_done",   title: "Deployment successful",          body: "E-Commerce Platform v1.2.3 successfully deployed to staging. Ready for QA sign-off." },
    ];

    for (const n of notifs) {
      const nextNotifId = await getNextSequence("notifications");
      await schema.notificationsTable.create({
        id: nextNotifId,
        ...n,
        isRead: false
      });
    }
    console.log("Created notifications");
  }

  console.log("\n✅ Additional seed data complete!");
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
