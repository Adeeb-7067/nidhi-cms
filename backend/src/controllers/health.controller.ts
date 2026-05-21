import type { Request, Response } from "express";
import { HealthCheckResponse } from "@/api-zod";

export function getHealthz(_req: Request, res: Response) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}
