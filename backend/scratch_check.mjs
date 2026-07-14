import "./load-env.js";
import { projectsTable, usersTable, clientsTable, clientTeamMembersTable, apkReleasesTable } from "./src/models/schema/index.js";
import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.DATABASE_URL);
  const user = await usersTable.findOne({ name: 'Deepak Narvariya' });
  if (!user) return console.log("User not found");
  const teamMember = await clientTeamMembersTable.findOne({ userId: user.id });
  const companyId = teamMember ? teamMember.clientCompanyId : (await clientsTable.findOne({ userId: user.id }))?.id;
  const company = await clientsTable.findOne({ id: companyId });
  const projects = await projectsTable.find({ $or: [{companyId: company.id}, {clientId: company.id}] });
  
  console.log('User:', user.id, 'Role:', user.role);
  console.log('Company:', company.companyName);
  console.log('Projects:', projects.map(p => ({ id: p.id, name: p.name })));
  
  for (const p of projects) {
    const apks = await apkReleasesTable.find({ projectId: p.id });
    console.log(`Project ${p.id} APKs count: ${apks.length}`);
    apks.forEach(apk => console.log(` - [${apk.id}] ${apk.name} (Audience: ${apk.audience})`));
  }
  process.exit(0);
}
run();
