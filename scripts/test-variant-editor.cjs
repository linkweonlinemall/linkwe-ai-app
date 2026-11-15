// Pure React element-handler and SSR checks. No browser, database or uploads.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@/app/actions/admin-records') return { uploadAdminRecordImages: () => { throw new Error('Unexpected upload'); } };
  if (request === '@/lib/images/upload-images-client') return { compressAndUploadImages: () => { throw new Error('Unexpected upload'); } };
  if (request === '@/components/admin/StructuredFields') return { __esModule: true, default: () => null };
  if (request === 'sonner') return { toast: { error: () => {} } };
  if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
require.extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, key) => String(key) }); };
const { VariantOptionsEditor, VariantsEditor } = require('../app/(dashboard)/dashboard/admin/components/record-widgets.tsx');
function nodes(element, predicate) {
  if (Array.isArray(element)) return element.flatMap(child => nodes(child, predicate));
  if (!React.isValidElement(element)) return [];
  return [...(predicate(element) ? [element] : []), ...nodes(element.props.children, predicate)];
}
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
const attrs = [{ name:'Colour', value:'Cream', hex:'#FFFDD0' }, { name:'Size', value:'S' }];
test('SSR renders canonical labels, values and swatch without numeric map keys', () => {
  const html = renderToStaticMarkup(React.createElement(VariantOptionsEditor, { value:attrs, onChange:()=>{} }));
  for (const text of ['Name', 'Value', 'Colour hex (optional)', 'Colour', 'Cream', '#FFFDD0', 'Size', 'Remove option', 'Add option']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/<input/g)||[]).length, 6);
});
test('SSR and first edit accept legacy maps and output canonical attributes', () => {
  let changed;
  const props = { value:{color:'Cream',size:'S'}, onChange:value=>{changed=value;} };
  const html = renderToStaticMarkup(React.createElement(VariantOptionsEditor, props));
  assert.ok(html.includes('value="Colour"')); assert.ok(html.includes('value="Size"'));
  const inputs = nodes(VariantOptionsEditor(props), e=>e.type==='input');
  inputs[1].props.onChange({target:{value:'Black'}});
  assert.deepEqual(changed,[{name:'Colour',value:'Black'},{name:'Size',value:'S'}]);
});
test('name, value and hex edits preserve the other option and original data', () => {
  for (const [inputIndex,key,value] of [[0,'name','Finish'],[1,'value','Black'],[2,'hex','#000000']]) {
    let changed;
    const inputs = nodes(VariantOptionsEditor({value:attrs,onChange:v=>{changed=v;}}),e=>e.type==='input');
    inputs[inputIndex].props.onChange({target:{value}});
    assert.deepEqual(changed[0],{...attrs[0],[key]:value});
    assert.deepEqual(changed[1],attrs[1]);
    assert.deepEqual(attrs[0],{name:'Colour',value:'Cream',hex:'#FFFDD0'});
  }
});
test('clearing swatch removes optional hex; remove and add retain option order', () => {
  let changed;
  const tree=VariantOptionsEditor({value:attrs,onChange:v=>{changed=v;}});
  nodes(tree,e=>e.type==='input')[2].props.onChange({target:{value:''}});
  assert.deepEqual(changed,[{name:'Colour',value:'Cream'},{name:'Size',value:'S'}]);
  nodes(tree,e=>e.type==='button' && e.props['aria-label']==='Remove option 1')[0].props.onClick();
  assert.deepEqual(changed,[attrs[1]]);
  nodes(tree,e=>e.type==='button' && e.props.children==='Add option')[0].props.onClick();
  assert.deepEqual(changed,[...attrs,{name:'',value:''}]);
  // In-progress empty text stays editable and is validated only when saving.
  const blank=VariantOptionsEditor({value:changed,onChange:()=>{}});
  assert.equal(nodes(blank,e=>e.type==='input').length,9);
});
test('parent editor option updates preserve IDs, prices, stock, photos and other variants', () => {
  const rows=[{id:'retained-id',name:'Cream / S',sku:'SKU-1',price:150,stock:5,images:['https://example.test/tee.jpg'],attributes:attrs},{id:'other-id',name:'Black / M',price:150,stock:5,images:[],attributes:[{name:'Colour',value:'Black'},{name:'Size',value:'M'}]}];
  let changed;
  const parent=VariantsEditor({value:rows,onChange:v=>{changed=v;},onBusy:()=>{}});
  const child=nodes(parent,e=>e.type===VariantOptionsEditor)[0];
  const input=nodes(VariantOptionsEditor(child.props),e=>e.type==='input')[1];
  input.props.onChange({target:{value:'Ivory'}});
  assert.deepEqual(changed[0],{...rows[0],attributes:[{...attrs[0],value:'Ivory'},attrs[1]]});
  assert.deepEqual(changed[1],rows[1]);
  assert.equal(nodes(parent,e=>e.type==='button' && String(e.props['aria-label']).startsWith('Remove variation')).length,0);
});
test('malformed legacy map displays an error rather than a destructive empty editor', () => {
  const html=renderToStaticMarkup(React.createElement(VariantOptionsEditor,{value:{size:42},onChange:()=>{throw new Error('Must not change invalid source');}}));
  assert.ok(html.includes('role="alert"')); assert.ok(html.includes('Invalid variation options'));
});
test('malformed array displays an error rather than crashing the editor', () => {
  for (const value of [[null], ['invalid'], [{name:'Size',value:5}]]) {
    const html=renderToStaticMarkup(React.createElement(VariantOptionsEditor,{value,onChange:()=>{throw new Error('Must not mutate invalid source');}}));
    assert.ok(html.includes('role="alert"'));
  }
});
test('actual storefront selector renders the ten-variant fixture with colour swatches and five sizes', () => {
  const VariantSelector = require('../components/product/VariantSelector.tsx').default;
  const variants=['Cream','Black'].flatMap((colour,index)=>['S','M','L','XL','XXL'].map(size=>({
    id:`${colour}-${size}`,name:`${colour} / ${size}`,sku:null,price:150,stock:5,images:[],
    attributes:[{name:'Colour',value:colour,hex:index?'#000000':'#FFFDD0'},{name:'Size',value:size}]
  })));
  const html=renderToStaticMarkup(React.createElement(VariantSelector,{variants}));
  assert.equal(variants.length,10);
  assert.equal((html.match(/<fieldset/g)||[]).length,2);
  assert.ok(html.includes('COLOUR')); assert.ok(html.includes('SIZE'));
  for(const value of ['Cream','Black']) assert.ok(html.includes(`aria-label="COLOUR: ${value}"`),value);
  for(const value of ['S','M','L','XL','XXL']) assert.ok(html.includes(`aria-label="SIZE: ${value}"`),value);
  assert.equal((html.match(/aria-pressed="false"/g)||[]).length,7);
  assert.match(html, /background:#[fF]{3}[dD]{2}0/);
  assert.ok(html.includes('background:#000000'));
  assert.ok(!html.includes('out of stock'));
});
console.log(`\n${checks} variant editor checks passed.`);
