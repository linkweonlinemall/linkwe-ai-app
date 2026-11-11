const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
function load(file) {
  const result = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports:result.exports,module:result,require,URLSearchParams});
  return result.exports;
}
const {parseShopQuery} = load("lib/shop/query.ts");
const {matchingPrices,isDiscounted,displayPricing} = load("lib/shop/pricing.ts");
let count=0;
function check(name, fn) { fn(); count++; console.log(`PASS ${name}`); }
const simple = {price:100,compareAtPrice:120,stock:3,hasVariants:false,variants:[]};
const variant = { ...simple,hasVariants:true, variants:[
  {price:50,stock:0,attributes:[{name:"Colour",value:"red"},{name:"Size",value:"S"}]},
  {price:150,stock:4,attributes:[{name:"Colour",value:"blue"},{name:"Size",value:"M"}]},
  {price:null,stock:null,attributes:[{name:"Colour",value:"red"},{name:"Size",value:"M"}]},
]};
const prices=(product,params={})=>Array.from(matchingPrices(product,parseShopQuery(params)));
check("Discount requires a finite strictly higher regular price",()=>{
  assert.equal(isDiscounted(100,120),true);
  for(const compare of [null,0,99,100,NaN,Infinity,-1]) assert.equal(isDiscounted(100,compare),false);
  for(const price of [NaN,Infinity,-1]) assert.equal(isDiscounted(price,120),false);
  assert.equal(isDiscounted(0,120),true);
});
check("Only the explicit true URL value enables sale filtering",()=>{assert.equal(parseShopQuery({onSale:"true"}).onSale,true); for(const value of ["false","1","yes",""]) assert.equal(parseShopQuery({onSale:value}).onSale,false);});
check("Price boundaries are inclusive, including zero",()=>{assert.deepEqual(prices(simple,{minPrice:"100",maxPrice:"100"}),[100]);assert.deepEqual(prices(simple,{minPrice:"100.01"}),[]);assert.deepEqual(prices({...simple,price:0},{maxPrice:"0"}),[0]);});
check("Invalid prices never produce options",()=>{for(const price of [-1,Infinity,NaN])assert.deepEqual(prices({...simple,price}),[]);});
check("Sale equality, null and lower compare prices do not qualify",()=>{for(const compareAtPrice of [null,100,90,NaN,Infinity])assert.deepEqual(prices({...simple,compareAtPrice},{onSale:"true"}),[]);});
check("Null variant price inherits the base; zero is a real override",()=>{assert.deepEqual(prices(variant,{colour:"red",size:"M"}),[100]);assert.deepEqual(prices({...variant,variants:[{price:0,stock:1,attributes:[]}]},{maxPrice:"0"}),[0]);});
check("Price filter uses variant prices rather than the base price",()=>{assert.deepEqual(prices(variant,{minPrice:"150",maxPrice:"150"}),[150]);});
check("Colour and size must match one variant",()=>{assert.deepEqual(prices(variant,{colour:"blue",size:"S"}),[]);});
check("Price and stock must match the selected variant",()=>{assert.deepEqual(prices(variant,{colour:"red",maxPrice:"50",inStock:"true"}),[]);assert.deepEqual(prices(variant,{colour:"blue",minPrice:"150",inStock:"true"}),[150]);});
check("Discount and stock cannot match different variants",()=>{assert.deepEqual(prices({...variant,variants:variant.variants.slice(0,2)},{onSale:"true",inStock:"true"}),[]);});
check("Unlimited inventory qualifies and empty variant sets do not",()=>{assert.deepEqual(prices(variant,{colour:"red",inStock:"true"}),[100]);assert.deepEqual(prices({...variant,variants:[]},{inStock:"true"}),[]);});
check("Display price is lowest matching option and from label describes ranges",()=>{const all=displayPricing(variant,parseShopQuery({}));assert.equal(all.displayPrice,50);assert.equal(all.displayPriceFrom,true);const selected=displayPricing(variant,parseShopQuery({colour:"blue"}));assert.equal(selected.displayPrice,150);assert.equal(selected.displayPriceFrom,false);});
check("Parent stock caps all variants",()=>{assert.deepEqual(prices({...variant,stock:0},{inStock:"true"}),[]);});
check("US color spelling and padded names normalize",()=>{assert.deepEqual(prices({...variant,variants:[{price:30,stock:1,attributes:[{name:" Color ",value:" RED "},{name:" Size ",value:" M "}]}]},{colour:"red",size:"M"}),[30]);});
console.log(`${count} shop pricing checks passed.`);
