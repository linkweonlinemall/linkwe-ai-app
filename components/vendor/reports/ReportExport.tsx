"use client";
import { Download, Printer } from "lucide-react";
export default function ReportExport({rows,period}:{rows:(string|number)[][];period:string}){
 function download(){const csv=rows.map(row=>row.map(value=>{let text=String(value);if(/^[=+@\-\t\r]/.test(text))text="'"+text;return `"${text.replaceAll('"','""')}"`;}).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`linkwe-sales-${period}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <div className="flex flex-wrap gap-2 print:hidden"><button onClick={download} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#174766]"><Download size={15}/>Export sales CSV</button><button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-xs font-bold text-white"><Printer size={15}/>Print report</button></div>;
}
