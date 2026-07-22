import {
  FreelancerEngagements,
  FreelancerInstallments,
  projectsTable,
  projectMembersTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import {
  badRequest,
  forbidden,
  notFound,
  parseIdParam,
  optionalString,
} from "../../utils/route-errors.js";
import {
  engagementStatuses,
  engagementPaymentModes,
  installmentStatuses,
} from "../../models/schema/finance/freelancer-engagements.js";

function isManageRole(role) {
  return role === "super_admin" || role === "finance";
}

function summarizeInstallments(installments) {
  const rows = installments ?? [];
  const paidAmount = rows
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const pendingAmount = rows
    .filter((i) => i.status === "pending")
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  return { paidAmount, pendingAmount };
}

function toEngagementDto(row, extras = {}) {
  const agreedAmount = Number(row.agreedAmount) || 0;
  const installments = extras.installments ?? [];
  const { paidAmount, pendingAmount } = summarizeInstallments(installments);
  const remainingAmount = Math.max(0, agreedAmount - paidAmount);
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    agreedAmount,
    currency: row.currency || "INR",
    paymentMode: row.paymentMode,
    status: row.status,
    notes: row.notes ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    paidAmount,
    pendingAmount,
    remainingAmount,
    paymentStatus:
      paidAmount <= 0 ? "unpaid" : remainingAmount <= 0 ? "paid" : "partially_paid",
    freelancerName: extras.freelancerName ?? null,
    projectName: extras.projectName ?? null,
    projectType: extras.projectType ?? null,
    installments: installments.map((i) => ({
      id: i.id,
      engagementId: i.engagementId,
      label: i.label,
      amount: i.amount,
      dueDate: i.dueDate ?? null,
      status: i.status,
      paidAt: i.paidAt ?? null,
      paymentMode: i.paymentMode ?? null,
      reference: i.reference ?? null,
      notes: i.notes ?? null,
      recordedBy: i.recordedBy ?? null,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
  };
}

async function loadNames(engagements) {
  const userIds = [...new Set(engagements.map((e) => e.userId).filter(Boolean))];
  const projectIds = [...new Set(engagements.map((e) => e.projectId).filter(Boolean))];
  const [users, projects] = await Promise.all([
    userIds.length
      ? usersTable.find({ id: { $in: userIds } }).select({ id: 1, name: 1 }).lean()
      : [],
    projectIds.length
      ? projectsTable
          .find({ id: { $in: projectIds } })
          .select({ id: 1, name: 1, type: 1 })
          .lean()
      : [],
  ]);
  return {
    userMap: new Map(users.map((u) => [u.id, u.name])),
    projectMap: new Map(projects.map((p) => [p.id, p])),
  };
}

async function assertFreelancerOnProject(userId, projectId) {
  const user = await usersTable
    .findOne({ id: userId })
    .select({ id: 1, role: 1, name: 1, status: 1 })
    .lean();
  if (!user || user.role !== "freelancer") {
    badRequest("userId must be an active freelancer.", "userId");
  }
  if (user.status !== "active") badRequest("Freelancer account is not active.", "userId");

  const project = await projectsTable
    .findOne({ id: projectId, isDeleted: { $ne: true } })
    .select({ id: 1, name: 1, type: 1 })
    .lean();
  if (!project) notFound("Project");

  const member = await projectMembersTable.findOne({ projectId, userId }).lean();
  if (!member) {
    badRequest("Freelancer must be assigned to the project first.", "userId");
  }
  return { user, project };
}

async function getInstallmentsForEngagementIds(engagementIds) {
  if (!engagementIds.length) return new Map();
  const rows = await FreelancerInstallments.find({ engagementId: { $in: engagementIds } })
    .sort({ dueDate: 1, id: 1 })
    .lean();
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.engagementId) ?? [];
    list.push(row);
    map.set(row.engagementId, list);
  }
  return map;
}

async function listEngagements(req, res) {
  const filter = {};
  const role = req.user?.role;

  if (role === "freelancer") {
    filter.userId = req.user.id;
  } else if (!isManageRole(role)) {
    forbidden("Only finance or admin can list freelancer engagements.");
  } else {
    if (req.query.userId != null && req.query.userId !== "") {
      const uid = Number(req.query.userId);
      if (!Number.isFinite(uid)) badRequest("userId must be a number.", "userId");
      filter.userId = uid;
    }
    if (req.query.projectId != null && req.query.projectId !== "") {
      const pid = Number(req.query.projectId);
      if (!Number.isFinite(pid)) badRequest("projectId must be a number.", "projectId");
      filter.projectId = pid;
    }
  }

  if (req.query.status && engagementStatuses.includes(String(req.query.status))) {
    filter.status = String(req.query.status);
  }

  const rows = await FreelancerEngagements.find(filter).sort({ updatedAt: -1 }).lean();
  const installmentMap = await getInstallmentsForEngagementIds(rows.map((r) => r.id));
  const { userMap, projectMap } = await loadNames(rows);

  res.json({
    engagements: rows.map((row) => {
      const project = projectMap.get(row.projectId);
      return toEngagementDto(row, {
        installments: installmentMap.get(row.id) ?? [],
        freelancerName: userMap.get(row.userId) ?? null,
        projectName: project?.name ?? null,
        projectType: project?.type ?? null,
      });
    }),
  });
}

async function getEngagementById(req, res) {
  const id = parseIdParam(req.params.id, "engagement id");
  const row = await FreelancerEngagements.findOne({ id }).lean();
  if (!row) notFound("Freelancer engagement");

  const role = req.user?.role;
  if (role === "freelancer" && row.userId !== req.user.id) {
    forbidden("You can only view your own engagements.");
  } else if (role !== "freelancer" && !isManageRole(role)) {
    forbidden("Only finance or admin can view freelancer engagements.");
  }

  const installmentMap = await getInstallmentsForEngagementIds([id]);
  const { userMap, projectMap } = await loadNames([row]);
  const project = projectMap.get(row.projectId);

  res.json(
    toEngagementDto(row, {
      installments: installmentMap.get(id) ?? [],
      freelancerName: userMap.get(row.userId) ?? null,
      projectName: project?.name ?? null,
      projectType: project?.type ?? null,
    }),
  );
}

async function createEngagement(req, res) {
  if (!isManageRole(req.user?.role)) {
    forbidden("Only finance or admin can create freelancer engagements.");
  }
  const body = req.body ?? {};
  const projectId = Number(body.projectId);
  const userId = Number(body.userId);
  if (!Number.isFinite(projectId)) badRequest("projectId is required.", "projectId");
  if (!Number.isFinite(userId)) badRequest("userId is required.", "userId");

  const agreedAmount = Number(body.agreedAmount);
  if (!(agreedAmount >= 0) || Number.isNaN(agreedAmount)) {
    badRequest("agreedAmount must be zero or positive.", "agreedAmount");
  }

  const paymentMode = body.paymentMode || "lump_sum";
  if (!engagementPaymentModes.includes(paymentMode)) {
    badRequest(`paymentMode must be one of: ${engagementPaymentModes.join(", ")}.`, "paymentMode");
  }

  await assertFreelancerOnProject(userId, projectId);

  const existing = await FreelancerEngagements.findOne({ projectId, userId }).lean();
  if (existing) {
    badRequest("An engagement already exists for this freelancer on this project.", "userId");
  }

  const installmentInputs = Array.isArray(body.installments) ? [...body.installments] : [];
  if (paymentMode === "lump_sum" && installmentInputs.length === 0 && agreedAmount > 0) {
    installmentInputs.push({
      label: "Full payment",
      amount: agreedAmount,
      dueDate: body.dueDate ?? null,
    });
  }
  if (paymentMode === "installments" && installmentInputs.length === 0) {
    badRequest("Provide at least one installment for installment mode.", "installments");
  }

  if (installmentInputs.length > 0) {
    const scheduleTotal = installmentInputs.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    if (Math.abs(scheduleTotal - agreedAmount) > 0.5) {
      badRequest(
        `Installment amounts (${scheduleTotal}) must equal agreedAmount (${agreedAmount}).`,
        "installments",
      );
    }
  }

  const id = await getNextSequence("freelancer_engagements");
  const engagement = await FreelancerEngagements.create({
    id,
    projectId,
    userId,
    agreedAmount,
    currency: "INR",
    paymentMode,
    status: "active",
    notes: optionalString(body.notes) ?? null,
    createdBy: req.user.id,
  });

  const createdInstallments = [];
  for (const item of installmentInputs) {
    const amount = Number(item.amount);
    if (!(amount > 0)) badRequest("Each installment amount must be positive.", "installments");
    const label = String(item.label || "").trim() || "Installment";
    const instId = await getNextSequence("freelancer_installments");
    const row = await FreelancerInstallments.create({
      id: instId,
      engagementId: id,
      label,
      amount,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      status: "pending",
    });
    createdInstallments.push(row.toObject());
  }

  const { userMap, projectMap } = await loadNames([engagement.toObject()]);
  const project = projectMap.get(projectId);
  res.status(201).json(
    toEngagementDto(engagement.toObject(), {
      installments: createdInstallments,
      freelancerName: userMap.get(userId) ?? null,
      projectName: project?.name ?? null,
      projectType: project?.type ?? null,
    }),
  );
}

async function updateEngagement(req, res) {
  if (!isManageRole(req.user?.role)) {
    forbidden("Only finance or admin can update freelancer engagements.");
  }
  const id = parseIdParam(req.params.id, "engagement id");
  const row = await FreelancerEngagements.findOne({ id }).lean();
  if (!row) notFound("Freelancer engagement");

  const body = req.body ?? {};
  const updates = {};
  const existingInstallments = await FreelancerInstallments.find({ engagementId: id }).lean();
  const paidInstallments = existingInstallments.filter((i) => i.status === "paid");

  if (body.agreedAmount !== undefined) {
    const agreedAmount = Number(body.agreedAmount);
    if (!(agreedAmount >= 0) || Number.isNaN(agreedAmount)) {
      badRequest("agreedAmount must be zero or positive.", "agreedAmount");
    }
    updates.agreedAmount = agreedAmount;
  }
  if (body.paymentMode !== undefined) {
    if (!engagementPaymentModes.includes(body.paymentMode)) {
      badRequest(`paymentMode must be one of: ${engagementPaymentModes.join(", ")}.`, "paymentMode");
    }
    updates.paymentMode = body.paymentMode;
  }
  if (body.status !== undefined) {
    if (!engagementStatuses.includes(body.status)) {
      badRequest(`status must be one of: ${engagementStatuses.join(", ")}.`, "status");
    }
    updates.status = body.status;
  }
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;

  // Replace unpaid schedule when correcting a wrong fee (no paid rows yet).
  if (Array.isArray(body.installments)) {
    if (paidInstallments.length > 0) {
      badRequest("Cannot replace installment schedule after payments are recorded.");
    }
    const nextAgreed =
      updates.agreedAmount !== undefined ? updates.agreedAmount : Number(row.agreedAmount);
    const scheduleTotal = body.installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    if (body.installments.length === 0 && nextAgreed > 0) {
      badRequest("Provide installments or set agreedAmount to 0.", "installments");
    }
    if (body.installments.length > 0 && Math.abs(scheduleTotal - nextAgreed) > 0.5) {
      badRequest(
        `Installment amounts (${scheduleTotal}) must equal agreedAmount (${nextAgreed}).`,
        "installments",
      );
    }
    await FreelancerInstallments.deleteMany({ engagementId: id });
    for (const item of body.installments) {
      const amount = Number(item.amount);
      if (!(amount > 0)) badRequest("Each installment amount must be positive.", "installments");
      const label = String(item.label || "").trim() || "Installment";
      const instId = await getNextSequence("freelancer_installments");
      await FreelancerInstallments.create({
        id: instId,
        engagementId: id,
        label,
        amount,
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        status: "pending",
        notes: optionalString(item.notes) ?? null,
      });
    }
    if (updates.paymentMode === undefined) {
      updates.paymentMode = body.installments.length <= 1 ? "lump_sum" : "installments";
    }
  } else if (updates.agreedAmount !== undefined && paidInstallments.length === 0) {
    // Simple amount correction: keep one pending lump-sum row in sync.
    const pending = existingInstallments.filter((i) => i.status === "pending");
    const mode = updates.paymentMode ?? row.paymentMode;
    if (mode === "lump_sum" && pending.length === 1) {
      await FreelancerInstallments.updateOne(
        { id: pending[0].id },
        { $set: { amount: updates.agreedAmount, label: pending[0].label || "Full payment" } },
      );
    } else if (mode === "lump_sum" && pending.length === 0 && updates.agreedAmount > 0) {
      const instId = await getNextSequence("freelancer_installments");
      await FreelancerInstallments.create({
        id: instId,
        engagementId: id,
        label: "Full payment",
        amount: updates.agreedAmount,
        status: "pending",
      });
    }
  } else if (updates.agreedAmount !== undefined && paidInstallments.length > 0) {
    const paidTotal = paidInstallments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    if (updates.agreedAmount < paidTotal - 0.5) {
      badRequest(
        `agreedAmount cannot be less than already paid (${paidTotal}).`,
        "agreedAmount",
      );
    }
  }

  if (Object.keys(updates).length) {
    await FreelancerEngagements.updateOne({ id }, { $set: updates });
  }

  const updated = await FreelancerEngagements.findOne({ id }).lean();
  const installmentMap = await getInstallmentsForEngagementIds([id]);
  const { userMap, projectMap } = await loadNames([updated]);
  const project = projectMap.get(updated.projectId);
  res.json(
    toEngagementDto(updated, {
      installments: installmentMap.get(id) ?? [],
      freelancerName: userMap.get(updated.userId) ?? null,
      projectName: project?.name ?? null,
      projectType: project?.type ?? null,
    }),
  );
}

async function deleteEngagement(req, res) {
  if (!isManageRole(req.user?.role)) {
    forbidden("Only finance or admin can delete freelancer engagements.");
  }
  const id = parseIdParam(req.params.id, "engagement id");
  const row = await FreelancerEngagements.findOne({ id }).lean();
  if (!row) notFound("Freelancer engagement");

  const paid = await FreelancerInstallments.countDocuments({ engagementId: id, status: "paid" });
  if (paid > 0) {
    badRequest("Cannot delete an engagement with recorded payments. Cancel it instead.");
  }

  await FreelancerInstallments.deleteMany({ engagementId: id });
  await FreelancerEngagements.deleteOne({ id });
  res.status(204).end();
}

async function addInstallment(req, res) {
  if (!isManageRole(req.user?.role)) {
    forbidden("Only finance or admin can add installments.");
  }
  const engagementId = parseIdParam(req.params.id, "engagement id");
  const engagement = await FreelancerEngagements.findOne({ id: engagementId }).lean();
  if (!engagement) notFound("Freelancer engagement");

  const body = req.body ?? {};
  const amount = Number(body.amount);
  if (!(amount > 0)) badRequest("amount must be positive.", "amount");
  const label = String(body.label || "").trim();
  if (!label) badRequest("label is required.", "label");

  const instId = await getNextSequence("freelancer_installments");
  const row = await FreelancerInstallments.create({
    id: instId,
    engagementId,
    label,
    amount,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    status: "pending",
    notes: optionalString(body.notes) ?? null,
  });

  if (engagement.paymentMode === "lump_sum") {
    await FreelancerEngagements.updateOne(
      { id: engagementId },
      { $set: { paymentMode: "installments" } },
    );
  }

  res.status(201).json({
    id: row.id,
    engagementId,
    label: row.label,
    amount: row.amount,
    dueDate: row.dueDate ?? null,
    status: row.status,
    paidAt: null,
    paymentMode: null,
    reference: null,
    notes: row.notes ?? null,
  });
}

async function updateInstallment(req, res) {
  if (!isManageRole(req.user?.role)) {
    forbidden("Only finance or admin can update installments.");
  }
  const engagementId = parseIdParam(req.params.id, "engagement id");
  const installmentId = parseIdParam(req.params.installmentId, "installment id");
  const engagement = await FreelancerEngagements.findOne({ id: engagementId }).lean();
  if (!engagement) notFound("Freelancer engagement");

  const inst = await FreelancerInstallments.findOne({ id: installmentId, engagementId }).lean();
  if (!inst) notFound("Installment");

  const body = req.body ?? {};
  const updates = {};

  if (body.label !== undefined) {
    const label = String(body.label || "").trim();
    if (!label) badRequest("label is required.", "label");
    updates.label = label;
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!(amount > 0)) badRequest("amount must be positive.", "amount");
    updates.amount = amount;
  }
  if (body.dueDate !== undefined) {
    updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
  if (body.paymentMode !== undefined) {
    updates.paymentMode = optionalString(body.paymentMode) ?? null;
  }
  if (body.reference !== undefined) {
    updates.reference = optionalString(body.reference) ?? null;
  }

  if (body.status !== undefined) {
    if (!installmentStatuses.includes(body.status)) {
      badRequest(`status must be one of: ${installmentStatuses.join(", ")}.`, "status");
    }
    updates.status = body.status;
    if (body.status === "paid") {
      updates.paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
      updates.recordedBy = req.user.id;
    } else if (body.status === "pending") {
      updates.paidAt = null;
      updates.recordedBy = null;
    }
  }

  if (Object.keys(updates).length) {
    await FreelancerInstallments.updateOne({ id: installmentId }, { $set: updates });
  }

  const updated = await FreelancerInstallments.findOne({ id: installmentId }).lean();

  // Auto-complete engagement when fully paid
  const all = await FreelancerInstallments.find({ engagementId }).lean();
  const { paidAmount } = summarizeInstallments(all);
  if (paidAmount >= Number(engagement.agreedAmount) && engagement.status === "active") {
    await FreelancerEngagements.updateOne({ id: engagementId }, { $set: { status: "completed" } });
  }

  res.json({
    id: updated.id,
    engagementId,
    label: updated.label,
    amount: updated.amount,
    dueDate: updated.dueDate ?? null,
    status: updated.status,
    paidAt: updated.paidAt ?? null,
    paymentMode: updated.paymentMode ?? null,
    reference: updated.reference ?? null,
    notes: updated.notes ?? null,
    recordedBy: updated.recordedBy ?? null,
  });
}

async function deleteInstallment(req, res) {
  if (!isManageRole(req.user?.role)) {
    forbidden("Only finance or admin can delete installments.");
  }
  const engagementId = parseIdParam(req.params.id, "engagement id");
  const installmentId = parseIdParam(req.params.installmentId, "installment id");
  const inst = await FreelancerInstallments.findOne({ id: installmentId, engagementId }).lean();
  if (!inst) notFound("Installment");
  if (inst.status === "paid") {
    badRequest("Cannot delete a paid installment. Mark it pending first if needed.");
  }
  await FreelancerInstallments.deleteOne({ id: installmentId });
  res.status(204).end();
}

export {
  listEngagements,
  getEngagementById,
  createEngagement,
  updateEngagement,
  deleteEngagement,
  addInstallment,
  updateInstallment,
  deleteInstallment,
};
