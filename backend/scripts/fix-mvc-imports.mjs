import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src");
const dirs = ["controllers", "routes"];

for (const dir of dirs) {
  const full = path.join(root, dir);
  for (const file of fs.readdirSync(full)) {
    if (!file.endsWith(".js")) continue;
    let src = fs.readFileSync(path.join(full, file), "utf8");
    src = src.replaceAll("@workspace/db/schema", "@/models/schema");
    const mapperModules = [
      "company-format",
      "project-format",
      "notification-format",
      "request-format",
      "ticket-format",
      "bug-format",
      "user-format",
    ];
    for (const mod of mapperModules) {
      src = src.replaceAll(`from "../lib/${mod}"`, `from "@/mappers/${mod}"`);
    }
    const serviceModules = [
      "employeeId",
      "client-portal",
      "work-assignments",
      "reporting",
    ];
    const accessModules = ["access-helpers", "inventory-access", "company-access"];
    for (const mod of serviceModules) {
      src = src.replaceAll(`from "../lib/${mod}"`, `from "@/services/${mod}"`);
    }
    for (const mod of accessModules) {
      src = src.replaceAll(`from "../lib/${mod}"`, `from "@/services/access/${mod}"`);
    }
    src = src.replaceAll('from "../lib/inventory-helpers"', 'from "@/services/inventory/helpers"');
    src = src.replaceAll('from "../lib/', 'from "@/lib/');
    src = src.replaceAll('from "../middlewares/', 'from "@/middlewares/');
    src = src.replaceAll('from "../services/', 'from "@/services/');
    src = src.replaceAll(/requireRole,\s*\("([^"]+)"\)/g, 'requireRole("$1")');
    src = src.replaceAll(/requireRole,\s*\('([^']+)'\)/g, "requireRole('$1')");
    src = src.replaceAll(/requireRole,\s*\(([^)]+)\)/g, "requireRole($1)");
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
