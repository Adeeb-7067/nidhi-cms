import {
  vendorsTable,
  FinanceExpenses,
  FinancePayments,
  FinanceVendorInvoices,
  getNextSequence,
} from "../../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString, conflict } from "../../../utils/route-errors.js";
import { escapeRegex } from "../../../utils/regex.js";
import {
  normalizeVendorFields,
  resolveVendorFields,
  toFinanceVendorDto,
} from "../../../utils/vendor-fields.js";
import { computeVendorAnalytics } from "../services/vendor-analytics.service.js";

async function assertVendorEmailAvailable(email, excludeId = null) {
  const normalized = email.trim().toLowerCase();
  const filter = { email: normalized };
  if (excludeId != null) filter.id = { $ne: excludeId };
  const existing = await vendorsTable.findOne(filter).select({ id: 1 }).lean();
  if (existing) {
    conflict("A vendor with this email already exists.", "email");
  }
}

async function listVendors(req, res) {
  const { search } = req.query;
  const filter = {};
  if (search) {
    const q = escapeRegex(String(search).trim());
    if (q) {
      filter.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { gstNumber: { $regex: q, $options: "i" } },
        { vendorNotes: { $regex: q, $options: "i" } },
        { "vendorFields.label": { $regex: q, $options: "i" } },
        { "vendorFields.value": { $regex: q, $options: "i" } },
      ];
    }
  }
  const vendors = await vendorsTable
    .find(filter)
    .select({
      id: 1,
      companyName: 1,
      contactPerson: 1,
      gstNumber: 1,
      address: 1,
      website: 1,
      vendorCategory: 1,
      vendorFields: 1,
      vendorNotes: 1,
      email: 1,
      phone: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ companyName: 1 })
    .lean();
  res.json({ vendors: vendors.map(toFinanceVendorDto) });
}

async function getVendorAnalytics(req, res) {
  const period = req.query.period === "previous" ? "previous" : "current";
  const months = req.query.months
    ? Math.min(24, Math.max(1, Number(req.query.months) || 6))
    : 6;
  const data = await computeVendorAnalytics(period, months);
  res.json({ ...data, period });
}

async function getVendorById(req, res) {
  const id = parseIdParam(req.params.id, "vendor id");
  const vendor = await vendorsTable.findOne({ id }).lean();
  if (!vendor) notFound("Vendor");
  res.json(toFinanceVendorDto(vendor));
}

async function createVendor(req, res) {
  const body = req.body ?? {};
  if (!body.name?.trim()) badRequest("name is required.", "name");
  if (!body.email?.trim()) badRequest("email is required.", "email");

  const fields = normalizeVendorFields(body.fields);
  const email = body.email.trim().toLowerCase();
  await assertVendorEmailAvailable(email);
  const id = await getNextSequence("vendors");
  const vendor = await vendorsTable.create({
    id,
    companyName: body.name.trim(),
    contactPerson: body.contactPerson?.trim() || body.name.trim(),
    email,
    phone: body.phone?.trim() || null,
    address: body.address?.trim() || null,
    website: body.website?.trim() || null,
    gstNumber: body.gstin?.trim() || null,
    vendorFields: fields,
    vendorNotes: optionalString(body.notes) ?? null,
    vendorCategory: null,
    status: "active",
    createdBy: req.user.id,
  });
  res.status(201).json(toFinanceVendorDto(vendor));
}

async function updateVendor(req, res) {
  const id = parseIdParam(req.params.id, "vendor id");
  const body = req.body ?? {};
  const vendor = await vendorsTable.findOne({ id });
  if (!vendor) notFound("Vendor");

  const updates = {};
  if (body.name !== undefined) {
    const name = optionalString(body.name);
    if (!name) badRequest("name cannot be empty.", "name");
    updates.companyName = name;
  }
  if (body.email !== undefined) {
    const email = optionalString(body.email);
    if (!email) badRequest("email cannot be empty.", "email");
    const normalized = email.toLowerCase();
    if (normalized !== vendor.email) await assertVendorEmailAvailable(normalized, vendor.id);
    updates.email = normalized;
  }
  if (body.contactPerson !== undefined) updates.contactPerson = optionalString(body.contactPerson) ?? vendor.contactPerson;
  if (body.phone !== undefined) updates.phone = optionalString(body.phone) ?? null;
  if (body.address !== undefined) updates.address = optionalString(body.address) ?? null;
  if (body.website !== undefined) updates.website = optionalString(body.website) ?? null;
  if (body.gstin !== undefined) updates.gstNumber = optionalString(body.gstin) ?? null;
  if (body.notes !== undefined) updates.vendorNotes = optionalString(body.notes) ?? null;
  if (body.fields !== undefined) {
    updates.vendorFields = normalizeVendorFields(body.fields);
    updates.vendorCategory = null;
  }

  Object.assign(vendor, updates);
  await vendor.save();
  res.json(toFinanceVendorDto(vendor.toObject()));
}

async function deleteVendor(req, res) {
  const id = parseIdParam(req.params.id, "vendor id");
  const vendor = await vendorsTable.findOne({ id }).select({ id: 1 }).lean();
  if (!vendor) notFound("Vendor");

  const [linkedExpense, linkedPayment, linkedInvoice] = await Promise.all([
    FinanceExpenses.findOne({ vendorId: id }).select({ id: 1 }).lean(),
    FinancePayments.findOne({ vendorId: id }).select({ id: 1 }).lean(),
    FinanceVendorInvoices.findOne({ vendorId: id }).select({ id: 1 }).lean(),
  ]);
  if (linkedExpense || linkedPayment || linkedInvoice) {
    conflict(
      "This vendor is used by existing expenses, payments, or invoices and cannot be deleted.",
      "vendorId",
    );
  }
  await vendorsTable.deleteOne({ id });
  res.json({ success: true });
}

export {
  listVendors,
  getVendorAnalytics,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  resolveVendorFields,
};
