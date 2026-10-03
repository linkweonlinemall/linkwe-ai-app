// Replaces baked-in website logos with the exact approved mark. Source copies
// are kept outside public/ so no older branded version can be served by the site.
import sharp from "sharp";
import fs from "node:fs/promises";

const source = "output/branding/site-refresh/source";
const mark = "public/branding/approved-logo.png";
// A labelled-area replacement: preserve the banners outside their logo corner.
for (const name of ["morning", "evening", "sale"]) {
  const plate = await sharp({create:{width:400,height:140,channels:4,background:"#f3f7fa"}})
    .composite([{input:await sharp(mark).resize(130,130).png().toBuffer(),gravity:"centre"}]).png().toBuffer();
  await sharp(`${source}/${name}-front.png`).composite([{input:plate,left:40,top:40}]).png().toFile(`public/${name}-front.png`);
}
// Replace only the old shirt emblem and lettering, using nearby original fabric
// with feathered edges, then place the approved icon without repainting it.
const original = await fs.readFile(`${source}/rex-original.webp`);
const left=532,top=357,width=78,height=76;
const patch = await sharp(original).extract({left:532,top:450,width,height}).ensureAlpha().raw().toBuffer();
for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
  const distance=Math.min(x,y,width-1-x,height-1-y);
  patch[(y*width+x)*4+3]=Math.round(255*Math.min(1,distance/5));
}
const patchPng=await sharp(patch,{raw:{width,height,channels:4}}).png().toBuffer();
const emblem=await sharp(mark).resize(65,65).png().toBuffer();
const result=await sharp(original).composite([{input:patchPng,left,top},{input:emblem,left:541,top:362}]).webp({lossless:true}).toBuffer();
await fs.writeFile("public/images/home/rex-brand-v2.webp",result);
await fs.writeFile("public/images/home/rex-3d-v1.webp",result);
console.log("Refreshed Rex and three legacy website banners; original source copies retained outside public/.");
