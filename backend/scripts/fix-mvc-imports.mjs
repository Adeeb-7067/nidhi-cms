import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src");
const dirs = ["controllers", "routes"];

for (const dir of dirs) {
  const full = path.join(root, dir);
  for (const file of fs.readdirSync(full)) {
    if (!file.endsWith(".ts")) continue;
    let src = fs.readFileSync(path.join(full, file), "utf8");
    src = src.replaceAll("@workspace/db/schema", "@/models/schema");
    const serviceModules = [
      "company-format",
      "project-format",
      "notification-format",
      "request-format",
      "ticket-format",
      "bug-format",
      "user-format",
      "employeeId",
      "client-portal",
      "access-helpers",
      "work-assignments",
      "inventory-access",
      "inventory-helpers",
      "company-access",
    ];
    for (const mod of serviceModules) {
      src = src.replaceAll(`from "../lib/${mod}"`, `from "@/services/${mod}"`);
    }
    src = src.replaceAll('from "../lib/', 'from "@/lib/');
    src = src.replaceAll('from "../middlewares/', 'from "@/middlewares/');
    src = src.replaceAll('from "../services/', 'from "@/services/');
    src = src.replaceAll(/requireRole,\s*\("([^"]+)"\)/g, 'requireRole("$1")');
    src = src.replaceAll(/requireRole,\s*\('([^']+)'\)/g, "requireRole('$1')");
    src = src.replaceAll(/requireRole,\s*\(([^)]+)\)/g, "requireRole($1)");
    if (dir === "controllers" && src.includes("req: Request") && !src.includes('from "express"')) {
      src = 'import type { Request, Response } from "express";\n' + src;
    }
    src = src.replace(/\}\n;/g, "}\n");
    src = src.replace(/from "@\/middlewares\/auth";\n/g, (m, offset, s) => {
      if (dir !== "controllers") return m;
      if (!s.includes("requireAuth") && !s.includes("requireRole")) return "";
      return m;
    });
    fs.writeFileSync(path.join(full, file), src);
  }
}

console.log("imports fixed");
