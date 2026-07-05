/** Valid-until date is inclusive through end of that calendar day (UTC). */
export function isProposalValidityActive(validUntil) {
  if (!validUntil) return true;
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime())) return true;
  end.setUTCHours(23, 59, 59, 999);
  return end.getTime() >= Date.now();
}

/** Whether the client-facing proposal link should show accept / decline / counter. */
export function canClientRespondToProposal(proposal) {
  if (!proposal || ["approved", "declined", "draft"].includes(proposal.status)) {
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
