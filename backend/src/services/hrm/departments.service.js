import { departmentsTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { conflict, notFound } from "../../utils/route-errors.js";

export async function listDepartments() {
  const departments = await departmentsTable.find({ status: "active" }).sort({ name: 1 }).lean();
  const deptIds = departments.map((d) => d.id);
  const [counts, members, heads] = await Promise.all([
    usersTable.aggregate([
      { $match: { departmentId: { $in: deptIds }, status: "active" } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
    deptIds.length
      ? usersTable
          .find(
            { departmentId: { $in: deptIds }, status: "active" },
            { id: 1, name: 1, employeeId: 1, avatarUrl: 1, departmentId: 1, designation: 1 },
          )
          .lean()
      : [],
    (() => {
      const headIds = [...new Set(departments.map((d) => d.headUserId).filter(Boolean))];
      return headIds.length
        ? usersTable.find({ id: { $in: headIds } }, { id: 1, name: 1, employeeId: 1, avatarUrl: 1 }).lean()
        : [];
    })(),
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.count]));
  const headMap = new Map(heads.map((h) => [h.id, h]));
  const membersByDept = new Map();
  const designationsByDept = new Map();
  for (const m of members) {
    const list = membersByDept.get(m.departmentId) ?? [];
    if (list.length < 24) {
      list.push({
        userId: m.id,
        userName: m.name,
        employeeId: m.employeeId ?? null,
        avatarUrl: m.avatarUrl ?? null,
        designation: m.designation ?? null,
      });
      membersByDept.set(m.departmentId, list);
    }
    if (m.designation?.trim()) {
      const set = designationsByDept.get(m.departmentId) ?? new Set();
      set.add(m.designation.trim());
      designationsByDept.set(m.departmentId, set);
    }
  }
  return departments.map((d) => {
    const head = d.headUserId ? headMap.get(d.headUserId) : null;
    return {
      ...d,
      headcount: countMap.get(d.id) ?? 0,
      managerId: d.headUserId ?? null,
      managerName: head?.name ?? null,
      members: membersByDept.get(d.id) ?? [],
      designations: [...(designationsByDept.get(d.id) ?? [])].sort(),
    };
  });
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
