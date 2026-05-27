import {
  clientsTable,
  projectsTable,
  ticketsTable,
  usersTable,
  getNextSequence
} from "../models/schema/index.js";
import {
  formatCompanyRecord,
  formatCompanyRecordsBatch,
  getCompanyActivity,
} from "../mappers/company-format.js";
import { formatProject } from "../mappers/project-format.js";
import { createClientPortalUser } from "../services/client-portal.js";
import { assertCompanyAccess } from "../services/access/access-helpers.js";
import { paginateModel } from "../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString
} from "../utils/route-errors.js";
function resolveGstNumber(body) {
  const value = body.gstNumber ?? body.businessId;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || void 0;
}
async function getCompanies(req, res) {
  const { status, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (status) query.status = status;
  if (search?.trim()) query.companyName = { $regex: search.trim(), $options: "i" };
  const { items, total, page: pageNum, limit: limitNum } = await paginateModel(
    clientsTable,
    query,
    { page, limit, skip },
    { sort: { clientSince: -1 } }
  );
  const formatted = await formatCompanyRecordsBatch(items);
  res.json({ companies: formatted, clients: formatted, total, page: pageNum, limit: limitNum });
}
async function postCompanies(req, res) {
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
    companyCode
  } = req.body;
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
  let userId = null;
  try {
    userId = await createClientPortalUser({
      name: contact,
      email: loginEmail,
      password: pwd,
      setByUserId: req.user.id,
      setByLabel: req.user.name
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
      status: optionalString(status) ?? "active",
      portalLogin: true,
      userId,
      createdBy: req.user.id
    });
    res.status(201).json(await formatCompanyRecord(company));
  } catch (err) {
    if (userId) await usersTable.deleteOne({ id: userId });
    throw err;
  }
}
async function getCompaniesById(req, res) {
  const id = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, id);
  const company = await clientsTable.findOne({ id });
  if (!company) notFound("Company");
  res.json(await formatCompanyRecord(company));
}
async function patchCompaniesById(req, res) {
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
    documents
  } = req.body;
  const gstNumber = gstNumberBody !== void 0 || legacyBusinessId !== void 0 ? resolveGstNumber({ gstNumber: gstNumberBody, businessId: legacyBusinessId }) : void 0;
  const company = await clientsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        companyName,
        companyCode,
        contactPerson,
        primaryContact,
        email: email ? String(email).toLowerCase() : void 0,
        phone,
        address,
        ...gstNumber !== void 0 ? { gstNumber } : {},
        logoUrl: logoUrl ?? logo,
        logo: logo ?? logoUrl,
        industry,
        website,
        tier,
        status,
        contacts,
        documents
      }
    },
    { new: true }
  );
  if (!company) notFound("Company");
  res.json(await formatCompanyRecord(company));
}
async function getCompaniesByIdProjects(req, res) {
  const companyId = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, companyId);
  const projects = await projectsTable.find({ $or: [{ companyId }, { clientId: companyId }] }).sort({ createdAt: -1 }).lean();
  const formatted = await Promise.all(
    projects.map((p) => formatProject(p))
  );
  res.json({ projects: formatted, total: formatted.length });
}
async function getCompaniesByIdTickets(req, res) {
  const companyId = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, companyId);
  const tickets = await ticketsTable.find({ companyId }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ tickets, total: tickets.length });
}
async function getCompaniesByIdActivity(req, res) {
  const companyId = parseIdParam(req.params.id, "company id");
  await assertCompanyAccess(req, companyId);
  const activity = await getCompanyActivity(companyId);
  res.json({ activity });
}
export {
  getCompanies,
  getCompaniesById,
  getCompaniesByIdActivity,
  getCompaniesByIdProjects,
  getCompaniesByIdTickets,
  patchCompaniesById,
  postCompanies
};
