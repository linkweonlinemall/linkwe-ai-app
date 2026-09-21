import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

const compiled = ts.transpileModule(fs.readFileSync(new URL("../lib/product/gallery.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const scope = { exports: {} };
vm.runInNewContext(compiled, scope);
const { clampPhotoZoom, clampPhotoPan, zoomPhotoAt } = scope.exports;
const plain = value => JSON.parse(JSON.stringify(value));

test("zoom stays between the fitted image and four times magnification", () => {
  assert.equal(clampPhotoZoom(-2), 1);
  assert.equal(clampPhotoZoom(2.7), 2.7);
  assert.equal(clampPhotoZoom(9), 4);
});

test("a fitted image cannot be dragged away, and magnified images stay within the viewport", () => {
  assert.deepEqual(plain(clampPhotoPan({ x: 900, y: -900 }, 1, 600, 400)), { x: 0, y: 0 });
  assert.deepEqual(plain(clampPhotoPan({ x: 900, y: -900 }, 2, 600, 400)), { x: 300, y: -200 });
});

test("zoom retains the detail underneath the pointer, including an already panned image", () => {
  const pan = { x: -30, y: 50 };
  const focal = { x: 100, y: -80 };
  const result = zoomPhotoAt(pan, 1.5, 3, focal);
  assert.equal((focal.x - result.x) / 3, (focal.x - pan.x) / 1.5);
  assert.equal((focal.y - result.y) / 3, (focal.y - pan.y) / 1.5);
});

test("reversing a pinch restores the original view", () => {
  const focal = { x: 45, y: 20 };
  const zoomed = zoomPhotoAt({ x: 0, y: 0 }, 1, 2.5, focal);
  assert.deepEqual(plain(zoomPhotoAt(zoomed, 2.5, 1, focal)), { x: 0, y: 0 });
});
