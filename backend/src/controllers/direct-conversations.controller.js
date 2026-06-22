import {
  canInitiateDirectMessage,
  formatDirectConversationForUser,
  getOrCreateDirectConversation,
  isEligibleDirectMessageTarget,
  listDirectConversationsForUser,
  listDirectMessageContacts,
} from "../services/direct-conversations.js";
import { badRequest, forbidden, notFound, parseIdParam } from "../utils/route-errors.js";

async function getDirectConversations(req, res) {
  const result = await listDirectConversationsForUser(req.user.id);
  res.json(result);
}

async function getDirectConversationContacts(req, res) {
  if (!canInitiateDirectMessage(req.user)) forbidden();
  const result = await listDirectMessageContacts(req.user);
  res.json(result);
}

async function postDirectConversation(req, res) {
  if (!canInitiateDirectMessage(req.user)) forbidden();

  const participantUserId = parseIdParam(req.body?.participantUserId, "participantUserId");
  if (participantUserId === req.user.id) {
    badRequest("You cannot start a conversation with yourself.", "participantUserId");
  }

  const eligible = await isEligibleDirectMessageTarget(participantUserId);
  if (!eligible) notFound("User");

  const conversation = await getOrCreateDirectConversation(req.user.id, participantUserId);
  if (!conversation) badRequest("Could not create conversation.", "participantUserId");

  const formatted = await formatDirectConversationForUser(conversation, req.user.id);

  if (!formatted) {
    res.status(201).json({ conversation: { id: conversation.id } });
    return;
  }

  res.status(201).json({ conversation: formatted });
}

export { getDirectConversations, getDirectConversationContacts, postDirectConversation };
