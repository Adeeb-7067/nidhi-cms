/**
 * Admin domain module — Manage media vault + project documents.
 * Prefer importing from here or from the concrete files under this folder.
 * Legacy paths under controllers/, services/, routes/, models/schema/ are shims.
 */
export { AdminMediaItems } from "./schema/admin-media.js";
export {
  ProjectDocuments,
  projectDocumentFieldTypes,
  projectDocumentRenewalKinds,
  serverTypes,
} from "./schema/project-documents.js";
export {
  ensureAdminMediaVault,
  DEFAULT_ADMIN_MEDIA_SUBFOLDERS,
} from "./services/admin-media.service.js";
export {
  startProjectDocumentRenewalReminderJob,
  runRenewalReminderCheck,
} from "./services/renewal-reminder-job.js";
export { default as adminMediaRoutes } from "./routes/admin-media.routes.js";
export { default as projectDocumentsRoutes } from "./routes/project-documents.routes.js";
