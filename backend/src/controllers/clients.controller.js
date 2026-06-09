import { clientsTable, usersTable, getNextSequence } from "../models/schema/index.js";
import { formatCompanyRecord, formatCompanyRecordsBatch } from "../mappers/company-format.js";
import { attachPresenceToUser } from "../services/presence.js";
import { toIso } from "../utils/mongo-list.js";
import {
  createClientPortalUser,
  updateClientPortalEmail,
  updateClientPortalPassword
} from "../services/client-portal.js";
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
function portalAvatarFromUser(portalUser) {
  const url = typeof portalUser?.avatarUrl === "string" ? portalUser.avatarUrl.trim() : "";
  return url || null;
}
function enrichClientPortalPresence(clientRecord, portalUser) {
  if (!clientRecord.userId || !portalUser) {
    return {
      ...clientRecord,
      portalEmail: null,
      portalLastLoginAt: null,
      portalLastSeenAt: null,
      portalPresenceStatus: "offline",
      portalIsActiveNow: false,
      portalAvatarUrl: null
    };
  }
  const withPresence = attachPresenceToUser({
    id: portalUser.id,
    lastLoginAt: toIso(portalUser.lastLoginAt),
    lastSeenAt: toIso(portalUser.lastSeenAt)
  });
  return {
    ...clientRecord,
    portalEmail: portalUser.email ?? null,
    portalLastLoginAt: withPresence.lastLoginAt ?? null,
    portalLastSeenAt: withPresence.lastSeenAt ?? null,
    portalPresenceStatus: withPresence.presenceStatus,
    portalIsActiveNow: withPresence.isActiveNow,
    portalAvatarUrl: portalAvatarFromUser(portalUser)
  };
}
async function enrichClientsBatch(clients) {
  const userIds = [...new Set(clients.map((c) => c.userId).filter((id) => id != null && id > 0))];
  if (!userIds.length) {
    return clients.map((c) => enrichClientPortalPresence(c, null));
  }
  const users = await usersTable
    .find({ id: { $in: userIds } })
    .select({ id: 1, email: 1, lastLoginAt: 1, lastSeenAt: 1, avatarUrl: 1 })
    .lean();
  const userById = new Map(users.map((u) => [u.id, u]));
  return clients.map((c) => enrichClientPortalPresence(c, userById.get(c.userId) ?? null));
}
async function formatClient(client) {
  const base = await formatCompanyRecord(client);
  if (!base.userId) return enrichClientPortalPresence(base, null);
  const portalUser = await usersTable
    .findOne({ id: base.userId })
    .select({ id: 1, email: 1, lastLoginAt: 1, lastSeenAt: 1, avatarUrl: 1 })
    .lean();
  return enrichClientPortalPresence(base, portalUser);
}
async function getClients(req, res) {
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
  const clients = await enrichClientsBatch(formatted);
  res.json({ clients, total, page: pageNum, limit: limitNum });
}
async function postClients(req, res) {
  const body = req.body;
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
  let userId = null;
  try {
    userId = await createClientPortalUser({
      name: contactPerson,
      email: loginEmail,
      password,
      setByUserId: req.user.id,
      setByLabel: req.user.name
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
        businessId: optionalString(body.businessId)
      }),
      logoUrl: optionalString(body.logoUrl),
      industry: optionalString(body.industry),
      website: optionalString(body.website),
      tier: optionalString(body.tier) ?? "Standard",
      status: optionalString(body.status) ?? "active",
      portalLogin: true,
      userId
    });
    res.status(201).json(await formatClient(client));
  } catch (err) {
    if (userId) await usersTable.deleteOne({ id: userId });
    throw err;
  }
}
async function getClientsById(req, res) {
  const id = parseIdParam(req.params.id, "client id");
  const client = await clientsTable.findOne({ id });
  if (!client) notFound("Client company");
  res.json(await formatClient(client));
}
async function patchClientsById(req, res) {
  const id = parseIdParam(req.params.id, "client id");
  const body = req.body;
  const existing = await clientsTable.findOne({ id });
  if (!existing) notFound("Client company");
  const gstNumber = body.gstNumber !== void 0 || body.businessId !== void 0 ? resolveGstNumber({
    gstNumber: optionalString(body.gstNumber),
    businessId: optionalString(body.businessId)
  }) : void 0;
  const portalEmail = optionalString(body.portalEmail);
  const password = optionalString(body.password);
  if (portalEmail && existing.userId) {
    await updateClientPortalEmail({ userId: existing.userId, email: portalEmail });
  }
  if (password) {
    if (existing.userId) {
      await updateClientPortalPassword({
        userId: existing.userId,
        password,
        setByUserId: req.user.id,
        setByLabel: req.user.name
      });
    } else {
      const email = optionalString(body.email);
      const loginEmail = (portalEmail ?? email ?? existing.email).toLowerCase();
      const userId = await createClientPortalUser({
        name: optionalString(body.contactPerson) ?? existing.contactPerson,
        email: loginEmail,
        password,
        setByUserId: req.user.id,
        setByLabel: req.user.name
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
        ...gstNumber !== void 0 ? { gstNumber } : {},
        logoUrl: optionalString(body.logoUrl),
        industry: optionalString(body.industry),
        website: optionalString(body.website),
        tier: optionalString(body.tier),
        status: optionalString(body.status)
      }
    },
    { new: true }
  );
  if (!client) notFound("Client company");
  res.json(await formatClient(client));
}
export {
  getClients,
  getClientsById,
  patchClientsById,
  postClients
};
