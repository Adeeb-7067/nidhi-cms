/**
 * Extract scrub frames from the headquarters MP4.
 * Usage: node scripts/extract-frames.mjs
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ffmpeg = require("ffmpeg-static");
const input = path.join(root, "public", "TITLE__Satyakabir_Technologies.mp4");
const outDir = path.join(root, "public", "frames");
const fps = 72;

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) {
  if (/^frame\d+\.jpg$/i.test(f)) fs.unlinkSync(path.join(outDir, f));
}

const args = [
  "-y",
  "-i",
  input,
  "-vf",
  `fps=${fps},scale=1920:-2`,
  "-q:v",
  "3",
  path.join(outDir, "frame%04d.jpg"),
];

console.log("Extracting frames…");
const result = spawnSync(ffmpeg, args, { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);

const count = fs.readdirSync(outDir).filter((f) => /^frame\d+\.jpg$/i.test(f)).length;
console.log(`Done: ${count} frames → public/frames/`);
console.log(`Update TOTAL_FRAMES in src/data/cinematic.ts to ${count} if it changed.`);
