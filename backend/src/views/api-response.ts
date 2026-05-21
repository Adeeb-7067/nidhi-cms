import type { Response } from "express";

/** JSON view helpers (API has no HTML views). */
export function sendJson(res: Response, data: unknown, status = 200): void {
  res.status(status).json(data);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}
