import {
  isCompanyTeamDiscussionThread,
  getDiscussionParticipantIds,
} from "./discussion-project-access.js";

/** Users who should be notified about new messages in a project discussion thread. */
export async function collectProjectCommentRecipientIds(projectId, excludeUserId, threadType = "project") {
  const recipientIds = await getDiscussionParticipantIds(
    isCompanyTeamDiscussionThread(threadType) ? 0 : projectId,
    threadType,
  );
  if (excludeUserId != null) recipientIds.delete(excludeUserId);
  return recipientIds;
}
