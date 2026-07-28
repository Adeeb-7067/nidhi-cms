import {
  FreelancerEngagements,
  FreelancerInstallments,
  FinancePayments,
  projectsTable,
  projectMembersTable,
  usersTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import {
  badRequest,
  forbidden,
  notFound,
  parseIdParam,
  optionalString,
} from "../../../utils/route-errors.js";
import {
  engagementStatuses,
  engagementPaymentModes,
  installmentStatuses,
} from "../schema/freelancer-engagements.js";
import { runInTx } from "../../../lib/db-tx.js";
import {
  settleFreelancerInstallment,
  unsettleFreelancerInstallment,
} from "../services/cash-bridges.service.js";

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
      receiptNumber: i.receiptNumber ?? null,
      notes: i.notes ?? null,
      proofImageUrl: i.proofImageUrl ?? null,
      recordedBy: i.recordedBy ?? null,
      expenseId: i.expenseId ?? null,
      paymentId: i.paymentId ?? null,
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

  const paymentIds = [
    ...new Set(rows.map((r) => r.paymentId).filter((id) => id != null)),
  ];
  const payments =
    paymentIds.length > 0
      ? await FinancePayments.find({ id: { $in: paymentIds } })
          .select({ id: 1, receiptNumber: 1 })
          .lean()
      : [];
  const receiptByPaymentId = new Map(payments.map((p) => [p.id, p.receiptNumber]));

  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.engagementId) ?? [];
    list.push({
      ...row,
      receiptNumber: row.receiptNumber || receiptByPaymentId.get(row.paymentId) || null,
    });
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
    if (inst.status === "paid") {
      badRequest("Cannot change amount on a paid installment.", "amount");
    }
    const amount = Number(body.amount);
    if (!(amount > 0)) badRequest("amount must be positive.", "amount");
    updates.amount = amount;
  }
  if (body.dueDate !== undefined) {
    updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
  if (body.proofImageUrl !== undefined && body.status !== "paid") {
    updates.proofImageUrl = optionalString(body.proofImageUrl) ?? null;
  }
  if (body.paymentMode !== undefined && body.status !== "paid") {
    updates.paymentMode = optionalString(body.paymentMode) ?? null;
  }
  if (body.reference !== undefined && body.status !== "paid") {
    updates.reference = optionalString(body.reference) ?? null;
  }

  const nextStatus = body.status !== undefined ? body.status : null;
  if (nextStatus != null && !installmentStatuses.includes(nextStatus)) {
    badRequest(`status must be one of: ${installmentStatuses.join(", ")}.`, "status");
  }

  let settleResult = null;
  await runInTx(async (session) => {
    if (Object.keys(updates).length) {
      await FreelancerInstallments.updateOne(
        { id: installmentId },
        { $set: updates },
        { session },
      );
    }

    if (nextStatus === "paid" && inst.status !== "paid") {
      const fresh = await FreelancerInstallments.findOne({ id: installmentId })
        .session(session)
        .lean();
      settleResult = await settleFreelancerInstallment(session, {
        engagement,
        installment: fresh,
        mode: body.paymentMode || "bank_transfer",
        reference: body.reference ?? null,
        notes: body.notes ?? fresh?.notes ?? null,
        proofImageUrl: body.proofImageUrl ?? fresh?.proofImageUrl ?? null,
        recordedBy: req.user.id,
        date: body.paidAt ?? null,
      });
    } else if (nextStatus === "pending" && inst.status === "paid") {
      const fresh = await FreelancerInstallments.findOne({ id: installmentId })
        .session(session)
        .lean();
      await unsettleFreelancerInstallment(session, fresh);
    } else if (nextStatus === "cancelled" && inst.status === "paid") {
      badRequest("Unpay the installment before cancelling it.", "status");
    } else if (nextStatus != null && nextStatus !== inst.status && nextStatus !== "paid") {
      await FreelancerInstallments.updateOne(
        { id: installmentId },
        { $set: { status: nextStatus } },
        { session },
      );
    }
  });

  const updated = await FreelancerInstallments.findOne({ id: installmentId }).lean();

  const all = await FreelancerInstallments.find({ engagementId }).lean();
  const { paidAmount } = summarizeInstallments(all);
  if (paidAmount >= Number(engagement.agreedAmount) && engagement.status === "active") {
    await FreelancerEngagements.updateOne({ id: engagementId }, { $set: { status: "completed" } });
  } else if (paidAmount < Number(engagement.agreedAmount) && engagement.status === "completed") {
    await FreelancerEngagements.updateOne({ id: engagementId }, { $set: { status: "active" } });
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
    receiptNumber: updated.receiptNumber ?? settleResult?.receiptNumber ?? null,
    notes: updated.notes ?? null,
    proofImageUrl: updated.proofImageUrl ?? null,
    recordedBy: updated.recordedBy ?? null,
    expenseId: updated.expenseId ?? null,
    paymentId: updated.paymentId ?? settleResult?.paymentId ?? null,
  });
}

async function getInstallmentReceipt(req, res) {
  const engagementId = parseIdParam(req.params.id, "engagement id");
  const installmentId = parseIdParam(req.params.installmentId, "installment id");

  const engagement = await FreelancerEngagements.findOne({ id: engagementId }).lean();
  if (!engagement) notFound("Freelancer engagement");

  const installment = await FreelancerInstallments.findOne({ id: installmentId, engagementId }).lean();
  if (!installment) notFound("Installment");
  if (installment.status !== "paid") {
    badRequest("Receipt is only available for paid installments.", "status");
  }

  const [freelancer, project, payment, allInstallments] = await Promise.all([
    usersTable.findOne({ id: engagement.userId }).select({ id: 1, name: 1, email: 1 }).lean(),
    projectsTable.findOne({ id: engagement.projectId }).select({ id: 1, name: 1, type: 1 }).lean(),
    installment.paymentId
      ? FinancePayments.findOne({ id: installment.paymentId }).lean()
      : Promise.resolve(null),
    FreelancerInstallments.find({ engagementId }).lean(),
  ]);

  const { paidAmount } = summarizeInstallments(allInstallments);
  const remainingBalance = Math.max(0, Number(engagement.agreedAmount) - paidAmount);

  res.json({
    engagement: {
      id: engagement.id,
      agreedAmount: engagement.agreedAmount,
      projectId: engagement.projectId,
      projectName: project?.name ?? null,
      userId: engagement.userId,
      freelancerName: freelancer?.name ?? null,
      freelancerEmail: freelancer?.email ?? null,
      paidAmount,
      remainingBalance,
    },
    installment: {
      id: installment.id,
      engagementId,
      label: installment.label,
      amount: installment.amount,
      dueDate: installment.dueDate ?? null,
      status: installment.status,
      paidAt: installment.paidAt ?? null,
      paymentMode: installment.paymentMode ?? payment?.mode ?? null,
      reference: installment.reference ?? payment?.reference ?? null,
      receiptNumber:
        installment.receiptNumber ?? payment?.receiptNumber ?? `FL-REC-${installment.id}`,
      notes: installment.notes ?? null,
      proofImageUrl: installment.proofImageUrl ?? null,
      paymentId: installment.paymentId ?? payment?.id ?? null,
    },
    payment: payment
      ? {
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          reference: payment.reference,
          amount: payment.amount,
          mode: payment.mode,
          date: payment.date,
          status: payment.status,
        }
      : null,
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
  getInstallmentReceipt,
  deleteInstallment,
};
