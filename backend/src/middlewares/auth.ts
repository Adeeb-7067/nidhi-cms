import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import { usersTable } from "@/models/schema";
import { HttpError } from "@/lib/http-error";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        name: string;
        email: string;
      };
    }
  }
}

function extractBearerToken(req: Request): string | null {
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

/** Express middleware — use with `asyncHandler(requireAuth)` or global router wrap. */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    throw new HttpError(401, "Please sign in. Your session token is missing.", {
      code: "UNAUTHORIZED",
    });
  }

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.", {
      code: "TOKEN_INVALID",
    });
  }

  const user = await usersTable.findOne(
    { id: payload.userId },
    { id: 1, role: 1, name: 1, email: 1, status: 1 },
  );

  if (!user || user.status !== "active") {
    throw new HttpError(
      401,
      "Your account is inactive or no longer exists. Contact your administrator.",
      { code: "USER_INACTIVE" },
    );
  }

  req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, "Please sign in to continue.", { code: "UNAUTHORIZED" }));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        new HttpError(
          403,
          `This action requires one of these roles: ${roles.join(", ")}.`,
          { code: "FORBIDDEN" },
        ),
      );
      return;
    }
    next();
  };
}
