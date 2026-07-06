import {
  clientsTable,
  usersTable,
  commentsTable,
  credentialHistoryTable,
  SalesProposals,
  SalesInvoices,
  SalesInstallments,
  SalesPayments,
  projectsTable,
  getNextSequence,
} from "../models/schema/index.js";
import { createClientPortalUser, updateClientPortalEmail } from "./client-portal.js";
import {
  DIRECT_THREAD_TYPE,
  getOrCreateDirectConversation,
} from "./direct-conversations.js";
import { customerProposalOwnershipFilter } from "../utils/sales-proposal-links.js";
import { logger } from "../lib/logger.js";
import { HttpError } from "../lib/http-error.js";
import { duplicateKeyToHttpError } from "../utils/mongo-duplicate-error.js";

function optionalString(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function resolveGstNumber(gstNumber, businessId) {
  const value = gstNumber ?? businessId;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

/** Only sync portal login when it was the same as the billing/contact email. */
export function shouldSyncPortalEmailWithContact(contactEmail, portalEmail) {
  if (!contactEmail || !portalEmail) return false;
  return contactEmail.toLowerCase() === portalEmail.toLowerCase();
}

export async function loadPortalUserEmail(userId) {
  if (!userId) return null;
  const user = await usersTable.findOne({ id: userId }).select({ email: 1 }).lean();
  return user?.email?.toLowerCase() ?? null;
}

/**
 * When contact email changes, update portal login only if portal email matched the old contact email.
 */
export async function syncPortalEmailIfLinked({ userId, oldContactEmail, newContactEmail }) {
  if (!userId || !newContactEmail) return;
  const portalEmail = await loadPortalUserEmail(userId);
  if (!portalEmail || !shouldSyncPortalEmailWithContact(oldContactEmail, portalEmail)) return;
  await updateClientPortalEmail({ userId, email: newContactEmail });
}

export async function assertClientCompanyDeletable(client) {
  const id = client.id;
  const [proposals, invoices, installments, payments, projects] = await Promise.all([
    SalesProposals.countDocuments(customerProposalOwnershipFilter(id, client.leadId)),
    SalesInvoices.countDocuments({ customerId: id }),
    SalesInstallments.countDocuments({ customerId: id }),
    SalesPayments.countDocuments({ customerId: id }),
    projectsTable.countDocuments({ $or: [{ companyId: id }, { clientId: id }] }),
  ]);
  if (proposals + invoices + installments + payments + projects > 0) {
    throw new HttpError(
      400,
      "Cannot delete a company with billing history or projects. Set status to inactive instead.",
      { code: "VALIDATION_ERROR", field: "clientId" },
    );
  }
}

/** Unified delete: guard billing/projects, remove client row and portal user. */
export async function deleteClientCompany(client) {
  await assertClientCompanyDeletable(client);
  await clientsTable.deleteOne({ id: client.id });
  if (client.userId) {
    await credentialHistoryTable.deleteMany({ userId: client.userId }).catch(() => {});
    await usersTable.deleteOne({ id: client.userId }).catch(() => {});
  }
  return { success: true };
}

/** Staff user who should own the 1:1 client discussion channel. */
export function resolveDiscussionStaffUserId({ assignedAdminId, createdByUserId, portalUserId }) {
  for (const id of [assignedAdminId, createdByUserId]) {
    const staffId = Number(id);
    if (!Number.isFinite(staffId) || staffId <= 0) continue;
    if (staffId === portalUserId) continue;
    return staffId;
  }
  return null;
}

async function persistDirectConversationId(clientId, directConversationId) {
  if (!clientId || !directConversationId) return;
  await clientsTable.updateOne({ id: clientId }, { $set: { directConversationId } });
}

/**
 * Open a direct 1:1 discussion between staff and the client portal account.
 * Only runs when callers pass bootstrapDiscussion: true (e.g. POST .../bootstrap-discussion).
 */
export async function bootstrapClientDirectDiscussion({
  staffUserId,
  portalUserId,
  companyName,
  welcomeAuthorId,
  clientId,
}) {
  const resolvedStaffId = Number(staffUserId);
  const resolvedPortalId = Number(portalUserId);
  if (!resolvedStaffId || !resolvedPortalId || resolvedStaffId === resolvedPortalId) {
    logger.warn(
      { staffUserId, portalUserId, clientId },
      "Skipped client discussion bootstrap: invalid or matching staff/portal user ids",
    );
    return null;
  }

  const conversation = await getOrCreateDirectConversation(resolvedStaffId, resolvedPortalId);
  if (!conversation?.id) return null;

  const existingMessages = await commentsTable.countDocuments({
    threadType: DIRECT_THREAD_TYPE,
    threadId: conversation.id,
  });

  if (existingMessages === 0 && welcomeAuthorId) {
    const nextCommentId = await getNextSequence("comments");
    await commentsTable.create({
      id: nextCommentId,
      authorId: welcomeAuthorId,
      threadType: DIRECT_THREAD_TYPE,
      threadId: conversation.id,
      content: `Welcome! This channel is for direct communication with ${companyName}.`,
      parentId: null,
      mentionedUserIds: [],
    });
  }

  if (clientId) {
    await persistDirectConversationId(clientId, conversation.id);
  }

  return conversation.id;
}

export async function createClientCompanyRecord(params) {
  const companyName = optionalString(params.companyName);
  const contactPerson = optionalString(params.contactPerson);
  const email = optionalString(params.email);
  if (!companyName) {
    throw new HttpError(400, "Company name is required.", { code: "VALIDATION_ERROR", field: "companyName" });
  }
  if (!contactPerson) {
    throw new HttpError(400, "Contact person is required.", { code: "VALIDATION_ERROR", field: "contactPerson" });
  }
  if (!email) {
    throw new HttpError(400, "Email is required.", { code: "VALIDATION_ERROR", field: "email" });
  }

  const contactEmail = email.toLowerCase();
  const enablePortal =
    params.enablePortal === false
      ? false
      : params.enablePortal === true || Boolean(optionalString(params.portalPassword));
  const portalEmail = (optionalString(params.portalEmail) ?? contactEmail).toLowerCase();
  const portalPassword = optionalString(params.portalPassword);

  if (enablePortal && (!portalPassword || portalPassword.length < 8)) {
    throw new HttpError(400, "Portal password must be at least 8 characters when portal access is enabled.", {
      code: "VALIDATION_ERROR",
      field: "password",
    });
  }

  const duplicate = await clientsTable
    .findOne({ email: contactEmail })
    .select({ id: 1, companyName: 1 })
    .lean();
  if (duplicate) {
    throw new HttpError(
      409,
      `Contact email "${contactEmail}" is already used by "${duplicate.companyName}" (company #${duplicate.id}). Open Customers or Companies.`,
      { code: "CONFLICT", field: "email" },
    );
  }

  if (enablePortal) {
    const portalDup = await usersTable
      .findOne({ email: portalEmail })
      .select({ id: 1, role: 1 })
      .lean();
    if (portalDup) {
      throw new HttpError(
        409,
        `Portal login email "${portalEmail}" is already registered (${portalDup.role} account, user #${portalDup.id}).`,
        { code: "CONFLICT", field: "portalEmail" },
      );
    }
  }

  let portalUserId = null;
  let clientId = null;

  try {
    if (enablePortal) {
      portalUserId = await createClientPortalUser({
        name: contactPerson,
        email: portalEmail,
        password: portalPassword,
        setByUserId: params.createdByUserId,
        setByLabel: params.createdByLabel,
      });
    }

    clientId = await getNextSequence("clients");
    const assignedAdminId =
      params.assignedAdminId != null ? Number(params.assignedAdminId) : null;
    const companyCode = optionalString(params.companyCode);
    const client = await clientsTable.create({
      id: clientId,
      companyName,
      ...(companyCode ? { companyCode } : {}),
      contactPerson,
      primaryContact: optionalString(params.primaryContact) ?? contactPerson,
      email: contactEmail,
      phone: optionalString(params.phone),
      address: optionalString(params.address),
      gstNumber: resolveGstNumber(params.gstNumber, params.businessId),
      logoUrl: optionalString(params.logoUrl),
      logo: optionalString(params.logo),
      industry: optionalString(params.industry),
      website: optionalString(params.website),
      tier: optionalString(params.tier) ?? "Standard",
      status: optionalString(params.status) ?? "active",
      customerType: optionalString(params.customerType) ?? "corporate",
      leadId: params.leadId != null ? Number(params.leadId) : null,
      assignedAdminId: Number.isFinite(assignedAdminId) ? assignedAdminId : null,
      portalLogin: enablePortal,
      userId: portalUserId,
      createdBy: params.createdByUserId ?? null,
    });

    let directConversationId = null;
    if (enablePortal && portalUserId && params.bootstrapDiscussion === true) {
      const discussionStaffUserId = resolveDiscussionStaffUserId({
        assignedAdminId: client.assignedAdminId,
        createdByUserId: params.createdByUserId,
        portalUserId,
      });
      if (discussionStaffUserId) {
        try {
          directConversationId = await bootstrapClientDirectDiscussion({
            staffUserId: discussionStaffUserId,
            portalUserId,
            companyName,
            welcomeAuthorId: params.createdByUserId ?? discussionStaffUserId,
            clientId,
          });
        } catch (err) {
          logger.error(
            { err, clientId, portalUserId, discussionStaffUserId },
            "Client company created but direct discussion bootstrap failed",
          );
        }
      } else {
        logger.warn(
          { clientId, portalUserId, createdBy: params.createdByUserId },
          "Portal enabled but no valid staff user for discussion bootstrap",
        );
      }
    }

    const clientObj = client.toObject();
    if (directConversationId) clientObj.directConversationId = directConversationId;

    return {
      client: clientObj,
      portalUserId,
      directConversationId,
    };
  } catch (err) {
    if (clientId) await clientsTable.deleteOne({ id: clientId }).catch(() => {});
    if (portalUserId) await usersTable.deleteOne({ id: portalUserId }).catch(() => {});
    if (err instanceof HttpError) throw err;
    const dupErr = duplicateKeyToHttpError(err);
    if (dupErr) throw dupErr;
    throw err;
  }
}

export async function enablePortalForClientCompany(params) {
  const client = params.client;
  if (client.userId) {
    throw new HttpError(400, "This company already has portal access.", { code: "VALIDATION_ERROR", field: "portal" });
  }

  const portalEmail = optionalString(params.portalEmail ?? client.email);
  const portalPassword = optionalString(params.portalPassword);
  if (!portalEmail) {
    throw new HttpError(400, "Portal login email is required.", { code: "VALIDATION_ERROR", field: "portalEmail" });
  }
  if (!portalPassword || portalPassword.length < 8) {
    throw new HttpError(400, "Portal password must be at least 8 characters.", { code: "VALIDATION_ERROR", field: "password" });
  }

  const portalDup = await usersTable.findOne({ email: portalEmail.toLowerCase() }).select({ id: 1 }).lean();
  if (portalDup) {
    throw new HttpError(
      409,
      `Portal login email "${portalEmail}" is already registered to another user account.`,
      { code: "CONFLICT", field: "portalEmail" },
    );
  }

  let portalUserId = null;
  try {
    portalUserId = await createClientPortalUser({
      name: optionalString(params.contactPerson) ?? client.contactPerson,
      email: portalEmail,
      password: portalPassword,
      setByUserId: params.createdByUserId,
      setByLabel: params.createdByLabel,
    });

    const setFields = {
      portalLogin: true,
      userId: portalUserId,
      industry: optionalString(params.industry) ?? client.industry ?? null,
      primaryContact: client.primaryContact ?? client.contactPerson,
    };
    if (optionalString(params.companyName)) {
      setFields.companyName = optionalString(params.companyName);
    }

    const updated = await clientsTable
      .findOneAndUpdate({ id: client.id }, { $set: setFields }, { new: true })
      .lean();

    let directConversationId = updated.directConversationId ?? null;
    if (params.bootstrapDiscussion === true && !directConversationId) {
      const discussionStaffUserId = resolveDiscussionStaffUserId({
        assignedAdminId: updated.assignedAdminId,
        createdByUserId: params.createdByUserId,
        portalUserId,
      });
      if (discussionStaffUserId) {
        try {
          directConversationId = await bootstrapClientDirectDiscussion({
            staffUserId: discussionStaffUserId,
            portalUserId,
            companyName: updated.companyName,
            welcomeAuthorId: params.createdByUserId ?? discussionStaffUserId,
            clientId: client.id,
          });
        } catch (err) {
          logger.error(
            { err, clientId: client.id, portalUserId, discussionStaffUserId },
            "Portal enabled but direct discussion bootstrap failed",
          );
        }
      }
    }

    if (directConversationId && !updated.directConversationId) {
      updated.directConversationId = directConversationId;
    }

    return { client: updated, portalUserId, directConversationId };
  } catch (err) {
    if (portalUserId) await usersTable.deleteOne({ id: portalUserId }).catch(() => {});
    if (err instanceof HttpError) throw err;
    const dupErr = duplicateKeyToHttpError(err);
    if (dupErr) throw dupErr;
    throw err;
  }
}
