import { verifyAccessToken } from "../lib/jwt.js";
import { usersTable } from "../models/schema/index.js";
import { HttpError } from "../lib/http-error.js";
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
  const user = await usersTable.findOne(
    { id: payload.userId },
    { id: 1, role: 1, name: 1, email: 1, status: 1 }
  );
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
  requireAuth,
  requireRole
};
