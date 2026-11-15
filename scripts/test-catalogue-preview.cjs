const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const {cataloguePreviewEnabled:enabled,isCatalogueFixturePath}=require('../lib/storefront/catalogue-preview.ts');
assert.equal(enabled({NODE_ENV:'production',VERCEL_ENV:'preview'}),true);
assert.equal(enabled({NODE_ENV:'development'}),true);
for(const env of [{NODE_ENV:'production'},{NODE_ENV:'test'},{NODE_ENV:'development',VERCEL_ENV:'production'},{NODE_ENV:'production',VERCEL_ENV:'production'},{}])assert.equal(enabled(env),false);
assert.equal(isCatalogueFixturePath('/dev/store-catalogue'),true);assert.equal(isCatalogueFixturePath('/dev/catalogue-preview'),true);assert.equal(isCatalogueFixturePath('/store/real'),false);
let pathname='/dev/store-catalogue';let mounted=0;
const original=Module._load;Module._load=function(request,parent,main){if(request==='next/navigation')return {usePathname:()=>pathname};if(request.startsWith('@/components/'))return ()=>{mounted++;return React.createElement('span',{},'normal runtime');};if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return original.call(this,request,parent,main);};
const Runtime=require('../components/providers/ApplicationRuntime.tsx').default;
for(const fixture of ['/dev/store-catalogue','/dev/catalogue-preview']){pathname=fixture;assert.equal(renderToStaticMarkup(React.createElement(Runtime,{},'fixture content')),'fixture content');assert.equal(mounted,0);}
pathname='/store/normal';renderToStaticMarkup(React.createElement(Runtime,{},'normal'));assert.ok(mounted>0);
for(const file of ['app/dev/store-catalogue/page.tsx','app/dev/catalogue-preview/page.tsx']){const source=fs.readFileSync(file,'utf8');assert.match(source,/cataloguePreviewEnabled\(process.env\)/);assert.match(source,/force-dynamic/);assert.doesNotMatch(source,/prisma|getSession|fetch\(/);}
const cards=fs.readFileSync('components/storefront/StorefrontListingCard.tsx','utf8');assert.match(cards,/if \(preview\) return "#store-content"/);assert.match(cards,/event.preventDefault\(\)/);assert.match(cards,/!preview &&/);
console.log('PASS preview/prod gate matrix; exact fixture paths; no runtime providers mounted on fixtures; regular runtime preserved; no fixture DB/auth calls; card navigation disabled.');
