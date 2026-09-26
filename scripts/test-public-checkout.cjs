const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const original=Module._load;Module._load=function(request,parent,main){if(request.startsWith('@/'))request=path.join(process.cwd(),request.slice(2));return original.call(this,request,parent,main);};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {getFulfillmentOptions,fulfillmentError}=require('../lib/checkout/fulfillment-options.ts');
const digital={product:{isDigital:true,allowDelivery:false,allowPickup:false}},delivery={product:{isDigital:false,allowDelivery:true,allowPickup:false}},pickup={product:{isDigital:false,allowDelivery:false,allowPickup:true}},both={product:{isDigital:false,allowDelivery:true,allowPickup:true}};
assert.deepEqual(getFulfillmentOptions([digital]),{allDigital:true,delivery:false,pickup:false});
assert.deepEqual(getFulfillmentOptions([digital,both]),{allDigital:false,delivery:true,pickup:true});
assert.deepEqual(getFulfillmentOptions([delivery,pickup]),{allDigital:false,delivery:false,pickup:false});
assert.deepEqual(getFulfillmentOptions([delivery,both,digital]),{allDigital:false,delivery:true,pickup:false});
assert.deepEqual(getFulfillmentOptions([pickup,both,digital]),{allDigital:false,delivery:false,pickup:true});
assert.equal(fulfillmentError([digital],false),null);assert.equal(fulfillmentError([digital],true),null);assert.match(fulfillmentError([delivery,both],false),/pickup/);assert.match(fulfillmentError([pickup,both],true),/delivery/);assert.equal(fulfillmentError([both,digital],false),null);
console.log('PASS digital, mixed and incompatible cart fulfilment choices');
const {PUBLIC_PLANS,planDestination}=require('../lib/pricing/catalog.ts');
assert.equal(PUBLIC_PLANS.find(p=>p.id==='STARTER').rex,'5 complimentary uses, once');
for(const current of [null,'STARTER','GROWTH','PRO'])for(const target of ['STARTER','GROWTH','PRO']){
 const result=planDestination(target,current);
 if(!current)assert.equal(result.href,`/register/business?plan=${target.toLowerCase()}`);
 else if(current===target)assert.equal(result.href,'/dashboard/vendor/finance?tab=plan');
 else if(['STARTER','GROWTH','PRO'].indexOf(target)<['STARTER','GROWTH','PRO'].indexOf(current))assert.equal(result.href,'/contact');
 else assert.equal(result.href,`/dashboard/vendor/finance?tab=plan&upgrade=${target}`);
}
console.log('PASS plan links preserve registration selection, manage current tiers and route downgrades to support');
