import { logger } from "../../../lib/logger.js";
import { isDatabaseConnected } from "../../../lib/db.js";
import { autoDeactivateDueEmployees } from "./exit.service.js";

function startEmployeeExitJob() {
  const intervalMs = 60 * 60 * 1000;

  const tick = async () => {
    if (!isDatabaseConnected()) return;
    const { processed } = await autoDeactivateDueEmployees();
    if (processed > 0) {
      logger.info({ processed }, "Employee exit job: auto-deactivated due exits");
    }
  };

  setInterval(() => {
    void tick().catch((err) => logger.error({ err }, "Employee exit job failed"));
  }, intervalMs);

  return tick;
}

export { startEmployeeExitJob };
