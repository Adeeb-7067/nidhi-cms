import { clientsTable, getNextSequence } from "../../models/schema/index.js";
import { badRequest } from "../../utils/route-errors.js";

async function listVendors(req, res) {
  const { search } = req.query;
  const filter = { isVendor: true };
  if (search) {
    const q = String(search).trim();
    if (q) filter.companyName = { $regex: q, $options: "i" };
  }
  const vendors = await clientsTable
    .find(filter)
    .select({ id: 1, companyName: 1, gstNumber: 1, address: 1, vendorCategory: 1, email: 1, phone: 1 })
    .sort({ companyName: 1 })
    .lean();
  res.json({
    vendors: vendors.map((v) => ({
      id: v.id,
      name: v.companyName,
      gstin: v.gstNumber ?? null,
      city: v.address ?? null,
      category: v.vendorCategory ?? null,
      email: v.email,
      phone: v.phone ?? null,
    })),
  });
}

async function createVendor(req, res) {
  const body = req.body ?? {};
  if (!body.name?.trim()) badRequest("name is required.", "name");
  if (!body.email?.trim()) badRequest("email is required.", "email");

  const id = await getNextSequence("clients");
  const vendor = await clientsTable.create({
    id,
    companyName: body.name.trim(),
    contactPerson: body.contactPerson?.trim() || body.name.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone?.trim() || null,
    address: body.city?.trim() || null,
    gstNumber: body.gstin?.trim() || null,
    isVendor: true,
    vendorCategory: body.category?.trim() || null,
    status: "active",
    createdBy: req.user.id,
  });
  res.status(201).json({
    id: vendor.id,
    name: vendor.companyName,
    gstin: vendor.gstNumber ?? null,
    city: vendor.address ?? null,
    category: vendor.vendorCategory ?? null,
  });
}

export { listVendors, createVendor };
