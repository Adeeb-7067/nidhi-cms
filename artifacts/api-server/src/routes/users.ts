import { Router } from "express";
import { db } from "../lib/db";
import { usersTable, credentialHistoryTable } from "@workspace/db/schema";
import { eq, like, or, and, ne, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { hashPassword, encryptPasswordForHistory } from "../lib/password";
import { generateEmployeeId } from "../lib/employeeId";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    subType: user.subType,
    designation: user.designation,
    avatarUrl: user.avatarUrl,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

// GET /api/users
router.get("/users", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { role, subType, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (role) conditions.push(eq(usersTable.role, role as "super_admin" | "developer" | "client"));
  if (subType) conditions.push(eq(usersTable.subType, subType));
  if (search) conditions.push(or(like(usersTable.name, `%${search}%`), like(usersTable.email, `%${search}%`)));

  const [users, countResult] = await Promise.all([
    db
      .select()
      .from(usersTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(usersTable.createdAt))
      .limit(parseInt(limit))
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  res.json({
    users: users.map(formatUser),
    total: Number(countResult[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// POST /api/users
router.post("/users", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { name, email, password, role, subType, designation, avatarUrl } = req.body as {
    name: string;
    email: string;
    password: string;
    role: "super_admin" | "developer" | "client";
    subType?: string;
    designation?: string;
    avatarUrl?: string;
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "name, email, password, role required" });
    return;
  }

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const employeeId = role === "developer" ? await generateEmployeeId(name) : null;

  const [user] = await db
    .insert(usersTable)
    .values({ name, email: email.toLowerCase(), passwordHash, role, subType: subType ?? null, designation: designation ?? null, avatarUrl: avatarUrl ?? null, employeeId })
    .returning();

  // Save to credential history
  const credCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(credentialHistoryTable)
    .where(eq(credentialHistoryTable.userId, user.id));

  await db.insert(credentialHistoryTable).values({
    userId: user.id,
    entryNumber: Number(credCount[0].count) + 1,
    setByUserId: req.user!.id,
    setByLabel: req.user!.name,
    passwordEncrypted: encryptPasswordForHistory(password),
    trigger: "initial_setup",
    status: "active",
  });

  res.status(201).json(formatUser(user));
});

// GET /api/users/me/password
router.patch("/users/me/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user!.id) });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { verifyPassword } = await import("../lib/password");
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password incorrect" });
    return;
  }
  const hash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password changed" });
});

// GET /api/users/:id
router.get("/users/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, id) });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// PATCH /api/users/:id
router.patch("/users/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const { name, email, subType, designation, avatarUrl, status } = req.body as {
    name?: string;
    email?: string;
    subType?: string;
    designation?: string;
    avatarUrl?: string;
    status?: "active" | "inactive" | "suspended";
  };

  const [user] = await db
    .update(usersTable)
    .set({ name, email, subType, designation, avatarUrl, status, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// DELETE /api/users/:id
router.delete("/users/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  await db.update(usersTable).set({ status: "inactive" }).where(eq(usersTable.id, id));
  res.json({ message: "User deactivated" });
});

// PATCH /api/users/:id/password
router.patch("/users/:id/password", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const { newPassword } = req.body as { newPassword: string };
  if (!newPassword) {
    res.status(400).json({ error: "newPassword required" });
    return;
  }

  const hash = await hashPassword(newPassword);
  const [user] = await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Save to credential history
  const credCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(credentialHistoryTable)
    .where(eq(credentialHistoryTable.userId, id));

  // Expire previous active records
  await db
    .update(credentialHistoryTable)
    .set({ status: "expired", replacedAt: new Date() })
    .where(and(eq(credentialHistoryTable.userId, id), eq(credentialHistoryTable.status, "active")));

  await db.insert(credentialHistoryTable).values({
    userId: id,
    entryNumber: Number(credCount[0].count) + 1,
    setByUserId: req.user!.id,
    setByLabel: req.user!.name,
    passwordEncrypted: encryptPasswordForHistory(newPassword),
    trigger: "admin_reset",
    status: "active",
  });

  res.json({ message: "Password reset" });
});

// GET /api/users/:id/credentials
router.get("/users/:id/credentials", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const records = await db
    .select()
    .from(credentialHistoryTable)
    .where(eq(credentialHistoryTable.userId, id))
    .orderBy(desc(credentialHistoryTable.createdAt));

  res.json(
    records.map((r) => ({
      id: r.id,
      entryNumber: r.entryNumber,
      setBy: r.setByLabel,
      setAt: r.createdAt.toISOString(),
      replacedAt: r.replacedAt?.toISOString() ?? null,
      status: r.status,
      trigger: r.trigger,
    })),
  );
});

export default router;
