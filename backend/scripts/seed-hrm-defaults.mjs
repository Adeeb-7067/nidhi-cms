import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import { ensureDefaultRoleTemplates } from "../src/modules/identity/services/permissions.service.js";
import { seedLeaveTypes } from "../src/modules/hrm/services/leave.service.js";
import { seedDefaultShift, listShiftTemplates } from "../src/modules/hrm/services/shifts.service.js";
import { getOrCreateSettings } from "../src/modules/settings/services/company-settings.js";
import { companySettingsTable } from "../src/models/schema/index.js";

async function main() {
  await whenDatabaseReady();
  console.log("Seeding HRM defaults…");
  await ensureDefaultRoleTemplates();
  await seedLeaveTypes();
  const settings = await getOrCreateSettings();
  await seedDefaultShift(settings);
  const templates = await listShiftTemplates();
  const defaultTpl = templates.find((t) => t.isDefault) ?? templates[0];
  if (defaultTpl && !settings.hrmDefaultShiftTemplateId) {
    await companySettingsTable.updateOne(
      { id: settings.id },
      { $set: { hrmDefaultShiftTemplateId: defaultTpl.id } },
    );
    console.log(`Set default shift template id=${defaultTpl.id}`);
  }
  console.log("HRM seed complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
