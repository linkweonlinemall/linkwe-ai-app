// Pure tests: no database, network or application session required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { normalizeVariantAttributes: normalize } = require('../lib/product/variant-attributes.ts');
const { selectProductAttribute, productPurchaseState } = require('../lib/product/display.ts');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
const attrs = [{ name: 'Colour', value: 'Cream', hex: '#FFFDD0' }, { name: 'Size', value: 'S' }];
test('canonical attributes preserve order, swatch and input', () => {
  const input = structuredClone(attrs);
  assert.deepEqual(normalize(input), attrs);
  assert.deepEqual(input, attrs);
  assert.deepEqual(normalize(normalize(input)), attrs);
});
test('legacy maps normalize aliases and preserve arbitrary option names', () => {
  assert.deepEqual(normalize({ color: 'Cream', size: 'XL', 'Print finish': 'Matte' }), [{ name: 'Colour', value: 'Cream' }, { name: 'Size', value: 'XL' }, { name: 'Print finish', value: 'Matte' }]);
  assert.deepEqual(normalize({}), []); assert.deepEqual(normalize([]), []);
});
test('malformed option data is rejected instead of silently dropped', () => {
  for (const raw of [null, 'Cream', 123, [null], ['Cream'], [{name:'Colour'}], [{name:'',value:'Cream'}], [{name:'Size',value:''}], [{name:'Size',value:5}], {size:5}, [{name:'Colour',value:'Cream',hex:'not-a-colour'}], [{name:'Colour',value:'Cream',hex:42}]]) assert.throws(() => normalize(raw), `Expected rejection: ${JSON.stringify(raw)}`);
});
test('duplicate aliases and case-insensitive option names are rejected', () => {
  for (const raw of [[{name:'Color',value:'Cream'}, {name:'colour',value:'Black'}], [{name:'Size',value:'S'}, {name:'size',value:'M'}], {Color:'Cream', colour:'Black'}]) assert.throws(() => normalize(raw));
});
const variants = ['Cream', 'Black'].flatMap((colour, c) => ['S','M','L','XL','XXL'].map(size => ({ id: `${colour}-${size}`, name: `${colour} / ${size}`, sku:null, price:150, stock:5, images:[], attributes:normalize([{name:'Colour',value:colour,hex:c?'#000000':'#FFFDD0'},{name:'Size',value:size}]) })));
test('all ten colour-size choices resolve to their exact variant', () => {
  assert.equal(variants.length,10); assert.equal(variants.reduce((n,v)=>n+v.stock,0),50);
  for (const v of variants) {
    const first = selectProductAttribute(variants, {}, 'Colour', v.attributes[0].value);
    assert.equal(first.complete,false); assert.equal(first.variant,null);
    const selected = selectProductAttribute(variants, first.selected, 'Size', v.attributes[1].value);
    assert.equal(selected.complete,true); assert.equal(selected.variant.id,v.id);
    assert.deepEqual(productPurchaseState(150,50,true,variants,selected.variant), {minPrice:150,maxPrice:150,stock:5,canPurchase:true});
  }
});
test('switching colour retains size and sold-out choice cannot be purchased', () => {
  const switched = selectProductAttribute(variants, {Colour:'Cream',Size:'XXL'}, 'Colour','Black');
  assert.equal(switched.variant.id,'Black-XXL');
  assert.equal(productPurchaseState(150,50,true,variants,{...switched.variant,stock:0}).canPurchase,false);
});
console.log(`\n${checks} variant-attribute checks passed.`);
