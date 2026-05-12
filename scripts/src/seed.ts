import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db/schema";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log("Seeding database...");

  // Initialize employee counter
  const existingCounter = await db.query.employeeCounterTable.findFirst();
  if (!existingCounter) {
    await db.insert(schema.employeeCounterTable).values({ counter: 0 });
    console.log("Initialized employee counter");
  }

  // Company settings
  const existingSettings = await db.query.companySettingsTable.findFirst();
  if (!existingSettings) {
    await db.insert(schema.companySettingsTable).values({ companyName: "TechAgency Inc." });
    console.log("Created company settings");
  }

  // Check if super admin exists
  const existingAdmin = await db.query.usersTable.findFirst({
    where: (t, { eq }) => eq(t.email, "admin@agency.com"),
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@123", 12);
    await db.insert(schema.usersTable).values({
      name: "Super Admin",
      email: "admin@agency.com",
      passwordHash,
      role: "super_admin",
      designation: "Chief Technology Officer",
      status: "active",
    });
    console.log("Created super admin: admin@agency.com / Admin@123");
  } else {
    console.log("Super admin already exists");
  }

  // Create demo developers
  const devNames = [
    { name: "Alice Johnson", email: "alice@agency.com", designation: "Senior Frontend Developer", subType: "Frontend" },
    { name: "Bob Smith", email: "bob@agency.com", designation: "Backend Engineer", subType: "Backend" },
    { name: "Carol Davis", email: "carol@agency.com", designation: "Mobile Developer", subType: "Mobile" },
    { name: "David Lee", email: "david@agency.com", designation: "QA Engineer", subType: "Tester" },
    { name: "Eva Martinez", email: "eva@agency.com", designation: "Project Manager", subType: "Project Manager" },
  ];

  let counter = 0;
  const counterRow = await db.query.employeeCounterTable.findFirst();
  counter = counterRow?.counter ?? 0;

  for (const dev of devNames) {
    const existing = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, dev.email) });
    if (!existing) {
      counter++;
      const prefix = dev.name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2).padEnd(2, "X");
      const employeeId = `${prefix}${String(counter).padStart(3, "0")}`;
      const passwordHash = await bcrypt.hash("Dev@123", 12);
      await db.insert(schema.usersTable).values({ ...dev, passwordHash, role: "developer", employeeId, status: "active" });
      console.log(`Created developer: ${dev.email} / Dev@123 (Employee ID: ${employeeId})`);
    }
  }

  // Update counter
  const { eq } = await import("drizzle-orm");
  if (counterRow) {
    await db.update(schema.employeeCounterTable).set({ counter }).where(eq(schema.employeeCounterTable.id, counterRow.id));
  }

  // Create demo client user
  const existingClient = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, "client@example.com") });
  let clientUserId: number | null = null;
  if (!existingClient) {
    const passwordHash = await bcrypt.hash("Client@123", 12);
    const [clientUser] = await db.insert(schema.usersTable).values({
      name: "John Client",
      email: "client@example.com",
      passwordHash,
      role: "client",
      designation: "CEO",
      status: "active",
    }).returning();
    clientUserId = clientUser.id;
    console.log("Created client user: client@example.com / Client@123");
  } else {
    clientUserId = existingClient.id;
  }

  // Create demo client company
  const existingClientCompany = await db.query.clientsTable.findFirst({ where: (t, { eq }) => eq(t.email, "contact@acmecorp.com") });
  let clientId: number | null = null;
  if (!existingClientCompany) {
    const [client] = await db.insert(schema.clientsTable).values({
      companyName: "Acme Corp",
      contactPerson: "John Client",
      email: "contact@acmecorp.com",
      phone: "+1-555-0100",
      address: "123 Business Ave, New York, NY",
      status: "active",
      portalLogin: true,
      userId: clientUserId,
    }).returning();
    clientId = client.id;
    console.log("Created client: Acme Corp");
  } else {
    clientId = existingClientCompany.id;
  }

  // Create demo projects
  const existingProject = await db.query.projectsTable.findFirst({ where: (t, { like }) => like(t.name, "E-Commerce Platform%") });
  if (!existingProject && clientId) {
    const admin = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, "admin@agency.com") });
    const alice = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, "alice@agency.com") });
    const bob = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, "bob@agency.com") });
    const carol = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, "carol@agency.com") });
    const eva = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, "eva@agency.com") });

    const [project1] = await db.insert(schema.projectsTable).values({
      name: "E-Commerce Platform v2",
      clientId,
      pmId: eva?.id ?? null,
      description: "Complete rebuild of the client e-commerce platform with modern stack, improved UX, and mobile-first approach.",
      status: "in_progress",
      priority: "high",
      startDate: new Date("2025-01-15"),
      deadline: new Date("2025-08-30"),
      techStack: ["React", "Node.js", "PostgreSQL", "Redis", "AWS"],
      stagingUrl: "https://staging.acme-shop.com",
    }).returning();

    await db.insert(schema.projectsTable).values({
      name: "Mobile App Development",
      clientId,
      pmId: eva?.id ?? null,
      description: "Cross-platform mobile application for iOS and Android using React Native.",
      status: "scoping",
      priority: "medium",
      startDate: new Date("2025-04-01"),
      deadline: new Date("2025-12-31"),
      techStack: ["React Native", "TypeScript", "Firebase"],
    });

    if (alice) {
      await db.insert(schema.projectMembersTable).values({ projectId: project1.id, userId: alice.id, subType: "Frontend", completionPct: 65 });
    }
    if (bob) {
      await db.insert(schema.projectMembersTable).values({ projectId: project1.id, userId: bob.id, subType: "Backend", completionPct: 70 });
    }
    if (carol) {
      await db.insert(schema.projectMembersTable).values({ projectId: project1.id, userId: carol.id, subType: "Mobile", completionPct: 45 });
    }
    if (eva) {
      await db.insert(schema.projectMembersTable).values({ projectId: project1.id, userId: eva.id, subType: "Project Manager", completionPct: 60 });
    }

    // Add some daily logs
    if (alice) {
      await db.insert(schema.dailyLogsTable).values([
        { developerId: alice.id, projectId: project1.id, logDate: "2025-05-09", workCategories: ["Frontend", "UI/UX"], taskTitle: "Product listing page redesign", taskDescription: "Revamped the product grid with filter panel and infinite scroll.", hoursSpent: "7.5", completionPct: 60, nextDayPlan: "Work on cart page animations" },
        { developerId: alice.id, projectId: project1.id, logDate: "2025-05-10", workCategories: ["Frontend", "Testing"], taskTitle: "Cart page + checkout flow", taskDescription: "Implemented cart state management and checkout step wizard.", hoursSpent: "8", completionPct: 65, blockers: "Waiting for payment API credentials from client" },
      ]);
    }
    if (bob) {
      await db.insert(schema.dailyLogsTable).values([
        { developerId: bob.id, projectId: project1.id, logDate: "2025-05-09", workCategories: ["Backend", "API"], taskTitle: "Product search API with Elasticsearch", taskDescription: "Integrated Elasticsearch for full-text product search with faceted filtering.", hoursSpent: "8", completionPct: 68 },
        { developerId: bob.id, projectId: project1.id, logDate: "2025-05-10", workCategories: ["Backend", "Database"], taskTitle: "Order management API", hoursSpent: "7", completionPct: 70, nextDayPlan: "Implement inventory sync" },
      ]);
    }

    // Add bugs
    const david = await db.query.usersTable.findFirst({ where: (t, { eq }) => eq(t.email, "david@agency.com") });
    if (david) {
      await db.insert(schema.bugsTable).values([
        { bugNumber: "BUG-0001", projectId: project1.id, reporterId: david.id, assigneeId: alice?.id ?? null, title: "Cart total not updating on quantity change", description: "When user increases item quantity, the cart total remains unchanged until page refresh.", severity: "high", priority: "p1", status: "in_progress", platform: "web", buildVersion: "1.2.3" },
        { bugNumber: "BUG-0002", projectId: project1.id, reporterId: david.id, assigneeId: bob?.id ?? null, title: "Product images not loading on mobile", description: "Product detail images fail to load on iOS Safari. Network tab shows 404.", severity: "medium", priority: "p2", status: "open", platform: "ios", buildVersion: "1.2.3" },
        { bugNumber: "BUG-0003", projectId: project1.id, reporterId: david.id, title: "Search results sort order inconsistent", severity: "low", priority: "p3", status: "open", platform: "web" },
      ]);
    }

    // Milestones
    await db.insert(schema.milestonesTable).values([
      { projectId: project1.id, title: "Alpha Release", plannedDate: new Date("2025-03-31"), actualDate: new Date("2025-04-05"), status: "completed" },
      { projectId: project1.id, title: "Beta Release", plannedDate: new Date("2025-06-30"), status: "pending" },
      { projectId: project1.id, title: "Production Launch", plannedDate: new Date("2025-08-30"), status: "pending" },
    ]);

    console.log("Created demo project with members, logs, bugs, milestones");
  }

  console.log("\nSeed complete! Login credentials:");
  console.log("  Super Admin: admin@agency.com / Admin@123");
  console.log("  Developer:   alice@agency.com / Dev@123 (Employee ID: AL001)");
  console.log("  Client:      client@example.com / Client@123");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
