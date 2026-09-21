import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

const compiled = ts.transpileModule(
  fs.readFileSync(new URL("../lib/storefront/logo-colour.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const scope = { exports: {} };
vm.runInNewContext(compiled, scope);
const { dominantLogoColour, logoTextColour } = scope.exports;
const pixels = (...runs) => runs.flatMap(([count, colour]) => Array.from({ length: count }, () => colour).flat());

test("finds the brand colour despite large white, black and transparent areas", () => {
  const result = dominantLogoColour(pixels(
    [1000, [255, 255, 255, 255]], [1000, [0, 0, 0, 255]], [1000, [255, 0, 0, 0]], [20, [40, 190, 75, 255]],
  ));
  assert.deepEqual(Array.from(result), [40, 190, 75]);
});

test("combines related red shades instead of choosing a smaller blue accent", () => {
  const result = dominantLogoColour(pixels([30, [220, 25, 40, 255]], [30, [220, 40, 25, 255]], [40, [25, 40, 220, 255]]));
  assert.ok(result[0] > 200 && result[1] < 50 && result[2] < 50);
});

test("uses a neutral fallback for monochrome, transparent or missing image data", () => {
  assert.equal(dominantLogoColour(pixels([20, [120, 124, 122, 255]], [20, [255, 255, 255, 255]], [20, [0, 255, 0, 0]])), null);
  assert.equal(dominantLogoColour([]), null);
});

test("keeps title colours readable against the softly tinted identity panel", () => {
  const luminance = colour => colour.map(channel => {
    const srgb = channel / 255;
    return srgb <= .04045 ? srgb / 12.92 : ((srgb + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  for (const colour of [[255, 255, 0], [0, 255, 80], [255, 50, 80], [0, 180, 255], [180, 30, 255], null]) {
    const ink = logoTextColour(colour);
    const panel = (colour ?? [61, 105, 93]).map(channel => 255 * .92 + channel * .08);
    const contrast = (luminance(panel) + .05) / (luminance(ink) + .05);
    assert.ok(contrast >= 4.5, `${colour}: contrast ${contrast}`);
  }
});
