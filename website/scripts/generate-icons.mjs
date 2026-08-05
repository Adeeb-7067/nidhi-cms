/**
 * Bake favicon / app icons from the SK brand logo.
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "brand", "sk-logo.png");
const appDir = path.join(root, "src", "app");
const publicDir = path.join(root, "public");
const brandDir = path.join(publicDir, "brand");

const bg = { r: 2, g: 3, b: 5, alpha: 1 };

async function squarePng(size, out) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: bg })
    .png()
    .toFile(out);
  console.log("wrote", path.relative(root, out));
}

async function makeIco(sizes, outPath) {
  const images = [];
  for (const size of sizes) {
    const png = await sharp(src)
      .resize(size, size, { fit: "contain", background: bg })
      .png()
      .toBuffer();
    images.push({ size, png });
  }

  const headerSize = 6;
  const dirSize = 16 * images.length;
  let offset = headerSize + dirSize;
  const dirs = [];
  for (const img of images) {
    dirs.push({ size: img.size, bytes: img.png.length, offset });
    offset += img.png.length;
  }

  const buf = Buffer.alloc(offset);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(images.length, 4);

  let o = 6;
  for (const d of dirs) {
    buf.writeUInt8(d.size >= 256 ? 0 : d.size, o++);
    buf.writeUInt8(d.size >= 256 ? 0 : d.size, o++);
    buf.writeUInt8(0, o++);
    buf.writeUInt8(0, o++);
    buf.writeUInt16LE(1, o);
    o += 2;
    buf.writeUInt16LE(32, o);
    o += 2;
    buf.writeUInt32LE(d.bytes, o);
    o += 4;
    buf.writeUInt32LE(d.offset, o);
    o += 4;
  }

  for (const img of images) {
    const d = dirs.find((x) => x.size === img.size);
    img.png.copy(buf, d.offset);
  }

  fs.writeFileSync(outPath, buf);
  console.log("wrote", path.relative(root, outPath), `(${buf.length} bytes)`);
}

if (!fs.existsSync(src)) {
  console.error("Missing logo:", src);
  process.exit(1);
}

await squarePng(32, path.join(appDir, "icon.png"));
await squarePng(180, path.join(appDir, "apple-icon.png"));
await squarePng(192, path.join(brandDir, "sk-icon-192.png"));
await squarePng(512, path.join(brandDir, "sk-icon-512.png"));
await makeIco([16, 32, 48], path.join(appDir, "favicon.ico"));
await makeIco([16, 32, 48], path.join(publicDir, "favicon.ico"));

const png64 = await sharp(src)
  .resize(64, 64, { fit: "contain", background: bg })
  .png()
  .toBuffer();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Satyakabir Technologies">
  <rect width="64" height="64" rx="14" fill="#020305"/>
  <image href="data:image/png;base64,${png64.toString("base64")}" width="64" height="64" />
</svg>
`;
fs.writeFileSync(path.join(publicDir, "favicon.svg"), svg);
console.log("wrote public/favicon.svg");
console.log("Done.");
