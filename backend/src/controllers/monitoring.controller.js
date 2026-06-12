import * as monitoringService from "../services/monitoring.service.js";
import { forbidden, parseIdParam } from "../utils/route-errors.js";

export async function getConsentStatus(req, res) {
  const isAdmin = req.user.role === "super_admin";
  const userId = isAdmin && req.query.userId
    ? parseIdParam(req.query.userId, "userId")
    : req.user.id;
  if (!isAdmin && userId !== req.user.id) {
    forbidden("You can only view your own consent status.");
  }
  const status = await monitoringService.getConsentStatus(userId);
  res.json(status);
}

export async function recordConsent(req, res) {
  const doc = await monitoringService.recordConsent({
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] ?? null
  });
  res.status(201).json({ ok: true, consentGivenAt: doc.consentGivenAt });
} 

export async function getStatus(req, res) {
  const status = await monitoringService.getMonitoringStatus();
  res.json(status);
}

export async function listConsents(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  const result = await monitoringService.listAllConsents({ page, limit });
  res.json({
    data: result.items.map((c) => ({
      id: c.id,
      userId: c.userId,
      consentGivenAt: c.consentGivenAt ?? null,
      consentVersion: c.consentVersion ?? null,
      ipAddress: c.ipAddress ?? null,
      userAgent: c.userAgent ?? null,
    })),
    total: result.total,
    page: result.page,
    limit: result.limit,
  });
}
