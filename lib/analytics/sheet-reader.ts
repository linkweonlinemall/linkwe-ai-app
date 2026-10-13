import "server-only";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { SHEET_SCHEMA, type SheetId } from "./sheet-schema";
import { normalizeSheetData, type SheetData, type SheetRecord } from "./sheet-normalize";
import { unavailableExternal, type ExternalPeriod, type ExternalSnapshot } from "./external-model";

const CACHE_MS=15*60_000, MAX_ROWS=10_000, MAX_BYTES=4*1024*1024;
type Config={workbook:string;audience:string;serviceAccount:string;sheetIds:Record<SheetId,number>};
type Cell={effectiveValue?:{stringValue?:string;numberValue?:number;boolValue?:boolean;errorValue?:unknown};userEnteredValue?:{formulaValue?:string}};
type Grid={startRow?:number;startColumn?:number;rowData?:{values?:Cell[]}[]};
type Sheet={properties?:{sheetId?:number;title?:string;gridProperties?:{rowCount?:number;columnCount?:number}};data?:Grid[]};
type Workbook={spreadsheetId?:string;sheets?:Sheet[]};
type Cache={key:string;readAt:string;expires:number;data:SheetData};
const invalid=():never=>{throw new Error("Analytics source unavailable.");};
export function parseSheetIds(raw:string|undefined):Record<SheetId,number> {
  const value=JSON.parse(raw??"null");
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).length!==SHEET_SCHEMA.length)return invalid();
  const ids=SHEET_SCHEMA.map(schema=>value[schema.id]);
  if(ids.some(id=>!Number.isSafeInteger(id)||id<0)||new Set(ids).size!==ids.length)return invalid();
  return Object.fromEntries(SHEET_SCHEMA.map(schema=>[schema.id,value[schema.id]])) as Record<SheetId,number>;
}
function config():Config|null {
  if(process.env.LINKWE_ANALYTICS_SHEETS_ENABLED!=="true")return null;
  const workbook=process.env.LINKWE_ANALYTICS_SHEETS_ID??"",audience=process.env.LINKWE_ANALYTICS_GOOGLE_AUDIENCE??"",serviceAccount=process.env.LINKWE_ANALYTICS_GOOGLE_SERVICE_ACCOUNT??"";
  if(!/^[A-Za-z0-9_-]{20,100}$/.test(workbook)||!/^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/.test(audience)||!/^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(serviceAccount))return invalid();
  return {workbook,audience,serviceAccount,sheetIds:parseSheetIds(process.env.LINKWE_ANALYTICS_SHEETS_TAB_IDS)};
}
async function jsonRequest(url:string, init:RequestInit, fetcher:typeof fetch):Promise<unknown> {
  for(let attempt=0;attempt<2;attempt++){
    const response=await fetcher(url,{...init,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000)});
    if(!response.ok){await response.body?.cancel();if(attempt===0&&(response.status===429||response.status>=500)){await new Promise(resolve=>setTimeout(resolve,150));continue;}return invalid();}
    const reader=response.body?.getReader();if(!reader)return invalid();let length=0;const chunks:Uint8Array[]=[];
    while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>MAX_BYTES){await reader.cancel();return invalid();}chunks.push(part.value);}
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  return invalid();
}
async function googleToken(settings:Config, fetcher:typeof fetch) {
  // Vercel provides a fresh runtime token on the request. Google validates its
  // signature and the configured provider's exact issuer/audience/subject trust.
  const oidc=(await headers()).get("x-vercel-oidc-token")||process.env.VERCEL_OIDC_TOKEN;if(!oidc)return invalid();
  const sts=await jsonRequest("https://sts.googleapis.com/v1/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({audience:settings.audience,grantType:"urn:ietf:params:oauth:grant-type:token-exchange",requestedTokenType:"urn:ietf:params:oauth:token-type:access_token",subjectTokenType:"urn:ietf:params:oauth:token-type:jwt",subjectToken:oidc,scope:"https://www.googleapis.com/auth/cloud-platform"})},fetcher) as {access_token?:string};
  if(typeof sts.access_token!=="string")return invalid();
  const scoped=await jsonRequest(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(settings.serviceAccount)}:generateAccessToken`,{method:"POST",headers:{Authorization:`Bearer ${sts.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({scope:["https://www.googleapis.com/auth/spreadsheets.readonly"],lifetime:"900s"})},fetcher) as {accessToken?:string};
  return typeof scoped.accessToken==="string"?scoped.accessToken:invalid();
}
function column(index:number){return String.fromCharCode(65+index);}
function cellValue(cell:Cell|undefined):string|number|null {
  if(cell?.userEnteredValue?.formulaValue||cell?.effectiveValue?.errorValue)return invalid();
  const value=cell?.effectiveValue;if(!value)return null;
  if(typeof value.stringValue==="string")return value.stringValue===""?null:value.stringValue;
  if(typeof value.numberValue==="number"&&Number.isFinite(value.numberValue))return value.numberValue;
  return invalid();
}
function matrix(sheet:Sheet) {
  const rows=new Map<number,Map<number,Cell>>();
  for(const grid of sheet.data??[]){const start=grid.startRow??0,left=grid.startColumn??0;for(const [offset,row] of (grid.rowData??[]).entries()){
    const cells=rows.get(start+offset)??new Map<number,Cell>();for(const [index,cell] of (row.values??[]).entries()){if(cells.has(left+index))return invalid();cells.set(left+index,cell);}rows.set(start+offset,cells);
  }}return rows;
}
function validateSheet(sheet:Sheet|undefined,schema:typeof SHEET_SCHEMA[number],sheetId:number) {
  if(!sheet||sheet.properties?.sheetId!==sheetId||sheet.properties.title!==schema.title)return invalid();
  const height=sheet.properties.gridProperties?.rowCount,width=sheet.properties.gridProperties?.columnCount;
  if(!height||height<4||height>MAX_ROWS||!width||width<schema.headers.length)return invalid();
  const header=matrix(sheet).get(3);if(!header)return invalid();
  for(let i=0;i<schema.headers.length;i++)if(cellValue(header.get(i))!==schema.headers[i])return invalid();
  return height;
}
const FIELDS="spreadsheetId,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),data(startRow,startColumn,rowData(values(effectiveValue,userEnteredValue))))";
function sheetUrl(workbook:string,ranges:string[]) {
  const url=new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(workbook)}`);url.searchParams.set("fields",FIELDS);for(const range of ranges)url.searchParams.append("ranges",range);return url.toString();
}
async function fetchWorkbook(settings:Config,fetcher:typeof fetch):Promise<SheetData> {
  const token=await googleToken(settings,fetcher),headers={Authorization:`Bearer ${token}`};
  const meta=await jsonRequest(sheetUrl(settings.workbook,SHEET_SCHEMA.map(s=>`'${s.title}'!A4:${column(s.headers.length-1)}4`)),{headers},fetcher) as Workbook;
  if(meta.spreadsheetId!==settings.workbook)return invalid();
  const ranges:string[]=[],sizes=new Map<SheetId,number>(),data:SheetData={};
  for(const schema of SHEET_SCHEMA){try{
    const matches=meta.sheets?.filter(s=>s.properties?.sheetId===settings.sheetIds[schema.id])??[];if(matches.length!==1)return invalid();
    const height=validateSheet(matches[0],schema,settings.sheetIds[schema.id]);sizes.set(schema.id,height);
    ranges.push(`'${schema.title}'!A4:${column(schema.headers.length-1)}4`);
    // Read only structured fields, never Notes, Strategy, updater names or private source URLs.
    for(const field of schema.readFields){const index=(schema.fields as readonly string[]).indexOf(field);if(height>4)ranges.push(`'${schema.title}'!${column(index)}5:${column(index)}${height}`);}
  }catch{data[schema.id]={valid:false,rows:[]};}}
  if(!sizes.size)return data;
  const body=await jsonRequest(sheetUrl(settings.workbook,ranges),{headers},fetcher) as Workbook;
  if(body.spreadsheetId!==settings.workbook)return invalid();
  for(const schema of SHEET_SCHEMA){if(!sizes.has(schema.id))continue;try{
    const matches=body.sheets?.filter(s=>s.properties?.sheetId===settings.sheetIds[schema.id])??[];if(matches.length!==1)return invalid();
    const sheet=matches[0],height=validateSheet(sheet,schema,settings.sheetIds[schema.id]);if(height!==sizes.get(schema.id))return invalid();
    const cells=matrix(sheet),rows:SheetRecord[]=[];
    for(const [line,values] of cells){if(line===3)continue;if(line<4||line>=height)return invalid();const row:SheetRecord={};
      for(const field of schema.readFields){const index=(schema.fields as readonly string[]).indexOf(field);row[field]=cellValue(values.get(index));}
      if(Object.values(row).some(value=>value!==null))rows.push(row);
    }
    data[schema.id]={valid:true,rows};
  }catch{data[schema.id]={valid:false,rows:[]};}}
  return data;
}
// Dependency injection is used only by local tests. Production exports one reader
// that authenticates before config lookup, cache access or any network request.
export function createSheetReader(deps:{authorize:()=>Promise<boolean>;fetcher:typeof fetch;now:()=>number;configuration:()=>Config|null}) {
  let cached:Cache|undefined,inflight:{key:string;promise:Promise<Cache>}|undefined;
  return async(period:ExternalPeriod):Promise<ExternalSnapshot>=>{
    if(!await deps.authorize())throw new Error("Administrator access required.");
    let settings:Config|null;try{settings=deps.configuration();}catch{return unavailableExternal(period,"unavailable");}
    if(!settings){cached=undefined;return unavailableExternal(period);}
    const key=JSON.stringify(settings),now=deps.now();
    if(cached?.key===key&&cached.expires>now)return normalizeSheetData(cached.data,period,cached.readAt);
    try{
      if(!inflight||inflight.key!==key){const promise=fetchWorkbook(settings,deps.fetcher).then(data=>({key,readAt:new Date(deps.now()).toISOString(),expires:deps.now()+CACHE_MS,data}));inflight={key,promise};}
      const pending=inflight;const loaded=await pending.promise;if(inflight===pending)inflight=undefined;cached=loaded;
      return normalizeSheetData(loaded.data,period,loaded.readAt);
    }catch{
      if(inflight?.key===key)inflight=undefined;
      if(cached?.key===key&&now-cached.expires<CACHE_MS){const stale=normalizeSheetData(cached.data,period,cached.readAt);stale.status="stale";for(const source of stale.sources)if(source.status==="available"||source.status==="empty"){source.status="stale";source.issue="read-failed";}return stale;}
      return unavailableExternal(period,"unavailable");
    }
  };
}
export const readExternalAnalytics=createSheetReader({authorize:async()=> (await getSession())?.role==="ADMIN",fetcher:(...args)=>fetch(...args),now:()=>Date.now(),configuration:config});
