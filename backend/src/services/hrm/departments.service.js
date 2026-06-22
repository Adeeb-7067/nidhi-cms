import { departmentsTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { conflict, notFound } from "../../utils/route-errors.js";

export async function listDepartments() {
  const departments = await departmentsTable.find({ status: "active" }).sort({ name: 1 }).lean();
  const counts = await usersTable.aggregate([
    { $match: { departmentId: { $ne: null }, status: "active" } },
    { $group: { _id: "$departmentId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.count]));
  return departments.map((d) => ({
    ...d,
    headcount: countMap.get(d.id) ?? 0,
  }));
}

export async function createDepartment(body) {
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!code || code.length < 2) conflict("Department code is required.");
  const existing = await departmentsTable.findOne({ code }).lean();
  if (existing) conflict("Department code already exists.");
  const id = await getNextSequence("departments");
  return departmentsTable.create({
    id,
    name: body.name,
    code,
    description: body.description ?? null,
    headUserId: body.headUserId ?? null,
    parentDepartmentId: body.parentDepartmentId ?? null,
  });
}

export async function updateDepartment(id, body) {
  const dept = await departmentsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.headUserId !== undefined && { headUserId: body.headUserId }),
        ...(body.parentDepartmentId !== undefined && { parentDepartmentId: body.parentDepartmentId }),
        ...(body.status !== undefined && { status: body.status }),
      },
    },
    { new: true },
  );
  if (!dept) notFound("Department");
  return dept;
}

export async function deactivateDepartment(id) {
  const activeUsers = await usersTable.countDocuments({ departmentId: id, status: "active" });
  if (activeUsers > 0) conflict("Cannot deactivate department with active employees.");
  return updateDepartment(id, { status: "inactive" });
}
