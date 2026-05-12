import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "../lib/jwt";
import { db } from "../lib/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, role: usersTable.role, name: usersTable.name, email: usersTable.email, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId))
    .limit(1);

  if (!user || user.status !== "active") {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
