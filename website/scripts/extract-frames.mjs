/**
 * Extract scrub frames from the headquarters MP4.
 * Usage: node scripts/extract-frames.mjs
 *
 * These JPGs are the fallback path for browsers where MP4 seeking is too
 * unreliable to scrub; the primary path is the dense-keyframe MP4 baked by
 * encode-scrub.mjs.
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
const outDir = path.join(root, "public", "frames");
const fps = 72;

if (!fs.existsSync(input)) {
  console.error("Missing master:", input);
  process.exit(1);
}

/** Master dimensions, read off ffmpeg's stream banner (no ffprobe dependency). */
function probeWidth(file) {
  const out = spawnSync(ffmpeg, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const line = `${out.stderr || ""}`.split("\n").find((l) => l.includes("Video:"));
  const match = line && line.match(/,\s(\d{2,5})x(\d{2,5})[\s,]/);
  return match ? Number(match[1]) : null;
}

const sourceWidth = probeWidth(input);
if (!sourceWidth) {
  console.error("Could not read master dimensions from", input);
  process.exit(1);
}

// Cap at the master's own width. This used to hardcode `scale=1920:-2`, which
// upscaled a 1280x720 master into JPGs that merely looked like 1080p — bigger
// files, no extra detail, and a misleading signal about the film's real quality.
const width = Math.min(sourceWidth, 1920);

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) {
  if (/^frame\d+\.jpg$/i.test(f)) fs.unlinkSync(path.join(outDir, f));
}

const args = [
  "-y",
  "-i",
  input,
  "-vf",
  `fps=${fps},scale=${width}:-2:flags=lanczos`,
  "-q:v",
  "3",
  path.join(outDir, "frame%04d.jpg"),
];

console.log(`Extracting frames at ${width}px wide (master ${sourceWidth}px)…`);
const result = spawnSync(ffmpeg, args, { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);

const count = fs.readdirSync(outDir).filter((f) => /^frame\d+\.jpg$/i.test(f)).length;
console.log(`Done: ${count} frames → public/frames/`);
console.log(`Update TOTAL_FRAMES in src/data/cinematic.ts to ${count} if it changed.`);
