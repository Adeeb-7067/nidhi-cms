import {
  getLivePresenceMap,
  getPresenceForUserIds,
  getPresenceSnapshot,
  touchPresence,
} from "../services/presence.js";
import { badRequest } from "../../../utils/route-errors.js";
import { getDirectReportIds } from "../../hrm/services/team-scope.js";
import { projectMembersTable } from "../../../models/schema/index.js";

async function resolveAllowedPresenceIds(viewer, requestedIds) {
  if (viewer.role === "super_admin" || viewer.role === "hr") {
    return requestedIds;
  }

  const allowed = new Set([viewer.id]);
  if (viewer.role === "manager") {
    const reports = await getDirectReportIds(viewer.id);
    reports.forEach((id) => allowed.add(id));
  }

  const memberRows = await projectMembersTable
    .find({ userId: viewer.id })
    .select({ projectId: 1 })
    .lean();
  const projectIds = memberRows.map((m) => m.projectId);
  if (projectIds.length) {
    const peers = await projectMembersTable
      .find({ projectId: { $in: projectIds } })
      .select({ userId: 1 })
      .lean();
    peers.forEach((p) => allowed.add(p.userId));
  }

  return requestedIds.filter((id) => allowed.has(id));
}

async function getPresence(req, res) {
  const raw = req.query.ids;
  if (raw == null || raw === "") {
    if (req.user.role === "super_admin" || req.user.role === "hr") {
      res.json({ presence: getLivePresenceMap() });
      return;
    }
    // Non-admins: only self + project peers / reports (not org-wide map)
    const memberRows = await projectMembersTable
      .find({ userId: req.user.id })
      .select({ projectId: 1 })
      .lean();
    const projectIds = memberRows.map((m) => m.projectId);
    const peerIds = new Set([req.user.id]);
    if (req.user.role === "manager") {
      (await getDirectReportIds(req.user.id)).forEach((id) => peerIds.add(id));
    }
    if (projectIds.length) {
      const peers = await projectMembersTable
        .find({ projectId: { $in: projectIds } })
        .select({ userId: 1 })
        .lean();
      peers.forEach((p) => peerIds.add(p.userId));
    }
    const presence = await getPresenceForUserIds([...peerIds]);
    res.json({ presence });
    return;
  }
  const ids = String(raw)
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) {
    throw badRequest("Invalid ids query parameter");
  }
  if (ids.length > 200) {
    throw badRequest("Maximum 200 user ids per request");
  }
  const scopedIds = await resolveAllowedPresenceIds(req.user, ids);
  const presence = await getPresenceForUserIds(scopedIds);
  res.json({ presence });
}

async function getPresenceMe(req, res) {
  const snap = getPresenceSnapshot(req.user.id);
  res.json(snap);
}

async function postPresenceHeartbeat(req, res) {
  const tabVisible = req.body?.tabVisible !== false;
  const snap =
    touchPresence(req.user.id, { tabVisible }) ?? getPresenceSnapshot(req.user.id);
  res.json(snap);
}

export {
  getPresence,
  getPresenceMe,
  postPresenceHeartbeat,
};
