import path from "node:path";
import express from "express";
import { getFrontendDistPath } from "@/config";
import { logger } from "@/lib/logger";

/** Client routes that must return index.html (SPA). */
const SPA_ROUTES = ["/", "/login"];

/**
 * Serves the built frontend so GET /login works when the UI host proxies to Node.
 * Set FRONTEND_DIST (e.g. ../frontend/dist/public) after `npm run build` in frontend/.
 */
export function registerFrontendServing(app) {
  const dist = getFrontendDistPath();
  if (!dist) return;

  logger.info({ dist, routes: SPA_ROUTES }, "Serving frontend (SPA) from API");

  app.use(
    express.static(dist, {
      index: false,
      maxAge: process.env.NODE_ENV === "production" ? "1d" : 0
    })
  );

  const sendSpa = (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  };

  for (const route of SPA_ROUTES) {
    app.get(route, sendSpa);
  }

  app.get(/^(?!\/api|\/uploads|\/socket\.io).*/, (req, res, next) => {
    if (req.method !== "GET" || path.extname(req.path)) {
      next();
      return;
    }
    sendSpa(req, res);
  });
}
