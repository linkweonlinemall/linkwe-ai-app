// Server-rendered UI contract: option IDs must survive readable labels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, f);
require.extensions['.css'] = m => { m.exports = {}; };
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === '@/app/actions/vendor-catalogue') return { saveVendorCatalogue() { throw new Error('No writes in UI test'); } };
  if (request === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children);
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return original.call(this, request, parent, main);
};
try {
  const Workspace = require('../components/vendor/catalogue/CatalogueWorkspace.tsx').default;
  const props = { store: { id: 'test', name: 'Test store', slug: 'test-store', status: 'ACTIVE' }, listings: [
    { id: 'bag', name: 'Market bag', category: 'accessories', isService: false, isPublished: true, isArchived: false, isFeatured: true },
    { id: 'service', name: 'Consultation', category: 'beauty_hair', isService: true, isPublished: true, isArchived: false, isFeatured: true },
  ] };
  const html = renderToStaticMarkup(React.createElement(Workspace, props));
  assert.ok(html.includes('<option value="accessories">Accessories</option>'), 'Product category must submit its canonical ID, not label');
  assert.ok(html.includes('<option value="beauty_hair">Beauty &amp; Hair</option>'), 'Service category must submit its canonical ID, not label');
  assert.ok(html.includes('/store/test-store?tab=catalogue'));
  const preview = renderToStaticMarkup(React.createElement(Workspace, { ...props, preview: true }));
  assert.ok(preview.includes('/dev/store-catalogue?tab=catalogue'), 'Sample link must open the actual fixture');
  assert.ok(!preview.includes('/store/test-store?tab=catalogue'));
  console.log('PASS: canonical product/service category option values and safe sample catalogue links.');
} finally { Module._load = original; }
