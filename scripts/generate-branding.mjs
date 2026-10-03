// Deterministic derivatives of the approved artwork. No generated/repainted logo.
// Usage: node scripts/generate-branding.mjs [path-to-approved-master]
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const root = process.cwd();
const source = process.argv[2] ?? "public/branding/approved-logo.png";
const master = await fs.readFile(source);
const sha256 = crypto.createHash("sha256").update(master).digest("hex");
if (sha256 !== "c08d5eda9996623d82efd78f7b8e460499c02e4bf3402852a7a3392b6390e571") {
  throw Error("The source does not match the approved master; refusing to replace branding.");
}
const metadata = await sharp(master).metadata();
if (!metadata.hasAlpha || metadata.width !== metadata.height) throw Error("Expected the approved transparent square PNG.");
const output = "public/branding/v2";
await fs.mkdir(output, { recursive: true });
if (path.resolve(source) !== path.resolve("public/branding/approved-logo.png")) {
  await fs.writeFile("public/branding/approved-logo.png", master);
}
const inventory = [];
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
async function canvas(width, height, artworkSize, background = transparent) {
  const art = await sharp(master).resize(artworkSize, artworkSize, { kernel: "lanczos3" }).png().toBuffer();
  return sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: art, gravity: "centre" }]);
}
async function write(name, width, height, artworkSize, background = transparent) {
  const file = `${output}/${name}`;
  const pipeline = await canvas(width, height, artworkSize, background);
  if (name.endsWith(".jpg")) await pipeline.removeAlpha().jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toFile(file);
  else await pipeline.png({ compressionLevel: 9 }).toFile(file);
  inventory.push({ file, width, height, artworkSize, background });
  return file;
}
for (const size of [64, 96, 128, 192, 256, 512, 1024]) await write(`mark-${size}.png`, size, size, size);
for (const size of [16, 32, 48, 64, 128, 256]) await write(`favicon-${size}.png`, size, size, size);
for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) await write(`app-${size}.png`, size, size, Math.round(size * .92), "#ffffff");
// Keep ALL nontransparent artwork within the central 80%-diameter safe circle.
for (const size of [192, 512]) await write(`maskable-${size}.png`, size, size, Math.round(size * .72), "#ffffff");
for (const size of [152, 167, 180]) await write(`apple-${size}.png`, size, size, Math.round(size * .9), "#ffffff");
for (const size of [72, 96]) {
  const alpha = await sharp(master).resize(size, size).ensureAlpha().extractChannel(3).toBuffer();
  const file = `${output}/badge-${size}.png`;
  await sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } }).joinChannel(alpha).png().toFile(file);
  inventory.push({ file, width: size, height: size, treatment: "White approved silhouette; original alpha preserved." });
}
await write("social-1200x630.png", 1200, 630, 530, "#f3f7fa");
await write("splash-portrait.jpg", 1080, 1920, 600, "#020b22");
await write("splash-landscape.jpg", 1920, 1080, 640, "#020b22");

const appleDevices = [
  [320,568,2], [375,667,2], [414,736,3], [375,812,3], [414,896,2], [414,896,3],
  [390,844,3], [393,852,3], [402,874,3], [428,926,3], [430,932,3], [440,956,3],
  [768,1024,2], [810,1080,2], [820,1180,2], [834,1112,2], [834,1194,2], [1024,1366,2],
];
const startup = [];
for (const [width, height, scale] of appleDevices) {
  for (const landscape of [false, true]) {
    const w = (landscape ? height : width) * scale, h = (landscape ? width : height) * scale;
    const name = `startup-${w}x${h}.png`;
    await write(name, w, h, Math.round(Math.min(w, h) * .46), "#020b22");
    startup.push({ url: `/branding/v2/${name}`, media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: ${landscape ? "landscape" : "portrait"})` });
  }
}
await fs.writeFile("lib/branding-startup-images.json", JSON.stringify(startup, null, 2) + "\n");

// Legacy URLs remain usable by older installs, emails and stored content.
const aliases = {};
for (const file of await fs.readdir("public")) {
  let match;
  if ((match = file.match(/^icon-(\d+)x\d+\.png$/)) || (match = file.match(/^linkwe-pwa-(\d+)-v[23]\.png$/))) aliases[file] = `app-${match[1]}.png`;
  else if (/^linkwe-(logo|new-log|new-logo|favicon-circle)/.test(file)) aliases[file] = "mark-512.png";
}
Object.assign(aliases, {
  "linkwe-loader-mark-v1.png": "mark-256.png", "linkwe-app-icon.png": "app-512.png",
  "linkwe-notification-badge.png": "badge-72.png", "linkwe-social-share.png": "social-1200x630.png",
  "linkwe-startup-splash.jpg": "splash-portrait.jpg", "linkwe-startup-splash-desktop.jpg": "splash-landscape.jpg",
  "apple-touch-icon.png": "apple-180.png", "favicon-32x32.png": "favicon-32.png", "favicon-48x48.png": "favicon-48.png",
});
for (const [name, target] of Object.entries(aliases)) await fs.copyFile(`${output}/${target}`, `public/${name}`);
await fs.copyFile(`${output}/favicon-48.png`, "app/icon.png");
await fs.copyFile(`${output}/apple-180.png`, "app/apple-icon.png");
// ICO directory with PNG-compressed images, including a proper 16px entry.
const sizes = [16,32,48,64,128,256];
const pngs = await Promise.all(sizes.map(size => fs.readFile(`${output}/favicon-${size}.png`)));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const pos = 6 + i * 16, size = sizes[i];
  header[pos] = header[pos+1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, pos+4); header.writeUInt16LE(32, pos+6);
  header.writeUInt32LE(png.length, pos+8); header.writeUInt32LE(offset, pos+12); offset += png.length;
});
await fs.writeFile("app/favicon.ico", Buffer.concat([header, ...pngs]));
await fs.writeFile(`${output}/inventory.json`, JSON.stringify({ source: "public/branding/approved-logo.png", sha256, metadata: { width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha }, inventory, aliases }, null, 2) + "\n");
console.log(`Created ${inventory.length} variants and refreshed ${Object.keys(aliases).length} compatibility assets in ${root}.`);
