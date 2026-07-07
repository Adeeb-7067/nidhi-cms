/**
 * One-off: cascade-delete converted leads and all linked sales/project/customer data.
 *
 * Usage:
 *   node --env-file=.env ./scripts/delete-lead-cascade.mjs 7 12          # dry-run (default)
 *   node --env-file=.env ./scripts/delete-lead-cascade.mjs 7 12 --confirm
 */
import mongoose from "mongoose";
import {
  SalesLeads,
  SalesLeadActivity,
  SalesFollowUps,
  SalesProposals,
  SalesProposalLogs,
  SalesProposalComments,
  SalesInstallments,
  SalesInvoices,
  SalesPayments,
  clientsTable,
  projectsTable,
  projectMembersTable,
  milestonesTable,
  apkSchedulesTable,
  bugsTable,
  tasksTable,
  ticketsTable,
  dailyLogsTable,
  commentsTable,
  apkReleasesTable,
  apkDownloadLogsTable,
  reportsTable,
  resourceRequestsTable,
  notificationsTable,
  inventoryFoldersTable,
  inventoryResourcesTable,
  inventoryCredentialsTable,
  inventoryCredentialAccessLogsTable,
  inventoryEnvironmentsTable,
  inventoryDevicesTable,
  inventorySubscriptionsTable,
  inventoryActivitiesTable,
  employeeScreenshotsTable,
  clientTeamMembersTable,
  clientTeamActivityTable,
} from "../src/models/schema/index.js";
import { customerProposalOwnershipFilter } from "../src/utils/sales-proposal-links.js";
import { deleteClientCompany } from "../src/services/client-company-provision.js";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const leadIds = args.filter((a) => a !== "--confirm").map(Number).filter((n) => Number.isFinite(n) && n > 0);

if (!leadIds.length) {
  console.error("Usage: delete-lead-cascade.mjs <leadId> [leadId...] [--confirm]");
  process.exit(1);
}

function unique(nums) {
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))];
}

async function discoverLeadGraph(leadId) {
  const lead = await SalesLeads.findOne({ id: leadId }).lean();
  if (!lead) {
    throw new Error(`Lead #${leadId} not found`);
  }

  const customerId = lead.customerId ?? lead.clientId ?? null;
  const clientByLead = await clientsTable.findOne({ leadId }).lean();
  const resolvedCustomerId = customerId ?? clientByLead?.id ?? null;

  const proposalFilter = resolvedCustomerId
    ? customerProposalOwnershipFilter(resolvedCustomerId, leadId)
    : { leadId };

  const proposals = await SalesProposals.find(proposalFilter).lean();
  const proposalIds = proposals.map((p) => p.id);

  const installmentFilter = proposalIds.length
    ? { $or: [{ customerId: resolvedCustomerId }, { proposalId: { $in: proposalIds } }] }
    : resolvedCustomerId
      ? { customerId: resolvedCustomerId }
      : { proposalId: { $in: proposalIds } };

  const installments = resolvedCustomerId || proposalIds.length
    ? await SalesInstallments.find(installmentFilter).lean()
    : [];
  const installmentIds = installments.map((i) => i.id);

  const invoiceFilter = {
    $or: [
      ...(resolvedCustomerId ? [{ customerId: resolvedCustomerId }] : []),
      ...(proposalIds.length ? [{ proposalId: { $in: proposalIds } }] : []),
      ...(installmentIds.length ? [{ installmentId: { $in: installmentIds } }] : []),
    ],
  };
  const invoices = invoiceFilter.$or.length
    ? await SalesInvoices.find({ $or: invoiceFilter.$or }).lean()
    : [];
  const invoiceIds = invoices.map((i) => i.id);

  const paymentFilter = {
    $or: [
      ...(resolvedCustomerId ? [{ customerId: resolvedCustomerId }] : []),
      ...(invoiceIds.length ? [{ invoiceId: { $in: invoiceIds } }] : []),
    ],
  };
  const payments = paymentFilter.$or.length
    ? await SalesPayments.find({ $or: paymentFilter.$or }).lean()
    : [];

  // Abort if billing records point at a different customer than this lead's customer
  if (resolvedCustomerId) {
    for (const row of [...proposals, ...installments, ...invoices, ...payments]) {
      const rowCustomerId = row.customerId;
      if (rowCustomerId != null && rowCustomerId !== resolvedCustomerId) {
        throw new Error(
          `Lead #${leadId}: ${row.constructor?.modelName ?? "record"} id=${row.id} ` +
            `belongs to customer ${rowCustomerId}, expected ${resolvedCustomerId}`,
        );
      }
    }
  }

  const projectIdsFromBilling = unique([
    ...proposals.map((p) => p.projectId),
    ...installments.map((i) => i.projectId),
    ...invoices.map((i) => i.projectId),
  ]);

  const projectsByClient = resolvedCustomerId
    ? await projectsTable
        .find({ $or: [{ clientId: resolvedCustomerId }, { companyId: resolvedCustomerId }] })
        .lean()
    : [];

  const projectIds = unique([...projectIdsFromBilling, ...projectsByClient.map((p) => p.id)]);

  // Abort if any project belongs to a different client
  for (const project of projectsByClient) {
    const ownerId = project.clientId ?? project.companyId;
    if (ownerId && resolvedCustomerId && ownerId !== resolvedCustomerId) {
      throw new Error(
        `Lead #${leadId}: project #${project.id} belongs to customer ${ownerId}, expected ${resolvedCustomerId}`,
      );
    }
  }

  const projects = projectIds.length
    ? await projectsTable.find({ id: { $in: projectIds } }).lean()
    : [];

  for (const project of projects) {
    const ownerId = project.clientId ?? project.companyId;
    if (ownerId && resolvedCustomerId && ownerId !== resolvedCustomerId) {
      throw new Error(
        `Lead #${leadId}: project #${project.id} "${project.name}" belongs to customer ${ownerId}, expected ${resolvedCustomerId}`,
      );
    }
  }

  const client = resolvedCustomerId
    ? (clientByLead ?? (await clientsTable.findOne({ id: resolvedCustomerId }).lean()))
    : null;

  return {
    lead,
    customerId: resolvedCustomerId,
    client,
    proposalIds,
    proposals,
    installmentIds,
    installments,
    invoiceIds,
    invoices,
    paymentIds: payments.map((p) => p.id),
    payments,
    projectIds,
    projects,
  };
}

function printManifest(graphs) {
  console.log("\n=== CASCADE DELETE MANIFEST ===\n");
  console.log(`Mode: ${confirm ? "EXECUTE (--confirm)" : "DRY-RUN (pass --confirm to delete)"}\n`);

  for (const g of graphs) {
    const { lead, client, proposals, installments, invoices, payments, projects } = g;
    console.log(`--- Lead #${lead.id}: ${lead.name} (${lead.status}) ---`);
    if (lead.email) console.log(`    Email: ${lead.email}`);
    if (lead.company) console.log(`    Company: ${lead.company}`);
    if (g.customerId) {
      console.log(`    Customer: #${g.customerId}${client ? ` (${client.companyName})` : ""}`);
      if (client?.userId) console.log(`    Portal user: #${client.userId}`);
    } else {
      console.log("    Customer: (none)");
    }

    if (proposals.length) {
      console.log(`    Proposals (${proposals.length}):`);
      for (const p of proposals) {
        console.log(`      - #${p.id} ${p.number} "${p.title}" [${p.status}]`);
      }
    }
    if (installments.length) {
      console.log(`    Installments (${installments.length}):`);
      for (const i of installments) {
        console.log(`      - #${i.id} "${i.name ?? i.label ?? "installment"}" [${i.status}]`);
      }
    }
    if (invoices.length) {
      console.log(`    Invoices (${invoices.length}):`);
      for (const inv of invoices) {
        console.log(`      - #${inv.id} ${inv.number} [${inv.status}]`);
      }
    }
    if (payments.length) {
      console.log(`    Payments (${payments.length}):`);
      for (const pay of payments) {
        console.log(`      - #${pay.id} amount=${pay.amount}`);
      }
    }
    if (projects.length) {
      console.log(`    Projects (${projects.length}):`);
      for (const pr of projects) {
        console.log(`      - #${pr.id} "${pr.name}" [${pr.status}]`);
      }
    }
    console.log("");
  }

  const totals = graphs.reduce(
    (acc, g) => ({
      proposals: acc.proposals + g.proposalIds.length,
      installments: acc.installments + g.installmentIds.length,
      invoices: acc.invoices + g.invoiceIds.length,
      payments: acc.payments + g.paymentIds.length,
      projects: acc.projects + g.projectIds.length,
    }),
    { proposals: 0, installments: 0, invoices: 0, payments: 0, projects: 0 },
  );
  console.log("Totals:", totals);
  console.log("\nNote: direct 1:1 discussion threads are not fully purged (client row + portal user only).\n");
}

async function countByFilter(model, filter) {
  if (!filter || (filter.$or && !filter.$or.length)) return 0;
  return model.countDocuments(filter);
}

async function deleteMany(model, filter, label, results) {
  if (!filter || (filter.$or && !filter.$or.length)) return;
  const key = label ?? model.collection.name;
  const res = await model.deleteMany(filter);
  results[key] = (results[key] ?? 0) + res.deletedCount;
}

async function deleteProjectData(projectIds, results) {
  if (!projectIds.length) return;

  const projectFilter = { projectId: { $in: projectIds } };
  const credentials = await inventoryCredentialsTable.find(projectFilter).select({ id: 1 }).lean();
  const credentialIds = credentials.map((c) => c.id);
  const apkReleases = await apkReleasesTable.find(projectFilter).select({ id: 1 }).lean();
  const apkReleaseIds = apkReleases.map((a) => a.id);

  if (credentialIds.length) {
    await deleteMany(
      inventoryCredentialAccessLogsTable,
      { credentialId: { $in: credentialIds } },
      "inventoryCredentialAccessLogs",
      results,
    );
  }
  if (apkReleaseIds.length) {
    await deleteMany(apkDownloadLogsTable, { apkReleaseId: { $in: apkReleaseIds } }, "apkDownloadLogs", results);
  }

  const projectScoped = [
    [bugsTable, projectFilter, "bugs"],
    [tasksTable, projectFilter, "tasks"],
    [ticketsTable, projectFilter, "tickets"],
    [dailyLogsTable, projectFilter, "dailyLogs"],
    [commentsTable, projectFilter, "comments(project)"],
    [apkReleasesTable, projectFilter, "apkReleases"],
    [reportsTable, projectFilter, "reports"],
    [resourceRequestsTable, projectFilter, "resourceRequests"],
    [notificationsTable, projectFilter, "notifications(project)"],
    [inventoryActivitiesTable, projectFilter, "inventoryActivities"],
    [inventorySubscriptionsTable, projectFilter, "inventorySubscriptions"],
    [inventoryDevicesTable, projectFilter, "inventoryDevices"],
    [inventoryEnvironmentsTable, projectFilter, "inventoryEnvironments"],
    [inventoryCredentialsTable, projectFilter, "inventoryCredentials"],
    [inventoryResourcesTable, projectFilter, "inventoryResources"],
    [inventoryFoldersTable, projectFilter, "inventoryFolders"],
    [employeeScreenshotsTable, projectFilter, "employeeScreenshots"],
    [projectMembersTable, projectFilter, "projectMembers"],
    [milestonesTable, projectFilter, "milestones"],
    [apkSchedulesTable, projectFilter, "apkSchedules"],
  ];

  for (const [model, filter, label] of projectScoped) {
    await deleteMany(model, filter, label, results);
  }

  await deleteMany(projectsTable, { id: { $in: projectIds } }, "projects", results);
}

async function deleteClientScopedData(customerIds, results) {
  if (!customerIds.length) return;
  const companyFilter = { companyId: { $in: customerIds } };
  const clientScoped = [
    [ticketsTable, companyFilter, "tickets(company)"],
    [tasksTable, companyFilter, "tasks(company)"],
    [bugsTable, companyFilter, "bugs(company)"],
    [commentsTable, companyFilter, "comments(company)"],
    [dailyLogsTable, companyFilter, "dailyLogs(company)"],
    [apkReleasesTable, companyFilter, "apkReleases(company)"],
    [reportsTable, companyFilter, "reports(company)"],
    [notificationsTable, companyFilter, "notifications(company)"],
    [resourceRequestsTable, companyFilter, "resourceRequests(company)"],
  ];
  for (const [model, filter, label] of clientScoped) {
    await deleteMany(model, filter, label, results);
  }
}

async function executeCascade(graphs) {
  const results = {};
  const allProposalIds = unique(graphs.flatMap((g) => g.proposalIds));
  const allInstallmentIds = unique(graphs.flatMap((g) => g.installmentIds));
  const allInvoiceIds = unique(graphs.flatMap((g) => g.invoiceIds));
  const allPaymentIds = unique(graphs.flatMap((g) => g.paymentIds));
  const allProjectIds = unique(graphs.flatMap((g) => g.projectIds));
  const allCustomerIds = unique(graphs.map((g) => g.customerId).filter(Boolean));
  const allLeadIds = graphs.map((g) => g.lead.id);

  const paymentFilter = allPaymentIds.length
    ? { id: { $in: allPaymentIds } }
    : allCustomerIds.length
      ? { customerId: { $in: allCustomerIds } }
      : null;
  await deleteMany(SalesPayments, paymentFilter, "salesPayments", results);

  const invoiceFilter = allInvoiceIds.length
    ? { id: { $in: allInvoiceIds } }
    : allCustomerIds.length
      ? { customerId: { $in: allCustomerIds } }
      : null;
  await deleteMany(SalesInvoices, invoiceFilter, "salesInvoices", results);

  const installmentFilter = allInstallmentIds.length
    ? { id: { $in: allInstallmentIds } }
    : allCustomerIds.length
      ? { customerId: { $in: allCustomerIds } }
      : null;
  await deleteMany(SalesInstallments, installmentFilter, "salesInstallments", results);

  if (allProposalIds.length) {
    await deleteMany(SalesProposalLogs, { proposalId: { $in: allProposalIds } }, "salesProposalLogs", results);
    await deleteMany(SalesProposalComments, { proposalId: { $in: allProposalIds } }, "salesProposalComments", results);
    await deleteMany(SalesProposals, { id: { $in: allProposalIds } }, "salesProposals", results);
  }

  await deleteProjectData(allProjectIds, results);
  await deleteClientScopedData(allCustomerIds, results);

  if (allCustomerIds.length) {
    await deleteMany(clientTeamMembersTable, { clientCompanyId: { $in: allCustomerIds } }, "clientTeamMembers", results);
    await deleteMany(clientTeamActivityTable, { clientCompanyId: { $in: allCustomerIds } }, "clientTeamActivity", results);
  }

  await deleteMany(SalesLeadActivity, { leadId: { $in: allLeadIds } }, "salesLeadActivity", results);
  await deleteMany(SalesFollowUps, { leadId: { $in: allLeadIds } }, "salesFollowUps", results);
  await deleteMany(SalesLeads, { id: { $in: allLeadIds } }, "salesLeads", results);

  for (const customerId of allCustomerIds) {
    const client = await clientsTable.findOne({ id: customerId }).lean();
    if (client) {
      await deleteClientCompany(client);
      results.clients = (results.clients ?? 0) + 1;
      if (client.userId) results.portalUsers = (results.portalUsers ?? 0) + 1;
    }
  }

  return results;
}

async function previewCounts(graphs) {
  const allProposalIds = unique(graphs.flatMap((g) => g.proposalIds));
  const allInstallmentIds = unique(graphs.flatMap((g) => g.installmentIds));
  const allInvoiceIds = unique(graphs.flatMap((g) => g.invoiceIds));
  const allPaymentIds = unique(graphs.flatMap((g) => g.paymentIds));
  const allProjectIds = unique(graphs.flatMap((g) => g.projectIds));
  const allCustomerIds = unique(graphs.map((g) => g.customerId).filter(Boolean));
  const allLeadIds = graphs.map((g) => g.lead.id);

  const projectFilter = allProjectIds.length ? { projectId: { $in: allProjectIds } } : null;
  const companyFilter = allCustomerIds.length ? { companyId: { $in: allCustomerIds } } : null;

  const counts = {
    salesPayments: allPaymentIds.length,
    salesInvoices: allInvoiceIds.length,
    salesInstallments: allInstallmentIds.length,
    salesProposalLogs: allProposalIds.length
      ? await SalesProposalLogs.countDocuments({ proposalId: { $in: allProposalIds } })
      : 0,
    salesProposalComments: allProposalIds.length
      ? await SalesProposalComments.countDocuments({ proposalId: { $in: allProposalIds } })
      : 0,
    salesProposals: allProposalIds.length,
    projects: allProjectIds.length,
    salesLeadActivity: await SalesLeadActivity.countDocuments({ leadId: { $in: allLeadIds } }),
    salesFollowUps: await SalesFollowUps.countDocuments({ leadId: { $in: allLeadIds } }),
    salesLeads: allLeadIds.length,
    clients: allCustomerIds.length,
  };

  if (projectFilter) {
    counts.bugs = await bugsTable.countDocuments(projectFilter);
    counts.tasks = await tasksTable.countDocuments(projectFilter);
    counts.tickets = await ticketsTable.countDocuments(projectFilter);
    counts.projectMembers = await projectMembersTable.countDocuments(projectFilter);
  }
  if (companyFilter) {
    counts.clientTeamMembers = await clientTeamMembersTable.countDocuments({ clientCompanyId: { $in: allCustomerIds } });
  }

  return counts;
}

await mongoose.connect(process.env.DATABASE_URL);

try {
  const graphs = [];
  for (const leadId of leadIds) {
    graphs.push(await discoverLeadGraph(leadId));
  }

  printManifest(graphs);

  if (!confirm) {
    const counts = await previewCounts(graphs);
    console.log("Estimated deletions:", counts);
    console.log("\nRe-run with --confirm to execute.\n");
  } else {
    const results = await executeCascade(graphs);
    console.log("Deletion results:", results);
    console.log("\nDone.\n");
  }
} catch (err) {
  console.error("Error:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
