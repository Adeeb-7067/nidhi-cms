export * from "./generated/api";
export * from "./generated/api.schemas";
export { createBugBatch, type BugBatchInput, type BugBatchItem } from "./bugs-batch";
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
export { setBaseUrl, setAuthTokenGetter, ApiError } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
