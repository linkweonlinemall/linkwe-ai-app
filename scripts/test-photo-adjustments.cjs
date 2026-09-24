const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const mod = new Module('photo-adjustments');
mod._compile(ts.transpileModule(fs.readFileSync('lib/photo-studio/adjustments.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, 'photo-adjustments.js');
const { adjustPixels, rotationFit, normaliseAdjustments, cropBounds } = mod.exports;
const natural = { light: 0, warmth: 0, angle: 0 };
const original = new Uint8ClampedArray([0,0,0,255,255,255,255,255,48,80,100,255,180,200,240,255,40,30,20,0]);
const untouched = original.slice(); adjustPixels(untouched, natural); assert.deepEqual(untouched, original);
const bright = original.slice(); adjustPixels(bright, { ...natural, light: 75 });
assert.deepEqual(bright.slice(0,8), original.slice(0,8));
assert.deepEqual(bright.slice(16), original.slice(16));
assert.ok(bright[9] > original[9] + 20, 'dark areas receive a visible lift');
assert.ok(Math.abs(bright[8] / bright[10] - original[8] / original[10]) < 0.015, 'lighting retains channel ratios');
assert.ok(bright[12] < bright[13] && bright[13] < bright[14], 'highlights retain colour separation');
for (const warmth of [-30,30]) {
  const corrected = original.slice(); adjustPixels(corrected, { ...natural, warmth });
  assert.deepEqual(corrected.slice(0,8), original.slice(0,8), 'black text and white background remain neutral');
  assert.equal(corrected[11],255); assert.equal(corrected[19],0);
  assert.ok(warmth > 0 ? corrected[8] > original[8] && corrected[10] < original[10] : corrected[8] < original[8] && corrected[10] > original[10]);
}
for (const [width,height] of [[1600,1600],[1600,900],[900,1600]]) {
  for (let angle = -20; angle <= 20; angle += .5) {
    const { radians, scale } = rotationFit(width,height,angle);
    for (const x of [-width/2,width/2]) for (const y of [-height/2,height/2]) {
      assert.ok(Math.abs((x*Math.cos(radians)-y*Math.sin(radians))*scale) <= width/2 + .001, 'rotation retains horizontal edges');
      assert.ok(Math.abs((x*Math.sin(radians)+y*Math.cos(radians))*scale) <= height/2 + .001, 'rotation retains vertical edges');
    }
  }
}
assert.deepEqual(normaliseAdjustments({light:Infinity,warmth:99,angle:-90}),{light:0,warmth:30,angle:-20});
for(const zoom of [1,1.5,2,3]) for(const x of [0,50,100]) for(const y of [0,50,100]) {
  const box=cropBounds(1600,1600,{zoom,x,y});
  assert.ok(box.x>=0 && box.y>=0 && box.x+box.size<=1600.001 && box.y+box.size<=1600.001);
  assert.equal(box.size,1600/zoom);
}
assert.deepEqual(cropBounds(1600,1600,{zoom:1,x:100,y:0}),{x:0,y:0,size:1600});
assert.deepEqual(cropBounds(1600,1600,{zoom:2,x:100,y:0}),{x:800,y:0,size:800});
console.log('PASS: crop boundaries, corner positioning, square output, and full-photo restoration.');
console.log('PASS: natural reset, shadow lift, neutral endpoints, colour ratios, alpha, warmth, and uncropped rotation across the full slider range. No provider calls.');
