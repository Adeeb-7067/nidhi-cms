import { HealthCheckResponse } from "../../../api-zod/index.js";
function getHealthz(_req, res) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}
export {
  getHealthz
};
