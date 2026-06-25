export * from "./generated/api";
export * from "./generated/api.schemas";
export { createBugBatch, deleteBug, deleteBugIssue, fetchBugsExport, type BugBatchInput, type BugBatchItem, type BugsExportResult } from "./bugs-batch";
export {
  forgotPasswordOtp,
  verifyResetOtp,
  resetPasswordWithOtp,
  requestChangePasswordOtp,
} from "./password-auth";
export { addProjectMembersBatch, type AddProjectMembersBatchResult } from "./project-members-batch";
export {
  useGetWorkspaceDashboard,
  useGetClientHubDashboard,
  type WorkspaceDashboard,
  type ClientHubDashboard,
} from "./workspace-dashboard";
export { fetchPresence, fetchMyPresence, postPresenceHeartbeat, presenceQueryKey } from "./presence";
export type { PresenceMapResult } from "./presence";
export {
  useDiscussionPreviews,
  fetchDiscussionPreviews,
  discussionPreviewsQueryKey,
  type ProjectDiscussionPreview,
} from "./discussion-previews";
export {
  useDirectConversations,
  useDirectConversationContacts,
  useCreateDirectConversation,
  fetchDirectConversations,
  fetchDirectConversationContacts,
  createDirectConversation,
  directConversationsQueryKey,
  directConversationContactsQueryKey,
  patchDirectConversationFromComment,
  upsertDirectConversationInCache,
  type DirectConversation,
  type DirectConversationPeer,
  type DirectConversationListResult,
} from "./direct-conversations";
export { setBaseUrl, setAuthTokenGetter, ApiError } from "./custom-fetch";
export {
  fetchTeamEmployee,
  createTeamEmployee,
  updateTeamEmployee,
  useTeamEmployeeProfile,
  useSaveTeamEmployee,
  teamEmployeeQueryKey,
  type TeamEmployeeRecord,
} from "./team-employees";
export type { AuthTokenGetter } from "./custom-fetch";
export {
  clientTeamActivityQueryKey,
  clientTeamMeQueryKey,
  clientTeamMembersQueryKey,
  clientTeamMemberQueryKey,
  fetchClientTeamActivity,
  fetchClientTeamMe,
  fetchClientTeamMember,
  fetchClientTeamMembers,
  useClientTeamActivity,
  useClientTeamMe,
  useClientTeamMembers,
  useCreateClientTeamMember,
  useDeactivateClientTeamMember,
  useReactivateClientTeamMember,
  useResendClientTeamInvitation,
  useResetClientTeamMemberPassword,
  useUpdateClientTeamMember,
  useUpdateClientTeamMemberPermissions,
  type ClientTeamActivityResponse,
  type ClientTeamActivityRow,
  type ClientTeamCreateInput,
  type ClientTeamInvitationResult,
  type ClientTeamMember,
  type ClientTeamMemberStatus,
  type ClientTeamMembersResponse,
  type ClientTeamMeResponse,
  type ClientTeamUpdateInput,
} from "./client-team";
export {
  useGetProjectClientTeam,
  getProjectClientTeamQueryKey,
  type ProjectClientTeamResponse,
  type ProjectClientContact,
} from "./project-client-team";
export * from "./sales";
