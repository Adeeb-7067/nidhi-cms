/**
 * Proposals created from a lead store leadId; customerId is set on conversion.
 * Customer views must include both direct and lead-linked proposals.
 */
export function customerProposalOwnershipFilter(customerId, leadId) {
  const cid = Number(customerId);
  if (leadId != null && leadId !== "") {
    return { $or: [{ customerId: cid }, { leadId: Number(leadId) }] };
  }
  return { customerId: cid };
}
