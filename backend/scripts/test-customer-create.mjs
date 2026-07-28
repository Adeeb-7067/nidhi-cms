import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClientCompanyRecord, deleteClientCompany } from "../src/modules/identity/services/client-company-provision.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.DATABASE_URL);

const stamp = Date.now();
const email = `test-create-${stamp}@example.com`;

try {
  const { client, portalUserId, directConversationId } = await createClientCompanyRecord({
    companyName: `Test Co ${stamp}`,
    contactPerson: "Test User",
    email,
    enablePortal: true,
    portalEmail: email,
    portalPassword: "testpass123",
    assignedAdminId: 1,
    createdByUserId: 1,
    createdByLabel: "Diagnostic",
  });
  console.log("SUCCESS", { clientId: client.id, portalUserId, directConversationId, email });
  await deleteClientCompany({ id: client.id, userId: portalUserId });
  console.log("Cleaned up test customer");
} catch (err) {
  console.error("FAILED", err.statusCode ?? err.code, err.message);
  if (err.field) console.error("field:", err.field);
  process.exitCode = 1;
}

await mongoose.disconnect();
