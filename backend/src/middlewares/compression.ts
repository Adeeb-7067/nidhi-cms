import compression from "compression";
import type { Request, Response } from "express";

/** Gzip JSON and text responses; skip tiny payloads and uploads. */
export const responseCompression = compression({
  threshold: 1024,
  filter: (req: Request, res: Response) => {
    if (req.path.startsWith("/uploads")) return false;
    if (res.getHeader("Content-Type")?.toString().includes("text/event-stream")) {
      return false;
    }
    return compression.filter(req, res);
  },
});
