import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import pinoHttp from "pino-http";
import { getAllowedOrigins } from "./config/index.js";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import "./lib/db.js";
import { auditMiddleware } from "./middlewares/audit.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { responseCompression } from "./middlewares/compression.js";
import { registerFrontendServing } from "./middlewares/serve-frontend.js";
const app = express();
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0]
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode
        };
      }
    }
  })
);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Access-Token"]
  })
);
app.use(responseCompression);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(auditMiddleware);
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
app.use("/api", router);
registerFrontendServing(app);
app.use(notFoundHandler);
app.use(errorHandler);
var stdin_default = app;
export {
  stdin_default as default
};
