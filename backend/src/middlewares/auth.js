import { verifyAccessToken } from "../lib/jwt.js";
import { usersTable } from "../models/schema/index.js";
import { HttpError } from "../lib/http-error.js";

// In-process TTL cache: eliminates one DB query per authenticated request.
// Trade-off: a deactivated or role-changed user has up to 30 s before the
// change is reflected. Acceptable for this app's team size and threat model.
const AUTH_CACHE_TTL_MS = 30_000;
const _authCache = new Map(); // userId → { data: UserDoc, expiresAt: number }

async function getCachedUser(userId) {
  const now = Date.now();
  const entry = _authCache.get(userId);
  if (entry && entry.expiresAt > now) return entry.data;

  const user = await usersTable.findOne(
    { id: userId },
    { id: 1, role: 1, name: 1, email: 1, status: 1 }
  );

  if (user?.status === "active") {
    _authCache.set(userId, { data: user, expiresAt: now + AUTH_CACHE_TTL_MS });
  } else {
    // Never cache inactive or missing users — they must pass a fresh DB check.
    _authCache.delete(userId);
  }
  return user;
}

// Call after deactivating or changing a user's role so the next request sees
// the updated state immediately rather than waiting for the TTL to expire.
function evictUserFromAuthCache(userId) {
  _authCache.delete(userId);
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const alt = req.headers["x-access-token"];
  if (typeof alt === "string" && alt.trim()) {
    return alt.trim();
  }
  return null;
}
async function requireAuth(req, _res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    throw new HttpError(401, "Please sign in. Your session token is missing.", {
      code: "UNAUTHORIZED"
    });
  }
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.", {
      code: "TOKEN_INVALID"
    });
  }
  const user = await getCachedUser(payload.userId);
  if (!user || user.status !== "active") {
    throw new HttpError(
      401,
      "Your account is inactive or no longer exists. Contact your administrator.",
      { code: "USER_INACTIVE" }
    );
  }
  req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
  next();
}
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new HttpError(401, "Please sign in to continue.", { code: "UNAUTHORIZED" }));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        new HttpError(
          403,
          `This action requires one of these roles: ${roles.join(", ")}.`,
          { code: "FORBIDDEN" }
        )
      );
      return;
    }
    next();
  };
}
export {
  evictUserFromAuthCache,
  requireAuth,
  requireRole
};
