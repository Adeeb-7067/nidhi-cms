import { SalesBdeTargets, getNextSequence } from "../../../models/schema/index.js";
import { badRequest, forbidden, parseIdParam } from "../../../utils/route-errors.js";

function parseOptionalNumber(val) {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) || n < 0 ? null : Math.round(n);
}

async function getBdeTargets(req, res) {
  const userId = parseIdParam(req.params.userId, "user id");
  if (req.user.role === "bde" && req.user.id !== userId) {
    forbidden("You can only view your own targets.");
  }
  const year = Number(req.query.year) || new Date().getFullYear();
  const targets = await SalesBdeTargets.find({ userId, year }).sort({ month: 1 }).lean();
  res.json({ targets });
}

async function upsertBdeTarget(req, res) {
  const userId = parseIdParam(req.params.userId, "user id");
  const body = req.body;
  const month = Number(body.month);
  const year = Number(body.year);

  if (!month || month < 1 || month > 12) badRequest("Invalid month.", "month");
  if (!year || year < 2020 || year > 2100) badRequest("Invalid year.", "year");

  const update = {
    revenueTarget: parseOptionalNumber(body.revenueTarget),
    dealsTarget: parseOptionalNumber(body.dealsTarget),
    leadsTarget: parseOptionalNumber(body.leadsTarget),
    setBy: req.user.id,
    notes: body.notes?.trim() || null,
  };

  const existing = await SalesBdeTargets.findOne({ userId, month, year });
  if (existing) {
    await SalesBdeTargets.updateOne({ userId, month, year }, { $set: update });
    const updated = await SalesBdeTargets.findOne({ userId, month, year }).lean();
    res.json(updated);
  } else {
    const id = await getNextSequence("sales_bde_targets");
    const target = await SalesBdeTargets.create({ id, userId, month, year, ...update });
    res.status(201).json(target.toObject());
  }
}

async function getMyTarget(req, res) {
  const userId = req.user.id;
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const target = await SalesBdeTargets.findOne({ userId, month, year }).lean();
  res.json({ target: target ?? null });
}

async function getAllTargetsForMonth(req, res) {
  if (req.user.role === "bde") {
    forbidden("Only admins can view all BDE targets.");
  }
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const targets = await SalesBdeTargets.find({ month, year }).lean();
  res.json({ targets, month, year });
}

export { getBdeTargets, upsertBdeTarget, getMyTarget, getAllTargetsForMonth };
