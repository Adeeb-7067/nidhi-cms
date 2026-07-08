// One-off: configure DigitalOcean Spaces bucket CORS so the browser can PUT
// directly to object storage (bypasses nginx/Node for large file uploads).
// Run from backend/: node scripts/configure-bucket-cors.mjs
import dotenv from "dotenv";
import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";

dotenv.config();

const bucket = process.env.LINODE_OBJECT_BUCKET;
const region = process.env.LINODE_OBJECT_STORAGE_REGION || "sgp1";
const endpoint = (process.env.LINODE_OBJECT_STORAGE_ENDPOINT || "").replace(/\/$/, "");

if (!bucket || !endpoint || !process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID) {
  console.error("Missing LINODE_OBJECT_* env vars — check backend/.env");
  process.exit(1);
}

const client = new S3Client({
  region,
  endpoint,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY,
  },
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
// Always include local dev origins even if not in ALLOWED_ORIGINS.
for (const dev of ["http://localhost:5173", "http://127.0.0.1:5173"]) {
  if (!allowedOrigins.includes(dev)) allowedOrigins.push(dev);
}

console.log("Bucket:", bucket, "| Endpoint:", endpoint, "| Region:", region);
console.log("Allowed origins:", allowedOrigins);

console.log("\n--- Current CORS config ---");
try {
  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log(JSON.stringify(current.CORSRules, null, 2));
} catch (err) {
  console.log("(none set yet)", err.name);
}

const corsConfig = {
  Bucket: bucket,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: allowedOrigins,
        AllowedMethods: ["GET", "PUT", "HEAD"],
        AllowedHeaders: ["Content-Type", "x-amz-acl", "x-amz-meta-*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
  },
};

console.log("\n--- Applying new CORS config ---");
await client.send(new PutBucketCorsCommand(corsConfig));
console.log("Done.");

console.log("\n--- Verifying ---");
const verify = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
console.log(JSON.stringify(verify.CORSRules, null, 2));
