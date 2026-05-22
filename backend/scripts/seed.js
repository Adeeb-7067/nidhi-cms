import mongoose from "mongoose";
import * as schema from "@/models/schema";
import bcrypt from "bcryptjs";
async function main() {
  console.log("Connecting to database...");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Seeding database...");
  const { getNextSequence } = schema;
  const existingSettings = await schema.companySettingsTable.findOne();
  if (!existingSettings) {
    const nextId = await getNextSequence("settings");
    await schema.companySettingsTable.create({
      id: nextId,
      companyName: "TechAgency Inc."
    });
    console.log("Created company settings");
  }
  const existingAdmin = await schema.usersTable.findOne({ email: "admin@agency.com" });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@123", 12);
    const nextId = await getNextSequence("users");
    await schema.usersTable.create({
      id: nextId,
      name: "Super Admin",
      email: "admin@agency.com",
      passwordHash,
      role: "super_admin",
      designation: "Chief Technology Officer",
      status: "active"
    });
    console.log("Created super admin: admin@agency.com / Admin@123");
  } else {
    console.log("Super admin already exists");
  }
  const devNames = [
    { name: "Alice Johnson", email: "alice@agency.com", designation: "Senior Frontend Developer", subType: "Frontend" },
    { name: "Bob Smith", email: "bob@agency.com", designation: "Backend Engineer", subType: "Backend" },
    { name: "Carol Davis", email: "carol@agency.com", designation: "Mobile Developer", subType: "Mobile" },
    { name: "David Lee", email: "david@agency.com", designation: "QA Engineer", subType: "Tester" },
    { name: "Eva Martinez", email: "eva@agency.com", designation: "Project Manager", subType: "Project Manager" }
  ];
  for (const dev of devNames) {
    const existing = await schema.usersTable.findOne({ email: dev.email });
    const role = dev.email === "david@agency.com" ? "tester" : "developer";
    if (!existing) {
      const devCounter = await getNextSequence("employee_id_counter");
      const prefix = dev.name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2).padEnd(2, "X");
      const employeeId = `${prefix}${String(devCounter).padStart(3, "0")}`;
      const passwordHash = await bcrypt.hash("Dev@123", 12);
      const userId = await getNextSequence("users");
      await schema.usersTable.create({
        id: userId,
        ...dev,
        passwordHash,
        role,
        employeeId,
        status: "active"
      });
      console.log(`Created ${role}: ${dev.email} / Dev@123 (Employee ID: ${employeeId})`);
    } else if (dev.email === "david@agency.com" && existing.role !== "tester") {
      await schema.usersTable.updateOne({ id: existing.id }, { $set: { role: "tester", designation: dev.designation, subType: dev.subType } });
      console.log("Updated david@agency.com to tester role");
    }
  }
  const existingClient = await schema.usersTable.findOne({ email: "client@example.com" });
  let clientUserId = null;
  if (!existingClient) {
    const passwordHash = await bcrypt.hash("Client@123", 12);
    const nextId = await getNextSequence("users");
    const clientUser = await schema.usersTable.create({
      id: nextId,
      name: "John Client",
      email: "client@example.com",
      passwordHash,
      role: "client",
      designation: "CEO",
      status: "active"
    });
    clientUserId = clientUser.id;
    console.log("Created client user: client@example.com / Client@123");
  } else {
    clientUserId = existingClient.id;
  }
  const existingClientCompany = await schema.clientsTable.findOne({ email: "contact@acmecorp.com" });
  let clientId = null;
  if (!existingClientCompany) {
    const nextId = await getNextSequence("clients");
    const client = await schema.clientsTable.create({
      id: nextId,
      companyName: "Acme Corp",
      contactPerson: "John Client",
      email: "contact@acmecorp.com",
      phone: "+1-555-0100",
      address: "123 Business Ave, New York, NY",
      status: "active",
      portalLogin: true,
      userId: clientUserId
    });
    clientId = client.id;
    console.log("Created client: Acme Corp");
  } else {
    clientId = existingClientCompany.id;
  }
  const existingProject = await schema.projectsTable.findOne({ name: /E-Commerce Platform/ });
  if (!existingProject && clientId) {
    const alice = await schema.usersTable.findOne({ email: "alice@agency.com" });
    const bob = await schema.usersTable.findOne({ email: "bob@agency.com" });
    const carol = await schema.usersTable.findOne({ email: "carol@agency.com" });
    const eva = await schema.usersTable.findOne({ email: "eva@agency.com" });
    const p1Id = await getNextSequence("projects");
    const project1 = await schema.projectsTable.create({
      id: p1Id,
      name: "E-Commerce Platform v2",
      clientId,
      pmId: eva?.id ?? null,
      description: "Complete rebuild of the client e-commerce platform with modern stack, improved UX, and mobile-first approach.",
      status: "in_progress",
      priority: "high",
      startDate: /* @__PURE__ */ new Date("2025-01-15"),
      deadline: /* @__PURE__ */ new Date("2025-08-30"),
      techStack: ["React", "Node.js", "PostgreSQL", "Redis", "AWS"],
      stagingUrl: "https://staging.acme-shop.com"
    });
    const p2Id = await getNextSequence("projects");
    await schema.projectsTable.create({
      id: p2Id,
      name: "Mobile App Development",
      clientId,
      pmId: eva?.id ?? null,
      description: "Cross-platform mobile application for iOS and Android using React Native.",
      status: "scoping",
      priority: "medium",
      startDate: /* @__PURE__ */ new Date("2025-04-01"),
      deadline: /* @__PURE__ */ new Date("2025-12-31"),
      techStack: ["React Native", "TypeScript", "Firebase"]
    });
    if (alice) {
      const mId = await getNextSequence("project_members");
      await schema.projectMembersTable.create({ id: mId, projectId: project1.id, userId: alice.id, subType: "Frontend", completionPct: 65 });
    }
    if (bob) {
      const mId = await getNextSequence("project_members");
      await schema.projectMembersTable.create({ id: mId, projectId: project1.id, userId: bob.id, subType: "Backend", completionPct: 70 });
    }
    if (carol) {
      const mId = await getNextSequence("project_members");
      await schema.projectMembersTable.create({ id: mId, projectId: project1.id, userId: carol.id, subType: "Mobile", completionPct: 45 });
    }
    if (eva) {
      const mId = await getNextSequence("project_members");
      await schema.projectMembersTable.create({ id: mId, projectId: project1.id, userId: eva.id, subType: "Project Manager", completionPct: 60 });
    }
    if (alice) {
      const log1Id = await getNextSequence("daily_logs");
      await schema.dailyLogsTable.create({
        id: log1Id,
        developerId: alice.id,
        projectId: project1.id,
        logDate: "2025-05-09",
        workCategories: ["Frontend", "UI/UX"],
        taskTitle: "Product listing page redesign",
        taskDescription: "Revamped the product grid with filter panel and infinite scroll.",
        hoursSpent: 7.5,
        completionPct: 60,
        nextDayPlan: "Work on cart page animations"
      });
      const log2Id = await getNextSequence("daily_logs");
      await schema.dailyLogsTable.create({
        id: log2Id,
        developerId: alice.id,
        projectId: project1.id,
        logDate: "2025-05-10",
        workCategories: ["Frontend", "Testing"],
        taskTitle: "Cart page + checkout flow",
        taskDescription: "Implemented cart state management and checkout step wizard.",
        hoursSpent: 8,
        completionPct: 65,
        blockers: "Waiting for payment API credentials from client"
      });
    }
    if (bob) {
      const log3Id = await getNextSequence("daily_logs");
      await schema.dailyLogsTable.create({
        id: log3Id,
        developerId: bob.id,
        projectId: project1.id,
        logDate: "2025-05-09",
        workCategories: ["Backend", "API"],
        taskTitle: "Product search API with Elasticsearch",
        taskDescription: "Integrated Elasticsearch for full-text product search with faceted filtering.",
        hoursSpent: 8,
        completionPct: 68
      });
      const log4Id = await getNextSequence("daily_logs");
      await schema.dailyLogsTable.create({
        id: log4Id,
        developerId: bob.id,
        projectId: project1.id,
        logDate: "2025-05-10",
        workCategories: ["Backend", "Database"],
        taskTitle: "Order management API",
        hoursSpent: 7,
        completionPct: 70,
        nextDayPlan: "Implement inventory sync"
      });
    }
    const david2 = await schema.usersTable.findOne({ email: "david@agency.com" });
    if (david2) {
      const existingMembership = await schema.projectMembersTable.findOne({ projectId: project1.id, userId: david2.id });
      if (!existingMembership) {
        const mId = await getNextSequence("project_members");
        await schema.projectMembersTable.create({
          id: mId,
          projectId: project1.id,
          userId: david2.id,
          subType: "QA / Tester",
          completionPct: 0
        });
      }
    }
    if (david2) {
      const b1Id = await getNextSequence("bugs");
      const bugCounter1 = await getNextSequence("bugs_count");
      await schema.bugsTable.create({
        id: b1Id,
        bugNumber: `BUG-${String(bugCounter1).padStart(4, "0")}`,
        projectId: project1.id,
        reporterId: david2.id,
        assigneeId: alice?.id ?? null,
        title: "Cart total not updating on quantity change",
        description: "When user increases item quantity, the cart total remains unchanged until page refresh.",
        severity: "high",
        priority: "p1",
        status: "in_progress",
        platform: "web",
        buildVersion: "1.2.3"
      });
      const b2Id = await getNextSequence("bugs");
      const bugCounter2 = await getNextSequence("bugs_count");
      await schema.bugsTable.create({
        id: b2Id,
        bugNumber: `BUG-${String(bugCounter2).padStart(4, "0")}`,
        projectId: project1.id,
        reporterId: david2.id,
        assigneeId: bob?.id ?? null,
        title: "Product images not loading on mobile",
        description: "Product detail images fail to load on iOS Safari. Network tab shows 404.",
        severity: "medium",
        priority: "p2",
        status: "open",
        platform: "ios",
        buildVersion: "1.2.3"
      });
      const b3Id = await getNextSequence("bugs");
      const bugCounter3 = await getNextSequence("bugs_count");
      await schema.bugsTable.create({
        id: b3Id,
        bugNumber: `BUG-${String(bugCounter3).padStart(4, "0")}`,
        projectId: project1.id,
        reporterId: david2.id,
        title: "Search results sort order inconsistent",
        severity: "low",
        priority: "p3",
        status: "open",
        platform: "web"
      });
    }
    const ms1Id = await getNextSequence("milestones");
    await schema.milestonesTable.create({ id: ms1Id, projectId: project1.id, title: "Alpha Release", plannedDate: /* @__PURE__ */ new Date("2025-03-31"), actualDate: /* @__PURE__ */ new Date("2025-04-05"), status: "completed" });
    const ms2Id = await getNextSequence("milestones");
    await schema.milestonesTable.create({ id: ms2Id, projectId: project1.id, title: "Beta Release", plannedDate: /* @__PURE__ */ new Date("2025-06-30"), status: "pending" });
    const ms3Id = await getNextSequence("milestones");
    await schema.milestonesTable.create({ id: ms3Id, projectId: project1.id, title: "Production Launch", plannedDate: /* @__PURE__ */ new Date("2025-08-30"), status: "pending" });
    console.log("Created demo project with members, logs, bugs, milestones");
  }
  const david = await schema.usersTable.findOne({ email: "david@agency.com" });
  const demoProject = await schema.projectsTable.findOne({ name: /E-Commerce Platform/ });
  if (david && demoProject) {
    const existingMembership = await schema.projectMembersTable.findOne({ projectId: demoProject.id, userId: david.id });
    if (!existingMembership) {
      const mId = await getNextSequence("project_members");
      await schema.projectMembersTable.create({
        id: mId,
        projectId: demoProject.id,
        userId: david.id,
        subType: "QA / Tester",
        completionPct: 0
      });
      console.log("Assigned david@agency.com to demo project as tester");
    }
  }
  console.log("\nSeed complete! Login credentials:");
  console.log("  Super Admin: admin@agency.com / Admin@123");
  console.log("  Developer:   alice@agency.com / Dev@123");
  console.log("  Tester:      david@agency.com / Dev@123");
  console.log("  Client:      client@example.com / Client@123");
  await mongoose.disconnect();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
