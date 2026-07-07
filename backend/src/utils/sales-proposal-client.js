/** Valid-until date is inclusive through end of that calendar day (UTC). */
export function isProposalValidityActive(validUntil) {
  if (!validUntil) return true;
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime())) return true;
  end.setUTCHours(23, 59, 59, 999);
  return end.getTime() >= Date.now();
}

/**
 * When a client opens the share link, promote draft proposals so response actions work.
 * Drafts get a viewToken at creation — sharing the link counts as sending to the client.
 */
export function publicViewStatusUpdates(proposal, now = new Date()) {
  if (!proposal) return {};

  if (proposal.status === "draft") {
    const seenAt = proposal.seenAt ?? now;
    return {
      status: "seen",
      seenAt,
      ...(proposal.sentAt ? {} : { sentAt: seenAt }),
    };
  }

  if (!proposal.seenAt) {
    return {
      seenAt: now,
      ...(proposal.status === "sent" ? { status: "seen" } : {}),
    };
  }

  return {};
}

/** Whether the client-facing proposal link should show accept / decline / counter. */
export function canClientRespondToProposal(proposal) {
  if (!proposal || ["approved", "declined"].includes(proposal.status)) {
    return false;
  }
  if (proposal.status === "draft") {
    return false;
  }
  if (["sent", "seen"].includes(proposal.status)) {
    return true;
  }
  if (!isProposalValidityActive(proposal.validUntil)) {
    return false;
  }
  if (proposal.status === "expired") {
    return true;
  }
  if (proposal.status === "revised" && proposal.sentAt) {
    return true;
  }
  return false;
}

/** After extending validity, reopen proposals that were already shared with the client. */
export function statusAfterValidityExtension(proposal, newValidUntil) {
  if (!newValidUntil || !isProposalValidityActive(newValidUntil) || !proposal.sentAt) {
    return null;
  }
  if (!["expired", "revised"].includes(proposal.status)) {
    return null;
  }
  return proposal.seenAt ? "seen" : "sent";
}
