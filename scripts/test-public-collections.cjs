// Isolated fixtures only: no database or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, filename);
const { visibleCollectionItems } = require('../lib/storefront/catalogue-collections.ts');
const { filterCatalogue, filterDefaults } = require('../lib/storefront/catalogue-filters.ts');
const item = (id, extra={}) => ({id,name:id,slug:id,price:150,images:[],category:'CLOTHING',stock:5,...extra});
const items = [item('tee'),item('styling',{isService:true}),item('unfeatured',{isFeatured:false}),item('other')];
const collection = {id:'new',name:'New collection',productIds:['tee','tee','styling','private','foreign','unfeatured']};
let count=0; const test=(name,fn)=>{fn();count++;console.log(`PASS ${name}`)};
test('counts only provided public members once and includes nonfeatured listings',()=>assert.deepEqual(visibleCollectionItems(collection,items).map(i=>i.id),['tee','styling','unfeatured']));
test('empty and removed memberships produce an empty collection',()=>{assert.equal(visibleCollectionItems({...collection,productIds:[]},items).length,0);assert.equal(visibleCollectionItems({...collection,productIds:['missing']},items).length,0)});
test('same listing can belong to multiple collections without mutation',()=>{const before=JSON.stringify(items);assert.equal(visibleCollectionItems(collection,items).length,3);assert.equal(visibleCollectionItems({...collection,id:'occasion'},items).length,3);assert.equal(JSON.stringify(items),before)});
test('members retain product/service filters and range filters',()=>{const visible=visibleCollectionItems(collection,items);assert.equal(filterCatalogue(visible,{...filterDefaults,type:'products'}).length,2);assert.equal(filterCatalogue(visible,{...filterDefaults,type:'services'}).length,1);assert.equal(filterCatalogue(visible,{...filterDefaults,max:'149'}).length,0)});
test('membership filtering does not change featured, stock, or selection fields',()=>{const before=JSON.stringify(collection);visibleCollectionItems(collection,items);assert.equal(JSON.stringify(collection),before);assert.equal(items[2].isFeatured,false);assert.equal(items[2].stock,5)});
test('repeated input rows are deduplicated, cross-type keys remain distinct',()=>{assert.equal(visibleCollectionItems(collection,[...items,items[0]]).length,3);assert.equal(visibleCollectionItems(collection,[item('tee'),item('tee',{isService:true})]).length,2)});
console.log(`${count} public collection checks passed.`);
