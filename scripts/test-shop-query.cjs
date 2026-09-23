const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const moduleResult = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/shop/query.ts','utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020} }).outputText,{exports:moduleResult.exports,module:moduleResult,require,URLSearchParams});
const { parseShopQuery, shopHref, shopStockWhere, shopOrderBy } = moduleResult.exports;
let passed=0;
function check(name,fn){fn();passed++;console.log(`PASS ${name}`);}
check('Untrusted filters cannot send invalid enums or nonfinite prices to Prisma',()=>{const q=parseShopQuery({condition:'INVALID',sort:'invalid',minPrice:'Infinity',maxPrice:'-10',page:'bad'});assert.equal(q.condition,'');assert.equal(q.sort,'featured');assert.equal(q.minPrice,undefined);assert.equal(q.maxPrice,undefined);assert.equal(q.page,1);});
check('Zero price survives and inverted ranges are normalized',()=>{assert.equal(parseShopQuery({minPrice:'0'}).minPrice,0);const q=parseShopQuery({minPrice:'200',maxPrice:'50'});assert.equal(q.minPrice,50);assert.equal(q.maxPrice,200);assert.equal(parseShopQuery({minPrice:'50abc'}).minPrice,undefined);});
check('Repeated URL parameters and impossible pages remain safe',()=>{const q=parseShopQuery({q:['  shirt  ','other'],page:'Infinity'});assert.equal(q.q,'shirt');assert.equal(q.page,100000);assert.equal(parseShopQuery({page:'-4'}).page,1);});
check('Category changes preserve search, region and sort while resetting pagination',()=>{const href=shopHref({q:'sugar & lime',region:'san fernando',sort:'price_asc',page:'3'},{category:'local_handmade',page:undefined});const url=new URL(href,'https://example.com');assert.equal(url.searchParams.get('q'),'sugar & lime');assert.equal(url.searchParams.get('region'),'san fernando');assert.equal(url.searchParams.get('sort'),'price_asc');assert.equal(url.searchParams.get('category'),'local_handmade');assert.equal(url.searchParams.has('page'),false);});
check('Removing one filter preserves other refinements',()=>{const url=new URL(shopHref({q:'shirt',category:'clothing_apparel',inStock:'true',page:'4'},{category:undefined,page:undefined}),'https://example.com');assert.equal(url.searchParams.get('q'),'shirt');assert.equal(url.searchParams.get('inStock'),'true');assert.equal(url.searchParams.has('category'),false);});
check('In-stock query includes unlimited inventory and checks variant inventory separately',()=>{const where=shopStockWhere();assert.equal(where.OR[0].hasVariants,false);assert.equal(where.OR[0].OR[0].stock,null);assert.equal(where.OR[1].hasVariants,true);assert.equal(where.OR[1].variants.some.OR[0].stock,null);assert.equal(where.OR[1].variants.some.OR[1].stock.gt,0);});
check('Every sort has a stable tie-breaker for paging',()=>{for(const sort of ['featured','newest','price_asc','price_desc','name','name_desc','stock'])assert.equal(shopOrderBy(sort).at(-1).id,'asc');});
console.log(`${passed} shop query checks passed.`);
