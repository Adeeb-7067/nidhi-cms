import {
  getLivePresenceMap,
  getPresenceForUserIds,
  getPresenceSnapshot,
  touchPresence,
} from "../services/presence.js";
import { badRequest } from "../utils/route-errors.js";

async function getPresence(req, res) {
  const raw = req.query.ids;
  if (raw == null || raw === "") {
    res.json({ presence: getLivePresenceMap() });
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
  const presence = await getPresenceForUserIds(ids);
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
