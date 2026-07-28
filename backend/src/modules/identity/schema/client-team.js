import mongoose, { Schema } from "mongoose";

/**
 * Section keys are kept as plain strings (no enum) so the central constants
 * file can evolve without a schema migration. Permission levels are also
 * stored as strings for the same reason.
 *
 * See backend/src/constants/client-team.js for the canonical lists.
 */

const clientTeamMemberStatuses = ["pending", "active", "inactive"];

/**
 * One row per non-admin user inside a client company. The user's login
 * credentials live on the existing `Users` row (role = "client"); this
 * collection only stores the parent company link, RBAC permissions, and
 * invitation lifecycle metadata.
 *
 * The primary client (Clients.userId) is the implicit Client Admin and is
 * intentionally NOT represented here — that role is computed at request time
 * so admin status cannot drift out of sync with the parent company row.
 */
const clientTeamMemberSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    clientCompanyId: { type: Number, ref: "Clients", required: true, index: true },
    userId: { type: Number, ref: "Users", required: true, unique: true, index: true },
    invitedByUserId: { type: Number, ref: "Users", required: true },
    title: { type: String, trim: true },
    /** Map of section key (e.g. "discussions") → permission level. */
    permissions: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: clientTeamMemberStatuses, default: "pending", required: true, index: true },
    invitedAt: { type: Date, default: Date.now, required: true },
    activatedAt: { type: Date },
    deactivatedAt: { type: Date },
    lastInviteSentAt: { type: Date },
    inviteCount: { type: Number, default: 1 },
  },
  { timestamps: true },
);

clientTeamMemberSchema.index({ clientCompanyId: 1, status: 1 });

const ClientTeamMembers =
  mongoose.models.ClientTeamMembers ||
  mongoose.model("ClientTeamMembers", clientTeamMemberSchema);

const clientTeamActivityActions = [
  "login",
  "logout",
  "member_invited",
  "member_updated",
  "member_deactivated",
  "member_reactivated",
  "permissions_updated",
  "password_reset",
  "invitation_resent",
  "comment_posted",
  "document_uploaded",
  "document_downloaded",
  "status_update_viewed",
  "user_action",
];

/**
 * Company-scoped activity log surfaced on the Client Admin's "Activity" page.
 * Distinct from the global `audit_logs` collection so we can query a single
 * company's history cheaply and without leaking unrelated rows.
 */
const clientTeamActivitySchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    clientCompanyId: { type: Number, ref: "Clients", required: true, index: true },
    actorUserId: { type: Number, ref: "Users", index: true },
    actorName: { type: String },
    actorIsAdmin: { type: Boolean, default: false },
    action: { type: String, required: true, index: true },
    section: { type: String },
    entityType: { type: String },
    entityId: { type: Number },
    summary: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
);

clientTeamActivitySchema.index({ clientCompanyId: 1, createdAt: -1 });

const ClientTeamActivity =
  mongoose.models.ClientTeamActivity ||
  mongoose.model("ClientTeamActivity", clientTeamActivitySchema);

const clientTeamMembersTable = ClientTeamMembers;
const clientTeamActivityTable = ClientTeamActivity;

export {
  ClientTeamMembers,
  ClientTeamActivity,
  clientTeamMembersTable,
  clientTeamActivityTable,
  clientTeamMemberStatuses,
  clientTeamActivityActions,
};
