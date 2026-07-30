import { toIso } from "../../../utils/mongo-list.js";

export function dateOnly(value) {
  if (!value) return null;
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

export function formatCounsel(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    role: doc.role,
  };
}

export function daysUntil(date, from = new Date()) {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / 86_400_000);
}

export function pctChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 100);
}
