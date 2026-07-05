/**
 * Merge legacy SalesCustomers into Clients (single schema).
 * Remaps customerId on billing records to canonical Clients.id, then drops salescustomers.
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import { clientsTable, getNextSequence } from "../src/models/schema/index.js";

const BILLING_COLLECTIONS = ["salesinvoices", "salespayments", "salesproposals", "salesinstallments"];

async function remapCollection(db, collName, idMap) {
  let remapped = 0;
  for (const [oldId, newId] of idMap) {
    if (oldId === newId) continue;
    const result = await db.collection(collName).updateMany(
      { customerId: oldId },
      { $set: { customerId: newId } },
    );
    remapped += result.modifiedCount;
  }
  return remapped;
}

async function main() {
  await whenDatabaseReady();
  const db = mongoose.connection.db;
  const salesCustomersColl = db.collection("salescustomers");
  const legacyRows = await salesCustomersColl.find({}).sort({ id: 1 }).toArray();

  if (!legacyRows.length) {
    console.log("No legacy SalesCustomers rows — nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const idMap = new Map();

  for (const sc of legacyRows) {
    let clientId = sc.clientId ?? null;

    if (clientId) {
      const client = await clientsTable.findOne({ id: clientId }).lean();
      if (!client) {
        console.warn(`Skipping sales customer #${sc.id}: linked client #${clientId} missing`);
        idMap.set(sc.id, sc.id);
        continue;
      }
      await clientsTable.updateOne(
        { id: clientId },
        {
          $set: {
            ...(sc.leadId != null ? { leadId: sc.leadId } : {}),
            ...(sc.type ? { customerType: sc.type } : {}),
            ...(sc.assignedAdminId != null ? { assignedAdminId: sc.assignedAdminId } : {}),
          },
        },
      );
      idMap.set(sc.id, clientId);
      console.log(`Linked sales customer #${sc.id} → client #${clientId}`);
      continue;
    }

    const email = String(sc.email ?? "").toLowerCase();
    let client = email ? await clientsTable.findOne({ email }).lean() : null;
    if (!client) {
      const newId = await getNextSequence("clients");
      client = (
        await clientsTable.create({
          id: newId,
          companyName: sc.companyName,
          contactPerson: sc.contactPerson,
          email,
          phone: sc.phone ?? null,
          address: sc.location ?? null,
          gstNumber: sc.gstin ?? null,
          website: sc.website ?? null,
          status: sc.status ?? "active",
          customerType: sc.type ?? "corporate",
          leadId: sc.leadId ?? null,
          assignedAdminId: sc.assignedAdminId ?? null,
          portalLogin: Boolean(sc.portalUserId),
          userId: sc.portalUserId ?? null,
          clientSince: sc.createdAt ?? new Date(),
        })
      ).toObject();
      console.log(`Created client #${newId} from sales-only customer #${sc.id}`);
    } else {
      await clientsTable.updateOne(
        { id: client.id },
        {
          $set: {
            ...(sc.leadId != null ? { leadId: sc.leadId } : {}),
            ...(sc.type ? { customerType: sc.type } : {}),
            ...(sc.assignedAdminId != null ? { assignedAdminId: sc.assignedAdminId } : {}),
          },
        },
      );
      console.log(`Matched sales customer #${sc.id} to existing client #${client.id} by email`);
    }
    idMap.set(sc.id, client.id);
  }

  for (const coll of BILLING_COLLECTIONS) {
    const n = await remapCollection(db, coll, idMap);
    if (n) console.log(`Remapped ${n} ${coll} customerId references`);
  }

  for (const [oldId, newId] of idMap) {
    if (oldId === newId) continue;
    await db.collection("salesleads").updateMany({ customerId: oldId }, { $set: { customerId: newId, clientId: newId } });
    await db.collection("salesleads").updateMany({ clientId: oldId }, { $set: { clientId: newId } });
  }

  await salesCustomersColl.drop();
  console.log(`Migration complete. Dropped salescustomers (${legacyRows.length} legacy rows processed).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
