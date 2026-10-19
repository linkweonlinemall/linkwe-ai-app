/* eslint-disable @typescript-eslint/no-require-imports -- Database-free regression runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { animateTutorialElement, cancelTutorialMotion } = require('../lib/vendor/tutorial-motion.ts');
const listeners = new Set();
const preference = { matches: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
global.matchMedia = () => preference;
const frames = [{ opacity: 0 }, { opacity: 1 }];
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  return { value: 'unsaved fixture entry', animations: [], animate(keyframes, options) {
    let resolve, reject;
    const animation = { keyframes, options, cancelled: false, finished: new Promise((yes, no) => { resolve = yes; reject = no; }),
      finish() { resolve(); }, cancel() { this.cancelled = true; reject(new Error('cancelled')); } };
    this.animations.push(animation); return animation;
  } };
}
async function main() {
  const field = fixture();
  preference.matches = true;
  assert.equal(animateTutorialElement(field, frames), null);
  assert.equal(field.animations.length, 0);
  preference.matches = false;
  assert.equal(animateTutorialElement(null, frames), null);
  assert.equal(animateTutorialElement({}, frames), null);
  console.log('PASS reduced motion and missing browser animation support are immediate');

  const first = animateTutorialElement(field, frames);
  let staleClose = 0;
  void first.finished.then(() => staleClose++, () => {});
  const second = animateTutorialElement(field, frames);
  await tick();
  assert.equal(first.cancelled, true);
  assert.equal(staleClose, 0);
  assert.equal(second.cancelled, false);
  assert.equal(listeners.size, 1);
  assert.equal(field.value, 'unsaved fixture entry');
  console.log('PASS interrupted transitions replace old motion without closing newer UI or touching entries');

  let completed = 0;
  void second.finished.then(() => completed++);
  preference.matches = true;
  for (const listener of listeners) listener();
  await tick();
  assert.equal(completed, 1);
  assert.equal(listeners.size, 0);
  console.log('PASS enabling reduced motion finishes an active transition and releases listeners');

  preference.matches = false;
  const third = animateTutorialElement(field, frames);
  cancelTutorialMotion(field);
  await tick();
  assert.equal(third.cancelled, true);
  assert.equal(listeners.size, 0);
  cancelTutorialMotion(null);
  console.log('PASS unmount cancellation cleans up without an unhandled rejection');
  console.log('4 motion checks passed. No browser control, database or external calls.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
