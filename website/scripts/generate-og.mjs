/**
 * Generate Open Graph share image (1200×630).
 * Usage: node scripts/generate-og.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "brand", "sk-logo.png");
const outPath = path.join(root, "public", "brand", "og-default.jpg");
const W = 1200;
const H = 630;

const logo = await sharp(logoPath)
  .resize(180, 180, {
    fit: "contain",
    background: { r: 2, g: 3, b: 5, alpha: 0 },
  })
  .png()
  .toBuffer();

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#020305"/>
  <defs>
    <radialGradient id="g" cx="70%" cy="20%" r="55%">
      <stop offset="0%" stop-color="#2B6BFF" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#2B6BFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="120" y="290" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#ffffff">Satyakabir Technologies</text>
  <text x="120" y="360" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#c8d0da">AI · Cloud · Product Engineering</text>
  <text x="120" y="520" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#8e98a6">Bengaluru · Remote-first · Global delivery</text>
</svg>`);

await sharp(svg)
  .composite([{ input: logo, left: 120, top: 90 }])
  .jpeg({ quality: 88 })
  .toFile(outPath);

console.log("wrote", path.relative(root, outPath), fs.statSync(outPath).size, "bytes");
