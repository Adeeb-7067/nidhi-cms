import { SalesProducts, getNextSequence } from "../../models/schema/index.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";

async function listProducts(req, res) {
  const { status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesProducts,
    filter,
    { page, limit, skip },
    { sort: { name: 1 } }
  );
  res.json({ products: items, total, page: pg, limit: lim });
}

async function createProduct(req, res) {
  const body = req.body;
  const name = optionalString(body.name);
  if (!name) badRequest("Name is required.", "name");
  if (body.price == null) badRequest("Price is required.", "price");
  const id = await getNextSequence("sales_products");
  const product = await SalesProducts.create({
    id,
    name,
    category: optionalString(body.category) ?? null,
    price: Number(body.price),
    taxPercent: body.taxPercent != null ? Number(body.taxPercent) : 18,
    description: optionalString(body.description) ?? null,
    status: "active",
    createdBy: req.user.id,
  });
  res.status(201).json(product.toObject());
}

async function updateProduct(req, res) {
  const id = parseIdParam(req.params.id, "product id");
  const product = await SalesProducts.findOne({ id }).lean();
  if (!product) notFound("Product");
  const body = req.body;
  const updates = {};
  if (body.name !== undefined) updates.name = optionalString(body.name);
  if (body.category !== undefined) updates.category = optionalString(body.category) ?? null;
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.taxPercent !== undefined) updates.taxPercent = Number(body.taxPercent);
  if (body.description !== undefined) updates.description = optionalString(body.description) ?? null;
  if (body.status !== undefined) updates.status = body.status;
  const updated = await SalesProducts.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

export { listProducts, createProduct, updateProduct };
