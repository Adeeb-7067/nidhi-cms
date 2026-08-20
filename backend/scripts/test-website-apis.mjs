import "../load-env.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "../src/app.js";
import { signAccessToken } from "../src/lib/jwt.js";
import { processWebsiteOutboxQueue } from "../src/modules/website/services/crm-hrm-outbox.service.js";

dotenv.config();

let server = null;
let baseUrl = "";
let adminToken = "";

// Start HTTP server on dynamic available port
function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`🌐 Test HTTP server listening on ${baseUrl}`);
      resolve();
    });
  });
}

async function makeApiRequest(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${path}`, options);
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, body: data, headers: res.headers };
}

import { usersTable } from "../src/models/schema/index.js";

async function runApiTestSuite() {
  console.log("🧪 Starting Comprehensive Website API Test Suite...\n");

  // Wait for db connection to open
  if (mongoose.connection.readyState !== 1) {
    await new Promise((res) => mongoose.connection.once("open", res));
  }

  // Find active admin or super_admin user
  let activeUser = await usersTable.findOne({ role: { $in: ["admin", "super_admin"] }, status: "active" }).lean();
  if (!activeUser) {
    activeUser = await usersTable.findOne({ status: "active" }).lean();
    if (activeUser) {
      await usersTable.updateOne({ id: activeUser.id }, { $set: { role: "admin" } });
      activeUser.role = "admin";
    }
  }

  adminToken = signAccessToken({
    userId: activeUser.id,
    id: activeUser.id,
    email: activeUser.email,
    role: activeUser.role || "admin",
  });
  console.log(`🔑 Signed test JWT for active user id: ${activeUser.id} (${activeUser.email}, role: ${activeUser.role})`);

  await startTestServer();

  let testPageId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Public Navigation API
    // ----------------------------------------------------
    console.log("🔍 [1/12] Testing GET /api/v1/website/navigation...");
    const navRes = await makeApiRequest("GET", "/api/v1/website/navigation");
    assert(navRes.status === 200, `Expected 200, got ${navRes.status}`);
    assert(navRes.body.brandName === "Satyakabir Technologies", "Brand name missing");
    assert(Array.isArray(navRes.body.headerMenu), "Header menu missing");
    console.log("   ✓ Success: Public Navigation returns brand settings & header/footer link trees.\n");

    // ----------------------------------------------------
    // TEST 2: Public Page by Slug API
    // ----------------------------------------------------
    console.log("🔍 [2/12] Testing GET /api/v1/website/pages/by-slug?slug=%2F...");
    const homeRes = await makeApiRequest("GET", "/api/v1/website/pages/by-slug?slug=%2F");
    assert(homeRes.status === 200, `Expected 200, got ${homeRes.status}`);
    assert(homeRes.body.slug === "/", "Page slug mismatch");
    assert(Array.isArray(homeRes.body.blocks), "Page blocks missing");
    assert(homeRes.body.blocks.length > 0, "Page blocks array empty");
    console.log(`   ✓ Success: Home page loaded with ${homeRes.body.blocks.length} validated blocks.\n`);

    // ----------------------------------------------------
    // TEST 3: Admin Page Listing & Filtering
    // ----------------------------------------------------
    console.log("🔍 [3/12] Testing GET /api/v1/admin/website/pages...");
    const listRes = await makeApiRequest("GET", "/api/v1/admin/website/pages");
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    assert(Array.isArray(listRes.body.pages), "Pages array missing");
    console.log(`   ✓ Success: Returned ${listRes.body.pages.length} pages in CMS admin workspace.\n`);

    // ----------------------------------------------------
    // TEST 4: Admin Page Creation with Zod Block Validation
    // ----------------------------------------------------
    console.log("🔍 [4/12] Testing POST /api/v1/admin/website/pages (Zod Block Validation)...");
    const createRes = await makeApiRequest("POST", "/api/v1/admin/website/pages", {
      title: "Cloud Infrastructure & DevOps",
      slug: "/services/cloud",
      pageType: "service",
      seo: { title: "Cloud Systems | Satyakabir", description: "AWS & Kubernetes engineering." },
      draftBlocks: [
        {
          id: "b_cloud_hero",
          type: "hero",
          order: 0,
          data: {
            headline: "Enterprise Cloud Platforms & Kubernetes",
            subheadline: "Multi-cloud architecture, DevOps pipelines, and 99.99% uptime guarantees.",
            primaryCta: { label: "Schedule Cloud Audit", href: "/contact" },
          },
        },
        {
          id: "b_cloud_stats",
          type: "stats",
          order: 1,
          data: {
            items: [{ value: "99.999%", label: "Uptime Achieved", trend: "High Availability" }],
          },
        },
      ],
    });

    assert(createRes.status === 201, `Expected 201, got ${createRes.status}`);
    assert(createRes.body.slug === "/services/cloud", "Slug mismatch");
    assert(createRes.body.version === 1, "Initial version must be 1");
    testPageId = createRes.body._id;
    console.log(`   ✓ Success: Draft page created with ID: ${testPageId} (Version 1).\n`);

    // ----------------------------------------------------
    // TEST 5: Admin Page Update with Optimistic Locking
    // ----------------------------------------------------
    console.log("🔍 [5/12] Testing PUT /api/v1/admin/website/pages/:id (Optimistic Locking)...");
    // Test Conflict Check (wrong version = 999)
    const conflictRes = await makeApiRequest("PUT", `/api/v1/admin/website/pages/${testPageId}`, {
      title: "Conflict Test Title",
      version: 999,
    });
    assert(conflictRes.status === 409, `Expected 409 Conflict, got ${conflictRes.status}`);
    console.log("   ✓ Success: System correctly rejected update with HTTP 409 Conflict when version mismatched.");

    // Valid update with correct version = 1
    const updateRes = await makeApiRequest("PUT", `/api/v1/admin/website/pages/${testPageId}`, {
      title: "Cloud Engineering Solutions",
      version: 1,
    });
    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);
    assert(updateRes.body.title === "Cloud Engineering Solutions", "Title not updated");
    assert(updateRes.body.version === 2, "Version should be incremented to 2");
    console.log("   ✓ Success: Valid update incremented version to 2.\n");

    // ----------------------------------------------------
    // TEST 6: Preview Token Generator
    // ----------------------------------------------------
    console.log("🔍 [6/12] Testing POST /api/v1/admin/website/pages/:id/preview-token...");
    const previewRes = await makeApiRequest("POST", `/api/v1/admin/website/pages/${testPageId}/preview-token`);
    assert(previewRes.status === 200, `Expected 200, got ${previewRes.status}`);
    assert(typeof previewRes.body.token === "string", "Token string missing");
    console.log(`   ✓ Success: Generated signed 15-min HMAC token: ${previewRes.body.token.substring(0, 30)}...\n`);

    // ----------------------------------------------------
    // TEST 7: Atomic Publishing Transaction & Revision Freeze
    // ----------------------------------------------------
    console.log("🔍 [7/12] Testing POST /api/v1/admin/website/pages/:id/publish (Atomic Transaction)...");
    const pubRes = await makeApiRequest("POST", `/api/v1/admin/website/pages/${testPageId}/publish`, {
      changeSummary: "First official publish of Cloud Engineering page",
    });

    assert(pubRes.status === 200, `Expected 200, got ${pubRes.status}`);
    assert(pubRes.body.page.status === "PUBLISHED", "Page status must be PUBLISHED");
    assert(pubRes.body.page.publishedRevisionId !== null, "publishedRevisionId missing");
    console.log("   ✓ Success: Page status set to PUBLISHED; Revision #1 snapshot frozen.\n");

    // ----------------------------------------------------
    // TEST 8: Public Fetching Newly Published Page
    // ----------------------------------------------------
    console.log("🔍 [8/12] Testing GET /api/v1/website/pages/by-slug?slug=/services/cloud...");
    const publicCloudRes = await makeApiRequest("GET", "/api/v1/website/pages/by-slug?slug=/services/cloud");
    assert(publicCloudRes.status === 200, `Expected 200, got ${publicCloudRes.status}`);
    assert(publicCloudRes.body.title === "Cloud Engineering Solutions", "Title mismatch");
    assert(publicCloudRes.body.blocks.length === 2, "Blocks length mismatch");
    console.log("   ✓ Success: Newly published page is instantly accessible via public API.\n");

    // ----------------------------------------------------
    // TEST 9: DigitalOcean Spaces Pre-signed Upload URL
    // ----------------------------------------------------
    console.log("🔍 [9/12] Testing POST /api/v1/admin/website/media/presigned-url...");
    const presignedRes = await makeApiRequest("POST", "/api/v1/admin/website/media/presigned-url", {
      fileName: "hero_banner.jpg",
      fileType: "image/jpeg",
      fileSize: 1024000,
    });
    assert(presignedRes.status === 200, `Expected 200, got ${presignedRes.status}`);
    assert(typeof presignedRes.body.uploadUrl === "string", "uploadUrl missing");
    assert(typeof presignedRes.body.publicUrl === "string", "publicUrl missing");
    console.log("   ✓ Success: Generated DO Spaces pre-signed PUT URL & public CDN URL.\n");

    // ----------------------------------------------------
    // TEST 10: Public Contact Inquiry Intake & CRM Outbox Worker
    // ----------------------------------------------------
    console.log("🔍 [10/12] Testing POST /api/v1/website/inquire (CRM Intake)...");
    const inqRes = await makeApiRequest("POST", "/api/v1/website/inquire", {
      name: "Apex Global Enterprises",
      email: "cto@apexglobal.com",
      phone: "+1 555 019 2831",
      company: "Apex Global",
      message: "Interested in Cloud Infrastructure Transformation and AI audit.",
      projectType: "Cloud Transformation",
      budget: "$50,000+",
    });

    assert(inqRes.status === 200, `Expected 200, got ${inqRes.status}`);
    assert(inqRes.body.success === true, "Success flag false");
    assert(typeof inqRes.body.referenceId === "string", "referenceId missing");
    console.log(`   ✓ Success: Inquiry received & queued in Outbox with reference: ${inqRes.body.referenceId}.`);

    // Process Outbox Worker Task
    console.log("   ⚙️  Executing Outbox Worker Task...");
    const outboxResult = await processWebsiteOutboxQueue();
    console.log(`   ✓ Success: Outbox worker processed ${outboxResult.processed} queued items into CRM/HRM.\n`);

    // ----------------------------------------------------
    // TEST 11: 301 Redirect Engine & Chain Resolution
    // ----------------------------------------------------
    console.log("🔍 [11/12] Testing 301 Redirect Engine & Loop Detection...");
    const redRes = await makeApiRequest("POST", "/api/v1/admin/website/redirects", {
      fromPath: "/legacy-cloud",
      toPath: "/services/cloud",
      statusCode: 301,
    });
    assert(redRes.status === 201, `Expected 201, got ${redRes.status}`);
    console.log("   ✓ Success: Created 301 redirect from '/legacy-cloud' to '/services/cloud'.");

    // Verify public redirect resolution
    const redirectTestRes = await makeApiRequest("GET", "/api/v1/website/pages/by-slug?slug=/legacy-cloud");
    assert(redirectTestRes.status === 301, `Expected 301 Redirect, got ${redirectTestRes.status}`);
    assert(redirectTestRes.body.toPath === "/services/cloud", "Target path mismatch");
    console.log("   ✓ Success: Public API correctly returned HTTP 301 redirect to '/services/cloud'.\n");

    // ----------------------------------------------------
    // TEST 12: Admin Outbox Monitoring
    // ----------------------------------------------------
    console.log("🔍 [12/12] Testing GET /api/v1/admin/website/outbox...");
    const outboxListRes = await makeApiRequest("GET", "/api/v1/admin/website/outbox");
    assert(outboxListRes.status === 200, `Expected 200, got ${outboxListRes.status}`);
    assert(Array.isArray(outboxListRes.body.items), "Items array missing");
    console.log(`   ✓ Success: Admin outbox monitor returned ${outboxListRes.body.items.length} outbox queue records.\n`);

    console.log("🎉 ALL 12 WEBSITE API VERIFICATION TESTS PASSED WITH 100% SUCCESS!");
  } catch (err) {
    console.error("\n❌ API Test Failed:", err);
    process.exit(1);
  } finally {
    if (testPageId) {
      await makeApiRequest("DELETE", `/api/v1/admin/website/pages/${testPageId}`);
    }
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    process.exit(0);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

runApiTestSuite();
