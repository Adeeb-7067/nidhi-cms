/**
 * Bake seek-friendly scrub assets from the master film.
 * Usage: node scripts/encode-scrub.mjs
 *
 * Outputs (public/):
 *   TITLE__Satyakabir_Technologies.scrub.mp4   — dense keyframes, desktop
 *   TITLE__Satyakabir_Technologies.scrub.webm  — VP9 when available
 *   TITLE__Satyakabir_Technologies.scrub.mobile.mp4 — lighter mobile
 *   TITLE__Satyakabir_Technologies.poster.jpg  — first-paint poster
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const ffmpeg = require("ffmpeg-static");
const input = path.join(root, "public", "TITLE__Satyakabir_Technologies.mp4");
const outDir = path.join(root, "public");

if (!fs.existsSync(input)) {
  console.error("Missing master:", input);
  process.exit(1);
}

function run(label, args) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(ffmpeg, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.warn(`  skipped/failed: ${label} (exit ${result.status})`);
    return false;
  }
  return true;
}

const desktopMp4 = path.join(outDir, "TITLE__Satyakabir_Technologies.scrub.mp4");
const mobileMp4 = path.join(outDir, "TITLE__Satyakabir_Technologies.scrub.mobile.mp4");
const webm = path.join(outDir, "TITLE__Satyakabir_Technologies.scrub.webm");
const poster = path.join(outDir, "TITLE__Satyakabir_Technologies.poster.jpg");

run("desktop scrub mp4 (dense keyframes)", [
  "-y",
  "-i",
  input,
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-profile:v",
  "high",
  "-pix_fmt",
  "yuv420p",
  "-vf",
  "scale=1280:-2",
  "-g",
  "1",
  "-keyint_min",
  "1",
  "-sc_threshold",
  "0",
  "-bf",
  "0",
  "-b:v",
  "3500k",
  "-maxrate",
  "4000k",
  "-bufsize",
  "7000k",
  "-movflags",
  "+faststart",
  desktopMp4,
]);

run("mobile scrub mp4", [
  "-y",
  "-i",
  input,
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-pix_fmt",
  "yuv420p",
  "-vf",
  "scale=854:-2",
  "-g",
  "1",
  "-keyint_min",
  "1",
  "-sc_threshold",
  "0",
  "-bf",
  "0",
  "-b:v",
  "1200k",
  "-maxrate",
  "1500k",
  "-bufsize",
  "2400k",
  "-movflags",
  "+faststart",
  mobileMp4,
]);

run("scrub webm (VP9)", [
  "-y",
  "-i",
  input,
  "-an",
  "-c:v",
  "libvpx-vp9",
  "-b:v",
  "2200k",
  "-vf",
  "scale=1280:-2",
  "-g",
  "1",
  "-keyint_min",
  "1",
  "-row-mt",
  "1",
  "-cpu-used",
  "2",
  webm,
]);

run("poster jpg", [
  "-y",
  "-ss",
  "0.05",
  "-i",
  input,
  "-frames:v",
  "1",
  "-q:v",
  "3",
  "-vf",
  "scale=1920:-2",
  poster,
]);

function sizeMb(file) {
  if (!fs.existsSync(file)) return "missing";
  return `${(fs.statSync(file).size / (1024 * 1024)).toFixed(2)} MB`;
}

console.log("\nDone:");
console.log("  desktop mp4:", sizeMb(desktopMp4));
console.log("  mobile mp4: ", sizeMb(mobileMp4));
console.log("  webm:       ", sizeMb(webm));
console.log("  poster:     ", sizeMb(poster));
