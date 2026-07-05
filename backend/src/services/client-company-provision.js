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

async function persistDirectConversationId(clientId, directConversationId) {
  if (!clientId || !directConversationId) return;
  await clientsTable.updateOne({ id: clientId }, { $set: { directConversationId } });
}

/**
 * Open a direct 1:1 discussion between the creating staff user and the client portal account.
 */
export async function bootstrapClientDirectDiscussion({
  staffUserId,
  portalUserId,
  companyName,
  welcomeAuthorId,
  clientId,
}) {
  if (!staffUserId || !portalUserId || staffUserId === portalUserId) return null;

  const conversation = await getOrCreateDirectConversation(staffUserId, portalUserId);
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

  const duplicate = await clientsTable.findOne({ email: contactEmail }).lean();
  if (duplicate) {
    throw new HttpError(
      409,
      "A company with this contact email already exists. Open it from Customers or Companies.",
      { code: "CONFLICT", field: "email" },
    );
  }

  if (enablePortal) {
    const portalDup = await usersTable.findOne({ email: portalEmail }).select({ id: 1 }).lean();
    if (portalDup) {
      throw new HttpError(409, "Portal login email is already in use.", { code: "CONFLICT", field: "portalEmail" });
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
    const client = await clientsTable.create({
      id: clientId,
      companyName,
      companyCode: optionalString(params.companyCode),
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
      portalLogin: enablePortal,
      userId: portalUserId,
      createdBy: params.createdByUserId ?? null,
    });

    let directConversationId = null;
    if (enablePortal && portalUserId && params.bootstrapDiscussion !== false && params.createdByUserId) {
      try {
        directConversationId = await bootstrapClientDirectDiscussion({
          staffUserId: params.createdByUserId,
          portalUserId,
          companyName,
          welcomeAuthorId: params.createdByUserId,
          clientId,
        });
      } catch (err) {
        logger.warn(
          { err, clientId, portalUserId, createdBy: params.createdByUserId },
          "Client company created but direct discussion bootstrap failed",
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
    throw new HttpError(409, "Portal login email is already in use.", { code: "CONFLICT", field: "portalEmail" });
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
    if (params.bootstrapDiscussion !== false && params.createdByUserId && !directConversationId) {
      try {
        directConversationId = await bootstrapClientDirectDiscussion({
          staffUserId: params.createdByUserId,
          portalUserId,
          companyName: updated.companyName,
          welcomeAuthorId: params.createdByUserId,
          clientId: client.id,
        });
      } catch (err) {
        logger.warn(
          { err, clientId: client.id, portalUserId },
          "Portal enabled but direct discussion bootstrap failed",
        );
      }
    }

    if (directConversationId && !updated.directConversationId) {
      updated.directConversationId = directConversationId;
    }

    return { client: updated, portalUserId, directConversationId };
  } catch (err) {
    if (portalUserId) await usersTable.deleteOne({ id: portalUserId }).catch(() => {});
    throw err;
  }
}
