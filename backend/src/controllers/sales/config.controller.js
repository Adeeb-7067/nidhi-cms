import { SalesConfig, getNextSequence } from "../../models/schema/index.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  optionalString,
} from "../../utils/route-errors.js";

async function getConfig(req, res) {
  const { type } = req.query;
  if (!type) badRequest("type query param is required.", "type");
  const items = await SalesConfig.find({ type }).sort({ order: 1, createdAt: 1 }).lean();
  res.json({ items });
}

async function postConfig(req, res) {
  const type = optionalString(req.body.type);
  const value = optionalString(req.body.value);
  const label = optionalString(req.body.label);
  if (!type) badRequest("type is required.", "type");
  if (!value) badRequest("value is required.", "value");
  if (!label) badRequest("label is required.", "label");
  const existing = await SalesConfig.findOne({ type, value });
  if (existing) badRequest("This option already exists.", "value");
  const maxOrder = await SalesConfig.findOne({ type }).sort({ order: -1 }).lean();
  const order = (maxOrder?.order ?? -1) + 1;
  const id = await getNextSequence("sales_config");
  const item = await SalesConfig.create({ id, type, value, label, order, createdBy: req.user.id });
  res.status(201).json(item.toObject());
}

async function deleteConfig(req, res) {
  const id = parseIdParam(req.params.id, "config id");
  const item = await SalesConfig.findOne({ id });
  if (!item) notFound("Config option");
  await SalesConfig.deleteOne({ id });
  res.json({ success: true });
}

export { getConfig, postConfig, deleteConfig };
