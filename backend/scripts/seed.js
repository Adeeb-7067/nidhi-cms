import "../load-env.js";
import mongoose from "mongoose";
import * as schema from "../src/models/schema/index.js";
import bcrypt from "bcryptjs";
import {
  ensureDefaultRoleTemplates,
  backfillSystemTemplatePermissions,
  assignRoleTemplatesToUsers,
} from "../src/modules/identity/services/permissions.service.js";

async function main() {
  console.log("Connecting to database...");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("🌱 Seeding Clean Database (Single Super Admin only)...");

  const { getNextSequence } = schema;

  // 1. Company Settings
  let existingSettings = await schema.companySettingsTable.findOne();
  if (!existingSettings) {
    const nextId = await getNextSequence("settings");
    existingSettings = await schema.companySettingsTable.create({
      id: nextId,
      companyName: "Nidhi Info Tech Pvt. Ltd.",
      website: "https://nidhiinfotech.com",
      logoUrl: "/logo.png",
      faviconUrl: "/favicon.png",
    });
    console.log("✓ Created company settings: Nidhi Info Tech Pvt. Ltd.");
  } else {
    await schema.companySettingsTable.updateOne(
      { id: existingSettings.id },
      {
        $set: {
          companyName: "Nidhi Info Tech Pvt. Ltd.",
          website: "https://nidhiinfotech.com",
          logoUrl: "/logo.png",
          faviconUrl: "/favicon.png",
        },
      }
    );
    console.log("✓ Updated company settings");
  }

  // 2. Super Admin User Only
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
      status: "active",
    });
    console.log("✓ Created single super admin: admin@agency.com / Admin@123");
  } else {
    console.log("✓ Super admin already exists: admin@agency.com");
  }

  // 3. Ensure role templates & permissions for super admin
  console.log("⚙️  Configuring role templates and permissions...");
  await ensureDefaultRoleTemplates();
  await backfillSystemTemplatePermissions();
  await assignRoleTemplatesToUsers();

  console.log("\n=======================================================");
  console.log("🎉 SEED COMPLETE — CLEAN DATABASE WITH 1 SUPER ADMIN");
  console.log("Email:    admin@agency.com");
  console.log("Password: Admin@123");
  console.log("Role:     super_admin");
  console.log("=======================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error during seed:", err);
  process.exit(1);
});
