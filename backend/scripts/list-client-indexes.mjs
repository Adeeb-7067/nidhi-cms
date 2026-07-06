import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });
await mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection.db;

console.log("clients indexes:");
console.log(JSON.stringify(await db.collection("clients").indexes(), null, 2));

console.log("\nusers indexes (email related):");
const userIdx = await db.collection("users").indexes();
console.log(JSON.stringify(userIdx.filter((i) => JSON.stringify(i.key).includes("email")), null, 2));

await mongoose.disconnect();
