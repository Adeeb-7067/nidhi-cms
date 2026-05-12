import { Router } from "express";
import { db } from "../lib/db";
import { clientsTable, projectsTable } from "@workspace/db/schema";
import { eq, like, and, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

async function formatClient(client: typeof clientsTable.$inferSelect) {
  const [count] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectsTable)
    .where(and(eq(projectsTable.clientId, client.id), eq(projectsTable.status, "in_progress")));

  return {
    id: client.id,
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone,
    address: client.address,
    businessId: client.businessId,
    logoUrl: client.logoUrl,
    status: client.status,
    portalLogin: client.portalLogin,
    clientSince: client.clientSince.toISOString(),
    userId: client.userId,
    activeProjectCount: Number(count.count),
  };
}

// GET /api/clients
router.get("/clients", requireAuth, async (req, res) => {
  const { status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (status) conditions.push(eq(clientsTable.status, status as "active" | "inactive" | "on_hold"));
  if (search) conditions.push(like(clientsTable.companyName, `%${search}%`));

  const clients = await db
    .select()
    .from(clientsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(clientsTable.clientSince))
    .limit(parseInt(limit))
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clientsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const formatted = await Promise.all(clients.map(formatClient));
  res.json({ clients: formatted, total: Number(countResult.count), page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/clients
router.post("/clients", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { companyName, contactPerson, email, phone, address, businessId, logoUrl, status } = req.body as {
    companyName: string;
    contactPerson: string;
    email: string;
    phone?: string;
    address?: string;
    businessId?: string;
    logoUrl?: string;
    status?: "active" | "inactive" | "on_hold";
  };

  if (!companyName || !contactPerson || !email) {
    res.status(400).json({ error: "companyName, contactPerson, email required" });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({ companyName, contactPerson, email: email.toLowerCase(), phone, address, businessId, logoUrl, status: status ?? "active" })
    .returning();

  res.status(201).json(await formatClient(client));
});

// GET /api/clients/:id
router.get("/clients/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const client = await db.query.clientsTable.findFirst({ where: eq(clientsTable.id, id) });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await formatClient(client));
});

// PATCH /api/clients/:id
router.patch("/clients/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const { companyName, contactPerson, email, phone, address, businessId, logoUrl, status } = req.body;

  const [client] = await db
    .update(clientsTable)
    .set({ companyName, contactPerson, email, phone, address, businessId, logoUrl, status, updatedAt: new Date() })
    .where(eq(clientsTable.id, id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await formatClient(client));
});

export default router;
