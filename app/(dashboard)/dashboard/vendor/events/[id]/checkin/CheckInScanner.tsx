"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, ScanLine, Check, ShieldCheck, AlertTriangle, X, Wifi, WifiOff, RefreshCw, Download, Flashlight, Pause, ArrowRight, Users } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import { checkInTicket, getTicketForCheckIn, getEventGateSummary, getEventAllowlist, verifyEventScanCode, type TicketCheckInLookup } from "@/app/actions/ticket-checkin";
import { parseTicketScan } from "@/lib/tickets/scan-input";
import { countAllowlist, lookupTicket, saveAllowlist } from "@/lib/offline-checkin/allowlist";
import { getCachedEvent, saveCachedEvent } from "@/lib/offline-checkin/event-cache";
import { recordOfflineAdmission } from "@/lib/offline-checkin/admit";
import { countQueuedScans } from "@/lib/offline-checkin/queue";
import { syncQueuedScans } from "@/lib/offline-checkin/sync";
import { getDeviceLabel, setDeviceLabel, getOrCreateDeviceId } from "@/lib/offline-checkin/device-id";
import { getCheckinDb } from "@/lib/offline-checkin/db";
import s from "@/components/events/operations/operations.module.css";

type Found = Extract<TicketCheckInLookup,{found:true}>;
type ScanResult = { title:string;message:string;tone:"success"|"warning"|"error";ticket?:Found;admitted?:boolean };
type Props = { eventId:string;eventTitle:string;scanCode?:string;isDownloadingAllowlist?:boolean };
const reasons:Record<string,string> = { wrong_event:"This ticket belongs to a different event.",already_used:"This guest has already been checked in. Do not admit again.",cancelled:"This ticket has been cancelled. Do not admit.",refunded:"This ticket has been refunded. Do not admit.",not_paid:"Payment has not been confirmed. Do not admit.",unauthorized:"Your access has expired. Sign in or ask the host for a current staff code.",unauthenticated:"Please sign in again.",not_valid:"No valid ticket matches this code. Check the ticket number or ask the host for help." };
const titles:Record<string,string> = { wrong_event:"Wrong event",already_used:"Already checked in",cancelled:"Ticket cancelled",refunded:"Ticket refunded",not_paid:"Payment not confirmed",unauthorized:"Access expired",not_valid:"Ticket not found" };
function time(value:Date|string|number){return new Date(value).toLocaleTimeString("en-TT",{hour:"numeric",minute:"2-digit",second:"2-digit"});}
export function CheckInScanner({eventId,eventTitle,scanCode,isDownloadingAllowlist=false}:Props){
  const cameraId=`gate-camera-${useId().replace(/[^a-z0-9]/gi,"")}`;
  const [online,setOnline]=useState(true),[cameraOn,setCameraOn]=useState(false),[cameraReady,setCameraReady]=useState(false),[cameraError,setCameraError]=useState("");
  const [cameras,setCameras]=useState<{id:string;label:string}[]>([]),[selectedCamera,setSelectedCamera]=useState(""),[torchSupported,setTorchSupported]=useState(false),[torch,setTorch]=useState(false);
  const [manual,setManual]=useState(""),[busy,setBusy]=useState(false),[result,setResult]=useState<ScanResult|null>(null),[error,setError]=useState("");
  const [label,setLabel]=useState(""),[summary,setSummary]=useState<{admitted:number;remaining:number;total:number}|null>(null),[updated,setUpdated]=useState<number|null>(null);
  const [queued,setQueued]=useState(0),[cached,setCached]=useState(0),[prepared,setPrepared]=useState(false),[preparing,setPreparing]=useState(false),[syncing,setSyncing]=useState(false),[syncMessage,setSyncMessage]=useState("");
  const [recent,setRecent]=useState<{key:number;name:string;outcome:string;at:number}[]>([]);
  const scanner=useRef<Html5Qrcode|null>(null),lock=useRef(false),lastCamera=useRef(false),active=useRef(true),resultRef=useRef<HTMLDivElement>(null);
  const cameraLifecycle=useRef<Promise<void>>(Promise.resolve());
  const processRef=useRef<(value:string)=>Promise<void>>(async()=>{});
  const refresh=useCallback(async()=>{
    try{
      const [q,c,event]=await Promise.all([countQueuedScans(eventId),countAllowlist(eventId),getCachedEvent(eventId)]);
      if(!active.current)return;setQueued(q);setCached(c);setPrepared(!!event);
      if(navigator.onLine){const info=await getEventGateSummary(eventId,scanCode);if(active.current){if("error" in info){setError(info.error ?? "Access unavailable.");setSummary(null);}else{setSummary(info);setUpdated(Date.now());}}}
    }catch{/* Existing data remains visible while a refresh is unavailable. */}
  },[eventId,scanCode]);
  const sync=useCallback(async()=>{
    if(!scanCode||!navigator.onLine)return;
    setSyncing(true);
    try{const res=await syncQueuedScans(eventId,scanCode);if(active.current&&res.synced)setSyncMessage(res.conflicts?`${res.synced} scans synced. ${res.conflicts} need host review: duplicate or invalid tickets.`:`${res.synced} offline scans synced successfully.`);await refresh();}finally{if(active.current)setSyncing(false);}
  },[eventId,scanCode,refresh]);
  useEffect(()=>{
    active.current=true;setOnline(navigator.onLine);setLabel(getDeviceLabel());void refresh();
    const connectivity=()=>{setOnline(navigator.onLine);if(navigator.onLine)void sync();};
    window.addEventListener("online",connectivity);window.addEventListener("offline",connectivity);
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible"){void refresh();if(navigator.onLine)void sync();}},30000);
    return()=>{active.current=false;window.removeEventListener("online",connectivity);window.removeEventListener("offline",connectivity);window.clearInterval(timer);};
  },[refresh,sync]);
  useEffect(()=>{if(!isDownloadingAllowlist)void refresh();},[isDownloadingAllowlist,refresh]);
  useEffect(()=>{
    if(!cameraOn)return;
    let cancelled=false;let local:Html5Qrcode|null=null;
    setCameraReady(false);setCameraError("");setTorch(false);setTorchSupported(false);
    const start=cameraLifecycle.current.then(async()=>{
      try{
        const {Html5Qrcode}=await import("html5-qrcode");if(cancelled)return;
        local=new Html5Qrcode(cameraId);scanner.current=local;
        await local.start(selectedCamera||{facingMode:"environment"},{fps:10,qrbox:(w,h)=>{const size=Math.min(260,Math.floor(Math.min(w,h)*.72));return {width:size,height:size};}},value=>{if(!lock.current&&!cancelled)void processRef.current(value);},()=>{});
        if(cancelled){await local.stop().catch(()=>{});return;}
        setCameraReady(true);
        setTorchSupported(!!(local.getRunningTrackCapabilities() as MediaTrackCapabilities&{torch?:boolean}).torch);
        const devices=await Html5Qrcode.getCameras();if(!cancelled)setCameras(devices);
      }catch{if(!cancelled){setCameraError("Camera unavailable. Allow camera access in your browser, or enter the ticket number below.");setCameraReady(false);}}
    });
    return()=>{cancelled=true;cameraLifecycle.current=start.then(async()=>{if(local?.isScanning)await local.stop().catch(()=>{});try{local?.clear();}catch{}if(scanner.current===local)scanner.current=null;});};
  },[cameraOn,cameraId,selectedCamera]);
  function remember(name:string,outcome:string){setRecent(rows=>[{key:Date.now()+Math.random(),name,outcome,at:Date.now()},...rows].slice(0,8));}
  const failure=(reason:string):ScanResult=>({title:titles[reason]??"Unable to verify",message:reasons[reason]??reasons.not_valid,tone:reason==="already_used"?"warning":"error"});
  async function process(value:string){
    if(lock.current)return;lock.current=true;setBusy(true);setError("");setResult(null);lastCamera.current=cameraOn;setCameraOn(false);
    const token=parseTicketScan(value);
    try{
      if(!token){setResult({title:"Use a LinkWe ticket",message:"Scan the QR code on the guest’s LinkWe ticket, or enter its printed ticket number.",tone:"error"});return;}
      let lookup:TicketCheckInLookup;
      if(!navigator.onLine){
        if(!scanCode||!await getCachedEvent(eventId)){setResult({title:"Connect to verify",message:"Prepare offline scanning while online before admitting guests without a connection.",tone:"warning"});return;}
        let ticket=await lookupTicket(token);
        if(!ticket){const db=await getCheckinDb();const rows=await db.getAllFromIndex("allowlist","by_event",eventId);ticket=rows.find(row=>row.ticketNumber.toLowerCase()===token.toLowerCase())??null;}
        if(!ticket||ticket.eventId!==eventId){setResult({title:"Not in offline guest list",message:"Reconnect to check this ticket. It may have been purchased after this device’s last download.",tone:"warning"});return;}
        lookup={found:true,authorized:true,id:ticket.qrToken,qrToken:ticket.qrToken,ticketNumber:ticket.ticketNumber,holderName:ticket.holderName,ticketTypeName:ticket.ticketTypeName,status:ticket.usedLocally?"USED":ticket.status as Found["status"],checkedInAt:ticket.usedAt?new Date(ticket.usedAt):null,eventId,event:{title:eventTitle,startDate:new Date(),venueLabel:""}};
      }else lookup=await getTicketForCheckIn(token,eventId,scanCode);
      if(!lookup.found){setResult(failure(lookup.reason??"not_valid"));return;}
      if(lookup.status!=="VALID"){
        const reason=lookup.status==="USED"?"already_used":lookup.status.toLowerCase();
        setResult({...failure(reason),ticket:lookup});remember(lookup.ticketNumber,titles[reason]??reason);
        // Duplicate attempts are recorded consistently across scanner and attendee check-in.
        if(navigator.onLine&&lookup.status==="USED")await checkInTicket(lookup.qrToken,eventId,scanCode,{id:getOrCreateDeviceId(),label});
      }else setResult({title:"Ready to welcome",message:navigator.onLine?"Ticket verified. Confirm the guest’s name, then admit them.":"Found in this device’s offline list. Confirm the guest’s name before admitting.",tone:"success",ticket:lookup});
    }catch{setResult({title:"Could not verify",message:"The connection or device storage is unavailable. Reconnect and try again before admitting this guest.",tone:"warning"});}
    finally{lock.current=false;setBusy(false);setTimeout(()=>resultRef.current?.focus(),0);}
  }
  processRef.current=process;
  async function admit(){
    const ticket=result?.ticket;if(!ticket||result.admitted||ticket.status!=="VALID"||lock.current)return;
    lock.current=true;setBusy(true);setError("");
    try{
      if(!navigator.onLine){
        const outcome=await recordOfflineAdmission({qrToken:ticket.qrToken,eventId,scannedAt:Date.now(),deviceId:getOrCreateDeviceId(),deviceLabel:label});
        if(outcome!=="ADMITTED"){setResult({...failure(outcome==="DUPLICATE"?"already_used":"not_valid"),ticket});return;}
      }else{
        const response=await checkInTicket(ticket.qrToken,eventId,scanCode,{id:getOrCreateDeviceId(),label});
        if(!response.ok){setResult({...failure(response.reason),ticket:{...ticket,...(response.reason==="already_used"?{status:"USED" as const,checkedInAt:response.checkedInAt??null}:{})}});remember(ticket.ticketNumber,titles[response.reason]??"Not admitted");await refresh();return;}
      }
      setResult({title:"You’re checked in!",message:navigator.onLine?"Admission confirmed. Welcome them in.":"Admission saved on this device. Keep this tab available until all scans have synced.",tone:"success",ticket:{...ticket,status:"USED",checkedInAt:new Date()},admitted:true});
      remember(ticket.ticketNumber,navigator.onLine?"Admitted":"Admitted · pending sync");navigator.vibrate?.(90);await refresh();
    }catch{setError("Admission was not confirmed. Check the ticket again before letting this guest in.");}
    finally{setBusy(false);lock.current=false;}
  }
  function next(){setResult(null);setManual("");setError("");if(lastCamera.current)setCameraOn(true);}
  async function prepare(){if(!scanCode)return;setPreparing(true);setError("");try{
    const verified=await verifyEventScanCode(eventId,scanCode);if(!verified.valid)throw new Error();
    await sync();const list=await getEventAllowlist(eventId,scanCode);if(!list.ok)throw new Error();
    await saveAllowlist(eventId,list.tickets);await saveCachedEvent({eventId,scanCode,eventTitle:verified.eventTitle,eventStartDate:verified.eventStartDate,venueName:verified.venueName,cachedAt:Date.now()});await refresh();
  }catch{setError("Could not prepare offline access. Keep an internet connection and try again.");}finally{setPreparing(false);}}
  async function toggleTorch(){try{await scanner.current?.applyVideoConstraints({advanced:[{torch:!torch} as MediaTrackConstraintSet]});setTorch(!torch);}catch{setCameraError("This camera couldn’t switch its light. Use better lighting or manual entry.");}}
  const ticket=result?.ticket;
  return <div>
    <div className={s.stats}>{[[summary?.admitted,"Checked in"],[summary?.remaining,"Still to arrive"],[summary?.total,"Active LinkWe tickets"]].map(([value,text])=><div className={s.stat} key={text}><strong>{value??"—"}</strong><small>{text}</small></div>)}</div>
    <div className={s.scanGrid}><section className={s.panel}><div className={s.panelHead}><h2>Scan & welcome</h2><span className={online?s.online:s.offline}>{online?<Wifi size={14}/>:<WifiOff size={14}/>} {online?"Online":"Offline"}</span></div>
      <div className={s.camera}><div id={cameraId} style={{display:cameraOn?"block":"none"}}/>{!cameraOn&&<div className={s.cameraIdle}><ScanLine size={56} strokeWidth={1.2}/><h3>{result?"Ticket captured":"Ready when you are."}</h3><p>Place the guest’s ticket QR code inside the frame. We’ll verify it before you admit them.</p><button type="button" disabled={busy} className={s.button} onClick={()=>{setResult(null);setCameraOn(true);}}><Camera size={18}/> Start camera</button></div>}{cameraOn&&!cameraReady&&!cameraError&&<p className="p-5 text-center text-sm text-white">Starting camera…</p>}</div>
      {cameraOn&&<div className={s.actions}><button type="button" className={s.secondary} onClick={()=>setCameraOn(false)}><Pause size={16}/> Stop camera</button>{cameraReady&&cameras.length>1&&<select aria-label="Camera" className={s.select} value={selectedCamera} onChange={e=>setSelectedCamera(e.target.value)}><option value="">Back camera · automatic</option>{cameras.map(c=><option key={c.id} value={c.id}>{c.label||"Camera"}</option>)}</select>}{torchSupported&&cameraReady&&<button type="button" aria-pressed={torch} className={s.secondary} onClick={toggleTorch}><Flashlight size={16}/> Light</button>}</div>}
      {cameraError&&<p className={s.error} role="alert">{cameraError}</p>}
      <form className={s.manual} onSubmit={e=>{e.preventDefault();void process(manual);}}><label htmlFor={`${cameraId}-manual`}>No QR code? Enter a ticket number.</label><div><input id={`${cameraId}-manual`} className={s.input} value={manual} onChange={e=>setManual(e.target.value)} placeholder="Ticket number, QR token or ticket link" maxLength={2000} autoComplete="off" spellCheck={false}/><button className={s.button} disabled={busy||!manual.trim()}>{busy?"Checking…":"Find ticket"}<ArrowRight size={16}/></button></div><small>A lookup never admits a guest automatically.</small></form>
    </section><section className={s.panel}><div className={s.panelHead}><h2>Entry decision</h2>{busy&&<span>Verifying…</span>}</div><div ref={resultRef} tabIndex={-1} aria-live="polite" aria-atomic="true">
      {result?<div className={s.result} data-tone={result.tone}><span className={s.resultIcon}>{result.admitted?<Check size={29}/>:result.tone==="success"?<ShieldCheck size={29}/>:result.tone==="warning"?<AlertTriangle size={27}/>:<X size={29}/>}</span><h3>{result.title}</h3><p>{result.message}</p>{ticket&&<dl><div><dt>Guest</dt><dd>{ticket.holderName}</dd></div><div><dt>Ticket type</dt><dd>{ticket.ticketTypeName}</dd></div><div><dt>Ticket number</dt><dd>{ticket.ticketNumber}</dd></div><div><dt>{ticket.checkedInAt?"Checked in at":"Event"}</dt><dd>{ticket.checkedInAt?time(ticket.checkedInAt):eventTitle}</dd></div></dl>}{ticket?.status==="VALID"&&result.tone==="success"&&!result.admitted&&<button type="button" className={s.button} disabled={busy} onClick={admit}><Check size={20}/>{busy?"Confirming…":"Confirm & admit guest"}</button>}<button type="button" disabled={busy} onClick={next} className={`${s.secondary} mt-4 w-full`}><ScanLine size={17}/> Next ticket</button></div>:<div className={s.ready}><Users size={45} strokeWidth={1.3}/><h3>Every guest, accounted for.</h3><p>Scan or find a ticket to see its holder, ticket type and entry status here.</p></div>}
      {error&&<p className={s.error} role="alert">{error}</p>}</div>
      {recent.length>0&&<div className={s.recent}><h3>Recent activity · this session</h3><ol>{recent.map(row=><li key={row.key}><div><strong>{row.name}</strong>{row.outcome}</div><time>{time(row.at)}</time></li>)}</ol></div>}
    </section></div>
    <section className={`${s.panel} mt-5`}><div className={s.panelHead}><h2>Gate & connection</h2><button type="button" className={s.secondary} onClick={()=>void refresh()}><RefreshCw size={14}/> Refresh totals</button></div><div className={s.split}><div className={s.field}><label htmlFor={`${cameraId}-gate`}>Name this gate or device</label><input id={`${cameraId}-gate`} className={s.input} placeholder="e.g. Main entrance · Phone 1" value={label} maxLength={60} onChange={e=>{setLabel(e.target.value);setDeviceLabel(e.target.value);}}/><p className="mt-2">Included in the entry record so the host can trace duplicate attempts.</p>{updated&&<p className="mt-2">Online totals last refreshed at {time(updated)}{!online?" · may be out of date":""}.</p>}</div><div><p><strong>{queued}</strong> scans waiting to sync · <strong>{prepared?cached:0}</strong> tickets available offline</p><div className={s.actions}>{scanCode&&<><button type="button" className={s.secondary} onClick={prepare} disabled={!online||preparing||isDownloadingAllowlist}><Download size={15}/>{preparing||isDownloadingAllowlist?"Preparing…":prepared?"Refresh offline list":"Prepare offline scanning"}</button><button type="button" className={s.button} onClick={()=>void sync()} disabled={!online||syncing||queued===0}><RefreshCw size={15}/>{syncing?"Syncing…":"Sync now"}</button></>}{!scanCode&&<p>Generate a staff code below, then reload this page to enable offline preparation.</p>}</div>{(prepared||!online)&&<p className={s.notice}>Offline access lasts 24 hours after preparation. Devices cannot see each other’s offline admissions. Use one offline gate per ticket list and reconnect regularly.</p>}{syncMessage&&<p className={s.notice} role="status">{syncMessage}</p>}</div></div></section>
  </div>;
}
