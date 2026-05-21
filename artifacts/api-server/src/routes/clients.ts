import { Router } from "express";
import { clientsTable, usersTable, getNextSequence } from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";
import { formatCompanyRecord } from "../lib/company-format";
import {
  createClientPortalUser,
  updateClientPortalPassword,
} from "../lib/client-portal";
import { paginateModel } from "../lib/mongo-list";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../lib/route-errors";
const router = Router();

function resolveGstNumber(body: { gstNumber?: string; businessId?: string }) {
  const value = body.gstNumber ?? body.businessId;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

async function formatClient(client: Parameters<typeof formatCompanyRecord>[0]) {
  return formatCompanyRecord(client);
}

// GET /api/clients
router.get("/clients", requireAuth, async (req, res) => {
  const { status, search } = req.query as Record<string, string>;
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search?.trim()) query.companyName = { $regex: search.trim(), $options: "i" };

  const { items, total, page: pageNum, limit: limitNum } = await paginateModel(
    clientsTable,
    query,
    { page, limit, skip },
    { sort: { clientSince: -1 } },
  );

  const formatted = await Promise.all(
    items.map((c) => formatClient(c as Parameters<typeof formatClient>[0])),
  );
  res.json({ clients: formatted, total, page: pageNum, limit: limitNum });
});

// POST /api/clients
router.post("/clients", requireAuth, requireRole("super_admin"), async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const companyName = optionalString(body.companyName);
  const contactPerson = optionalString(body.contactPerson);
  const email = optionalString(body.email);
  const password = optionalString(body.password);

  if (!companyName) badRequest("Company name is required.", "companyName");
  if (!contactPerson) badRequest("Contact person is required.", "contactPerson");
  if (!email) badRequest("Company contact email is required.", "email");
  if (!password || password.length < 8) {
    badRequest("Portal password is required (at least 8 characters).", "password");
  }

  const loginEmail = (optionalString(body.portalEmail) ?? email).toLowerCase();

  let userId: number | null = null;
  try {
    userId = await createClientPortalUser({
      name: contactPerson,
      email: loginEmail,
      password: password!,
      setByUserId: req.user!.id,
      setByLabel: req.user!.name,
    });

    const nextId = await getNextSequence("clients");
    const client = await clientsTable.create({
      id: nextId,
      companyName,
      contactPerson,
      email: email.toLowerCase(),
      phone: optionalString(body.phone),
      address: optionalString(body.address),
      gstNumber: resolveGstNumber({
        gstNumber: optionalString(body.gstNumber),
        businessId: optionalString(body.businessId),
      }),
      logoUrl: optionalString(body.logoUrl),
      industry: optionalString(body.industry),
      website: optionalString(body.website),
      tier: optionalString(body.tier) ?? "Standard",
      status: (optionalString(body.status) as "active" | "inactive" | "on_hold") ?? "active",
      portalLogin: true,
      userId,
    });

    res.status(201).json(await formatClient(client));
  } catch (err) {
    if (userId) await usersTable.deleteOne({ id: userId });
    throw err;
  }
});

// GET /api/clients/:id
router.get("/clients/:id", requireAuth, async (req, res) => {
  const id = parseIdParam(req.params.id, "client id");
  const client = await clientsTable.findOne({ id });
  if (!client) notFound("Client company");
  res.json(await formatClient(client));
});

// PATCH /api/clients/:id
router.patch("/clients/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseIdParam(req.params.id, "client id");
  const body = req.body as Record<string, unknown>;

  const existing = await clientsTable.findOne({ id });
  if (!existing) notFound("Client company");

  const gstNumber =
    body.gstNumber !== undefined || body.businessId !== undefined
      ? resolveGstNumber({
          gstNumber: optionalString(body.gstNumber),
          businessId: optionalString(body.businessId),
        })
      : undefined;

  const password = optionalString(body.password);
  if (password) {
    if (existing.userId) {
      await updateClientPortalPassword({
        userId: existing.userId,
        password,
        setByUserId: req.user!.id,
        setByLabel: req.user!.name,
      });
    } else {
      const portalEmail = optionalString(body.portalEmail);
      const email = optionalString(body.email);
      const loginEmail = (portalEmail ?? email ?? existing.email).toLowerCase();
      const userId = await createClientPortalUser({
        name: optionalString(body.contactPerson) ?? existing.contactPerson,
        email: loginEmail,
        password,
        setByUserId: req.user!.id,
        setByLabel: req.user!.name,
      });
      await clientsTable.updateOne({ id }, { $set: { userId, portalLogin: true } });
    }
  }

  const client = await clientsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        companyName: optionalString(body.companyName),
        contactPerson: optionalString(body.contactPerson),
        email: optionalString(body.email)?.toLowerCase(),
        phone: optionalString(body.phone),
        address: optionalString(body.address),
        ...(gstNumber !== undefined ? { gstNumber } : {}),
        logoUrl: optionalString(body.logoUrl),
        industry: optionalString(body.industry),
        website: optionalString(body.website),
        tier: optionalString(body.tier),
        status: optionalString(body.status),
      },
    },
    { new: true },
  );

  if (!client) notFound("Client company");
  res.json(await formatClient(client));
});

export default router;
