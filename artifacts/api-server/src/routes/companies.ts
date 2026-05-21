import { Router } from "express";
import {
  clientsTable,
  projectsTable,
  ticketsTable,
  usersTable,
  getNextSequence,
} from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";
import { formatCompanyRecord, getCompanyActivity } from "../lib/company-format";
import { formatProject } from "../lib/project-format";
import { createClientPortalUser } from "../lib/client-portal";
import { assertCompanyAccess } from "../lib/access-helpers";
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

// GET /api/companies
router.get("/companies", requireAuth, async (req, res) => {
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
    items.map((c) => formatCompanyRecord(c as Parameters<typeof formatCompanyRecord>[0])),
  );
  res.json({ companies: formatted, clients: formatted, total, page: pageNum, limit: limitNum });
});

// POST /api/companies
router.post("/companies", requireAuth, requireRole("super_admin"), async (req, res) => {
  const {
    companyName,
    contactPerson,
    primaryContact,
    email,
    portalEmail,
    password,
    phone,
    address,
    gstNumber: gstNumberBody,
    businessId: legacyBusinessId,
    logoUrl,
    logo,
    status,
    industry,
    website,
    tier,
    companyCode,
  } = req.body as {
    companyName: string;
    contactPerson: string;
    primaryContact?: string;
    email: string;
    portalEmail?: string;
    password?: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
    businessId?: string;
    logoUrl?: string;
    logo?: string;
    status?: "active" | "inactive" | "on_hold";
    industry?: string;
    website?: string;
    tier?: string;
    companyCode?: string;
  };

  const coName = optionalString(companyName);
  const contact = optionalString(contactPerson);
  const mail = optionalString(email);
  const pwd = optionalString(password);
  if (!coName) badRequest("Company name is required.", "companyName");
  if (!contact) badRequest("Contact person is required.", "contactPerson");
  if (!mail) badRequest("Company contact email is required.", "email");
  if (!pwd || pwd.length < 8) {
    badRequest("Portal password is required (at least 8 characters).", "password");
  }
  
  const loginEmail = (optionalString(portalEmail) ?? mail).toLowerCase();

  let userId: number | null = null;
  try {
    userId = await createClientPortalUser({
      name: contact,
      email: loginEmail,
      password: pwd!,
      setByUserId: req.user!.id,
      setByLabel: req.user!.name,
    });

    const nextId = await getNextSequence("clients");
    const company = await clientsTable.create({
      id: nextId,
      companyName: coName,
      companyCode: optionalString(companyCode),
      contactPerson: contact,
      primaryContact: optionalString(primaryContact) ?? contact,
      email: mail.toLowerCase(),
      phone: optionalString(phone),
      address: optionalString(address),
      gstNumber: resolveGstNumber({ gstNumber: gstNumberBody, businessId: legacyBusinessId }),
      logoUrl: logoUrl ?? logo,
      logo: logo ?? logoUrl,
      industry: optionalString(industry),
      website: optionalString(website),
      tier: optionalString(tier) ?? "Standard",
      status: (optionalString(status) as "active" | "inactive" | "on_hold") ?? "active",
      portalLogin: true,
      userId,
      createdBy: req.user!.id,
    });

    res.status(201).json(await formatCompanyRecord(company));
  } catch (err) {
    if (userId) await usersTable.deleteOne({ id: userId });
    throw err;
  }
});

// GET /api/companies/:id
router.get("/companies/:id", requireAuth, async (req, res) => {
  const id = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, id);
  const company = await clientsTable.findOne({ id });
  if (!company) notFound("Company");
  res.json(await formatCompanyRecord(company));
});

// PATCH /api/companies/:id
router.patch("/companies/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseIdParam(req.params.id, "company id");
  const {
    companyName,
    contactPerson,
    primaryContact,
    email,
    phone,
    address,
    gstNumber: gstNumberBody,
    businessId: legacyBusinessId,
    logoUrl,
    logo,
    status,
    industry,
    website,
    tier,
    companyCode,
    contacts,
    documents,
  } = req.body;

  const gstNumber =
    gstNumberBody !== undefined || legacyBusinessId !== undefined
      ? resolveGstNumber({ gstNumber: gstNumberBody, businessId: legacyBusinessId })
      : undefined;

  const company = await clientsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        companyName,
        companyCode,
        contactPerson,
        primaryContact,
        email: email ? String(email).toLowerCase() : undefined,
        phone,
        address,
        ...(gstNumber !== undefined ? { gstNumber } : {}),
        logoUrl: logoUrl ?? logo,
        logo: logo ?? logoUrl,
        industry,
        website,
        tier,
        status,
        contacts,
        documents,
      },
    },
    { new: true },
  );

  if (!company) notFound("Company");
  res.json(await formatCompanyRecord(company));
});

// GET /api/companies/:id/projects
router.get("/companies/:id/projects", requireAuth, async (req, res) => {
  const companyId = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, companyId);

  const projects = await projectsTable
    .find({ $or: [{ companyId }, { clientId: companyId }] })
    .sort({ createdAt: -1 })
    .lean();
  const formatted = await Promise.all(
    projects.map((p) => formatProject(p as unknown as Parameters<typeof formatProject>[0])),
  );
  res.json({ projects: formatted, total: formatted.length });
});

// GET /api/companies/:id/tickets
router.get("/companies/:id/tickets", requireAuth, async (req, res) => {
  const companyId = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, companyId);

  const tickets = await ticketsTable
    .find({ companyId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ tickets, total: tickets.length });
}); 
 
// GET /api/companies/:id/activity
router.get("/companies/:id/activity", requireAuth, async (req, res) => {
  const companyId = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, companyId);

  const activity = await getCompanyActivity(companyId);
  res.json({ activity });
});

export default router;
