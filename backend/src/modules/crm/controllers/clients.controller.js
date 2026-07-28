import { clientsTable, usersTable, projectsTable } from "../../../models/schema/index.js";
import { formatCompanyRecord, formatCompanyRecordsBatch } from "../../../mappers/company-format.js";
import { attachPresenceToUser } from "../../monitoring/services/presence.js";
import { toIso } from "../../../utils/mongo-list.js";
import {
  updateClientPortalEmail,
  updateClientPortalPassword,
} from "../../identity/services/client-portal.js";
import {
  createClientCompanyRecord,
  enablePortalForClientCompany,
  deleteClientCompany,
  syncPortalEmailIfLinked,
} from "../../identity/services/client-company-provision.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import { assertCompanyAccess } from "../../access/services/access-helpers.js";
import { getAccessibleCompanyIds, applyIdScope } from "../../access/services/list-scope.js";

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
      portalAvatarUrl: null,
    };
  }
  const withPresence = attachPresenceToUser({
    id: portalUser.id,
    lastLoginAt: toIso(portalUser.lastLoginAt),
    lastSeenAt: toIso(portalUser.lastSeenAt),
  });
  return {
    ...clientRecord,
    portalEmail: portalUser.email ?? null,
    portalLastLoginAt: withPresence.lastLoginAt ?? null,
    portalLastSeenAt: withPresence.lastSeenAt ?? null,
    portalPresenceStatus: withPresence.presenceStatus,
    portalIsActiveNow: withPresence.isActiveNow,
    portalAvatarUrl: portalAvatarFromUser(portalUser),
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

  const companyIds = await getAccessibleCompanyIds(req.user);
  if (!applyIdScope(query, "id", companyIds)) {
    res.json({ clients: [], total: 0, page, limit });
    return;
  }

  // Digital specialists need the client picker to create digital projects.
  // Marketing data remains scoped via project membership on other endpoints.
  const { items, total, page: pageNum, limit: limitNum } = await paginateModel(
    clientsTable,
    query,
    { page, limit, skip },
    { sort: { clientSince: -1 } },
  );
  const formatted = await formatCompanyRecordsBatch(items);
  const clients = await enrichClientsBatch(formatted);
  res.json({ clients, total, page: pageNum, limit: limitNum });
}

async function postClients(req, res) {
  const body = req.body;
  const password = optionalString(body.password);
  if (!password || password.length < 8) {
    badRequest("Portal password is required (at least 8 characters).", "password");
  }
  const { client } = await createClientCompanyRecord({
    companyName: optionalString(body.companyName),
    contactPerson: optionalString(body.contactPerson),
    email: optionalString(body.email),
    enablePortal: true,
    portalEmail: optionalString(body.portalEmail),
    portalPassword: password,
    phone: optionalString(body.phone),
    address: optionalString(body.address),
    gstNumber: optionalString(body.gstNumber),
    businessId: optionalString(body.businessId),
    logoUrl: optionalString(body.logoUrl),
    industry: optionalString(body.industry),
    website: optionalString(body.website),
    tier: optionalString(body.tier),
    status: optionalString(body.status),
    customerType: optionalString(body.customerType),
    createdByUserId: req.user?.id,
    createdByLabel: req.user?.name,
  });
  res.status(201).json(await formatClient(client));
}

async function getClientsById(req, res) {
  const id = parseIdParam(req.params.id, "client id");
  await assertCompanyAccess(req, id);
  const client = await clientsTable.findOne({ id });
  if (!client) notFound("Client company");
  res.json(await formatClient(client));
}

async function patchClientsById(req, res) {
  const id = parseIdParam(req.params.id, "client id");
  const body = req.body;
  let existing = await clientsTable.findOne({ id }).lean();
  if (!existing) notFound("Client company");

  const gstNumber =
    body.gstNumber !== undefined || body.businessId !== undefined
      ? resolveGstNumber({
          gstNumber: optionalString(body.gstNumber),
          businessId: optionalString(body.businessId),
        })
      : undefined;
  const portalEmail = optionalString(body.portalEmail);
  const password = optionalString(body.password);

  if (password && !existing.userId) {
    const enabled = await enablePortalForClientCompany({
      client: existing,
      portalEmail: portalEmail ?? optionalString(body.email) ?? existing.email,
      portalPassword: password,
      contactPerson: optionalString(body.contactPerson) ?? existing.contactPerson,
      createdByUserId: req.user.id,
      createdByLabel: req.user.name,
    });
    existing = enabled.client;
  } else {
    if (portalEmail && existing.userId) {
      await updateClientPortalEmail({ userId: existing.userId, email: portalEmail });
    }
    if (password && existing.userId) {
      await updateClientPortalPassword({
        userId: existing.userId,
        password,
        setByUserId: req.user.id,
        setByLabel: req.user.name,
      });
    }
  }

  const newContactEmail =
    body.email !== undefined ? optionalString(body.email)?.toLowerCase() : undefined;
  if (newContactEmail && existing.userId && newContactEmail !== existing.email) {
    await syncPortalEmailIfLinked({
      userId: existing.userId,
      oldContactEmail: existing.email,
      newContactEmail,
    });
  }

  const patchSet = {
    companyName: optionalString(body.companyName),
    contactPerson: optionalString(body.contactPerson),
    phone: optionalString(body.phone),
    address: optionalString(body.address),
    ...gstNumber !== undefined ? { gstNumber } : {},
    logoUrl: optionalString(body.logoUrl),
    industry: optionalString(body.industry),
    website: optionalString(body.website),
    tier: optionalString(body.tier),
    status: optionalString(body.status),
    customerType: optionalString(body.customerType),
  };
  if (newContactEmail !== undefined) patchSet.email = newContactEmail;

  const client = await clientsTable.findOneAndUpdate(
    { id },
    { $set: patchSet },
    { new: true },
  );
  if (!client) notFound("Client company");
  res.json(await formatClient(client));
}

async function deleteClientsById(req, res) {
  const id = parseIdParam(req.params.id, "client id");
  const client = await clientsTable.findOne({ id }).lean();
  if (!client) notFound("Client company");
  await deleteClientCompany(client);
  res.json({ success: true });
}

async function getClientsSummary(req, res) {
  const query = {};
  const companyIds = await getAccessibleCompanyIds(req.user);
  if (!applyIdScope(query, "id", companyIds)) {
    res.json({ total: 0, active: 0, inactive: 0, activeProjects: 0 });
    return;
  }

  const [statusRow] = await clientsTable.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] } },
      },
    },
  ]);

  const scopedIds = companyIds === null ? null : companyIds;

  let activeProjects = 0;
  if (scopedIds === null) {
    activeProjects = await projectsTable.countDocuments({ status: "in_progress" });
  } else if (scopedIds.length) {
    activeProjects = await projectsTable.countDocuments({
      status: "in_progress",
      $or: [{ companyId: { $in: scopedIds } }, { clientId: { $in: scopedIds } }],
    });
  }

  res.json({
    total: statusRow?.total ?? 0,
    active: statusRow?.active ?? 0,
    inactive: statusRow?.inactive ?? 0,
    activeProjects,
  });
}

export {
  getClients,
  getClientsSummary,
  getClientsById,
  patchClientsById,
  postClients,
  deleteClientsById,
};
