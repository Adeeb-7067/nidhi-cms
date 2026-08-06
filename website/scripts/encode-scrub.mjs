/**
 * Bake seek-friendly scrub assets from the master film.
 * Usage: node scripts/encode-scrub.mjs [--webm]
 *
 * Every output is derived from the master and capped to its resolution, so
 * dropping in a sharper master and re-running is the whole upgrade path — no
 * hardcoded 720p/1080p numbers to chase.
 *
 * Outputs (public/):
 *   TITLE__Satyakabir_Technologies.scrub.mp4   — dense keyframes, desktop
 *   TITLE__Satyakabir_Technologies.scrub.mobile.mp4 — lighter mobile
 *   TITLE__Satyakabir_Technologies.poster.jpg  — first-paint poster
 *   TITLE__Satyakabir_Technologies.scrub.webm  — VP9, only with --webm (unused)
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
const wantWebm = process.argv.includes("--webm");

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

/** Master dimensions, read off ffmpeg's stream banner (no ffprobe dependency). */
function probeSize(file) {
  const out = spawnSync(ffmpeg, ["-hide_banner", "-i", file], {
    encoding: "utf8",
  });
  const line = `${out.stderr || ""}`.split("\n").find((l) => l.includes("Video:"));
  const match = line && line.match(/,\s(\d{2,5})x(\d{2,5})[\s,]/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

const source = probeSize(input);
if (!source) {
  console.error("Could not read master dimensions from", input);
  process.exit(1);
}

/**
 * Never scale past the master. Upscaling at encode time invents no detail and
 * multiplies the download; the canvas upscales at draw time for free.
 *
 * The unsharp pass only earns its keep when the encode lands below 1920 wide,
 * because that is the case where the browser has to stretch the frame to fill a
 * desktop canvas. At 1920 the draw is roughly 1:1 and sharpening just crunches.
 */
const DESKTOP_CAP = 1920;
const desktopWidth = Math.min(source.width, DESKTOP_CAP);
const upscaledAtRuntime = desktopWidth < DESKTOP_CAP;
// Sub-1080 masters get a real sharpen pass — soft encode + soft canvas upscale
// is what made the tour look foggy. Stay mild enough to avoid halos.
const desktopFilter = [
  `scale=${desktopWidth}:-2:flags=lanczos`,
  upscaledAtRuntime ? "unsharp=5:5:0.85:5:5:0.25" : null,
]
  .filter(Boolean)
  .join(",");

// All-intra needs far more headroom at 1080p than at 720p.
const desktopMaxrate = desktopWidth >= 1600 ? "16000k" : "10000k";
const desktopBufsize = desktopWidth >= 1600 ? "24000k" : "14000k";
const desktopCrf = desktopWidth >= 1600 ? "18" : "16";
const posterWidth = Math.min(source.width, 1920);
const mobileWidth = Math.min(source.width, 854);

console.log(
  `Master: ${source.width}x${source.height} → desktop scrub ${desktopWidth}px` +
    `${upscaledAtRuntime ? " (sub-1080p source: sharpening enabled)" : ""}`,
);

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
  "slow",
  "-profile:v",
  "high",
  "-pix_fmt",
  "yuv420p",
  "-vf",
  desktopFilter,
  "-g",
  "1",
  "-keyint_min",
  "1",
  "-sc_threshold",
  "0",
  "-bf",
  "0",
  // Capped CRF. Do NOT add -b:v here: ffmpeg switches to ABR and ignores CRF,
  // which is how this encode previously ballooned to 10 MB with no visible gain.
  "-crf",
  desktopCrf,
  "-maxrate",
  desktopMaxrate,
  "-bufsize",
  desktopBufsize,
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
  `scale=${mobileWidth}:-2`,
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

// Opt-in: `useFrameScrubber` only ever requests the three MP4s, so this output
// is dead weight by default — it was costing ~70s per run and 12 MB on disk.
if (wantWebm) {
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
    `scale=${desktopWidth}:-2`,
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
}

run("poster jpg", [
  "-y",
  "-ss",
  "0.05",
  "-i",
  input,
  "-frames:v",
  "1",
  "-q:v",
  "2",
  "-vf",
  upscaledAtRuntime
    ? `scale=${posterWidth}:-2:flags=lanczos,unsharp=5:5:0.7:5:5:0.2`
    : `scale=${posterWidth}:-2:flags=lanczos`,
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
