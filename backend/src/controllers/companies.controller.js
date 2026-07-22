import {
  clientsTable,
  projectsTable,
  ticketsTable,
} from "../models/schema/index.js";
import {
  formatCompanyRecord,
  formatCompanyRecordsBatch,
  getCompanyActivity,
} from "../mappers/company-format.js";
import { formatProject } from "../mappers/project-format.js";
import { createClientCompanyRecord } from "../services/client-company-provision.js";
import { assertCompanyAccess } from "../services/access/access-helpers.js";
import { getAccessibleCompanyIds, applyIdScope } from "../services/access/list-scope.js";
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
  const companyIds = await getAccessibleCompanyIds(req.user);
  if (!applyIdScope(query, "id", companyIds)) {
    res.json({ companies: [], clients: [], total: 0, page, limit });
    return;
  }
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
  const body = req.body;
  const pwd = optionalString(body.password);
  if (!pwd || pwd.length < 8) {
    badRequest("Portal password is required (at least 8 characters).", "password");
  }
  const { client } = await createClientCompanyRecord({
    companyName: optionalString(body.companyName),
    contactPerson: optionalString(body.contactPerson),
    primaryContact: optionalString(body.primaryContact),
    email: optionalString(body.email),
    enablePortal: true,
    portalEmail: optionalString(body.portalEmail),
    portalPassword: pwd,
    phone: optionalString(body.phone),
    address: optionalString(body.address),
    gstNumber: optionalString(body.gstNumber),
    businessId: optionalString(body.businessId),
    logoUrl: body.logoUrl ?? body.logo,
    logo: body.logo ?? body.logoUrl,
    industry: optionalString(body.industry),
    website: optionalString(body.website),
    tier: optionalString(body.tier),
    companyCode: optionalString(body.companyCode),
    status: optionalString(body.status),
    createdByUserId: req.user.id,
    createdByLabel: req.user.name,
  });
  res.status(201).json(await formatCompanyRecord(client));
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
