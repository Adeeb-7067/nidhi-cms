import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import pinoHttp from "pino-http";
import { getAllowedOrigins } from "@/config";
import router from "./routes";
import { logger } from "@/lib/logger";
import "./lib/db";
import { auditMiddleware } from "./middlewares/audit";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { responseCompression } from "./middlewares/compression";
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
app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);
var stdin_default = app;
export {
  stdin_default as default
};
