import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import sharp from "sharp";

const inventory = JSON.parse(await fs.readFile("public/branding/v2/inventory.json", "utf8"));
const master = await fs.readFile(inventory.source);
assert.equal(crypto.createHash("sha256").update(master).digest("hex"), "c08d5eda9996623d82efd78f7b8e460499c02e4bf3402852a7a3392b6390e571", "Approved master must remain byte-identical");
for (const item of inventory.inventory) {
  const info = await sharp(item.file).metadata();
  assert.equal(info.width, item.width, item.file);
  assert.equal(info.height, item.height, item.file);
  if (/\/mark-|\/favicon-|\/badge-/.test(item.file)) {
    const stats = await sharp(item.file).stats();
    assert.equal(stats.channels[3].min, 0, `Transparency lost: ${item.file}`);
  }
  if (item.file.includes("/maskable-")) {
    const {data, info} = await sharp(master).resize(item.artworkSize, item.artworkSize).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0) {
      assert(Math.hypot(x-(info.width-1)/2, y-(info.height-1)/2) < item.width*.4, `Artwork exceeds maskable safe circle: ${item.file}`);
    }
  }
  if(item.file.includes("/badge-")) {
    const {data}=await sharp(item.file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=0;i<data.length;i+=4)if(data[i+3]>0)assert(data[i]===255&&data[i+1]===255&&data[i+2]===255,"Badge must be white + alpha");
  }
}
for(const [alias,target] of Object.entries(inventory.aliases)) assert.deepEqual(await fs.readFile(`public/${alias}`),await fs.readFile(`public/branding/v2/${target}`),`Stale compatibility asset: ${alias}`);
const manifest=JSON.parse(await fs.readFile("public/manifest.json","utf8"));
for(const icon of [...manifest.icons,...manifest.shortcuts.flatMap(s=>s.icons)]) {
  const info=await sharp(`public${icon.src}`).metadata();
  assert.equal(`${info.width}x${info.height}`,icon.sizes);
}
assert(manifest.icons.some(i=>i.purpose==="maskable"&&i.src.includes("maskable-")));
const ico=await fs.readFile("app/favicon.ico");
assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),6);
await sharp(ico.subarray(ico.readUInt32LE(18),ico.readUInt32LE(18)+ico.readUInt32LE(14))).metadata();

// Check install and upgrade behavior without a network or browser dependency.
const handlers={},deleted=[],cached=[];
let claimed=false,waiting;
const sw=await fs.readFile("public/sw.js","utf8");
vm.runInNewContext(sw,{
  self:{location:{hostname:"www.linkweonlinemall.com"},addEventListener:(n,h)=>handlers[n]=h,skipWaiting(){},clients:{claim(){claimed=true}}},
  importScripts(){},console,
  caches:{open:async()=>({addAll:async urls=>{for(const url of urls){if(url!=="/offline")await fs.access(`public${url}`);cached.push(url)}}}),keys:async()=>["linkwe-v9","linkwe-v10-branding-v2","unrelated-cache"],delete:async key=>deleted.push(key)},
});
handlers.install({waitUntil:p=>waiting=p});await waiting;
handlers.activate({waitUntil:p=>waiting=p});await waiting;
assert.deepEqual(deleted,["linkwe-v9"]);assert(claimed);assert(cached.includes("/branding/v2/maskable-512.png"));
async function audit(dir) {
  for(const e of await fs.readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,e.name);if(e.isDirectory()){await audit(file);continue;}
    if(!/\.(tsx?|jsx?|css)$/.test(file))continue;
    const text=await fs.readFile(file,"utf8");
    assert(!/linkwe-(?:logo|new-log|loader|pwa|notification-badge|startup-splash|social-share)[^\s"'<>]*\.(?:png|jpg)/.test(text),`Active legacy logo reference: ${file}`);
    assert(!/LinkWe<span[^>]*>AI<\/span>/.test(text),`Legacy text wordmark: ${file}`);
  }
}
for(const dir of ["app","components","lib"])await audit(dir);
console.log(`PASS: ${inventory.inventory.length} image dimensions, transparency, master hash, maskable safety, monochrome badges, ${Object.keys(inventory.aliases).length} aliases, manifest, favicon, cache upgrade and active-reference audit.`);
