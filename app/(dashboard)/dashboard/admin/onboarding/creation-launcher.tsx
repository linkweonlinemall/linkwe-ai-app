"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, PackagePlus, Sparkles, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { createAdminRecord, type CreationKind } from "@/app/actions/admin-creation";
import PasswordInput from "@/components/ui/PasswordInput";

type Options={users:{id:string;fullName:string;email:string;role:string}[];stores:{id:string;name:string;ownerId:string}[]};
const kinds:{id:CreationKind;label:string;copy:string;icon:typeof UserPlus}[]=[
  {id:"user",label:"User",copy:"Customer, vendor or administrator",icon:UserPlus},
  {id:"store",label:"Store",copy:"Attach a complete storefront to a user",icon:Building2},
  {id:"product",label:"Product",copy:"Add physical or digital inventory",icon:PackagePlus},
  {id:"service",label:"Service",copy:"Add bookable, quote or subscription work",icon:Wrench},
  {id:"listing",label:"Listing",copy:"Create any marketplace listing type",icon:Boxes},
];
const input="mt-1 min-h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-orange-400";

export default function CreationLauncher({options}:{options:Options}){
  const [kind,setKind]=useState<CreationKind>("store"); const [busy,setBusy]=useState(false); const router=useRouter();
  return <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-start gap-3"><span className="rounded-2xl bg-orange-50 p-3 text-[#D4450A]"><Sparkles/></span><div><h2 className="text-xl font-bold">Create anything</h2><p className="mt-1 text-sm text-zinc-500">Create the record, attach it to the right account, then continue directly into its complete field editor.</p></div></div>
    <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{kinds.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} onClick={()=>setKind(item.id)} className={`rounded-2xl border p-4 text-left transition ${kind===item.id?"border-[#D4450A] bg-orange-50 ring-2 ring-orange-100":"border-zinc-200 hover:border-orange-200"}`}><Icon size={20} className="text-[#D4450A]"/><strong className="mt-3 block text-sm">{item.label}</strong><span className="mt-1 block text-xs leading-5 text-zinc-500">{item.copy}</span></button>})}</div>
    <form key={kind} className="mt-6 rounded-2xl bg-zinc-50 p-4 sm:p-5" onSubmit={async e=>{e.preventDefault();setBusy(true);const values=Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>;try{const result=await createAdminRecord(kind,values);if(!result.ok)toast.error(result.error);else{toast.success(`${kind} created — complete every field next`);router.push(`/dashboard/admin/records/${kind}/${result.id}`);}}catch{toast.error("Could not create this record.");}finally{setBusy(false);}}}>
      <h3 className="mb-4 font-bold capitalize">New {kind}</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kind==="user"&&<><label className="text-xs font-semibold">Full name<input name="fullName" required className={input}/></label><label className="text-xs font-semibold">Email<input name="email" type="email" required className={input}/></label><label className="text-xs font-semibold">Phone<input name="phone" className={input}/></label><label className="text-xs font-semibold">Role<select name="role" className={input}><option>CUSTOMER</option><option>VENDOR</option><option>ADMIN</option></select></label><label className="text-xs font-semibold">Temporary password<PasswordInput name="password" required minLength={12} className={input}/></label></>}
        {kind==="store"&&<><label className="text-xs font-semibold">Attach to user<select name="ownerId" required className={input}><option value="">Choose user</option>{options.users.map(u=><option key={u.id} value={u.id}>{u.fullName} · {u.email}</option>)}</select></label><label className="text-xs font-semibold">Store name<input name="name" required className={input}/></label><label className="text-xs font-semibold">Store URL slug<input name="slug" placeholder="generated-from-name" className={input}/></label><label className="text-xs font-semibold">Category key<input name="categoryId" defaultValue="other" className={input}/></label><label className="text-xs font-semibold">Region<input name="region" defaultValue="Trinidad and Tobago" className={input}/></label></>}
        {(kind==="product"||kind==="service")&&<><label className="text-xs font-semibold">Attach to store<select name="storeId" required className={input}><option value="">Choose store</option>{options.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-xs font-semibold">Name<input name="name" required className={input}/></label><label className="text-xs font-semibold">URL slug<input name="slug" className={input}/></label><label className="text-xs font-semibold">Price (TTD)<input name="price" type="number" min="0" step="0.01" className={input}/></label>{kind==="product"?<label className="text-xs font-semibold">Opening stock<input name="stock" type="number" min="0" className={input}/></label>:<label className="text-xs font-semibold">Service type<select name="serviceType" className={input}>{["BOOKABLE","QUOTE","SUBSCRIPTION","ON_DEMAND","VIRTUAL"].map(v=><option key={v}>{v}</option>)}</select></label>}</>}
        {kind==="listing"&&<><label className="text-xs font-semibold">Attach to store<select name="storeId" required className={input}><option value="">Choose store</option>{options.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-xs font-semibold">Title<input name="title" required className={input}/></label><label className="text-xs font-semibold">URL slug<input name="slug" className={input}/></label><label className="text-xs font-semibold">Listing type<select name="type" className={input}>{["PRODUCT","REAL_ESTATE","VEHICLE","EVENT","SERVICE","RESTAURANT","PLACE","TICKET","DIGITAL","BOOKABLE"].map(v=><option key={v}>{v}</option>)}</select></label><label className="text-xs font-semibold">Price (TTD)<input name="price" type="number" min="0" step="0.01" className={input}/></label></>}
      </div><button disabled={busy} className="mt-5 min-h-11 rounded-xl bg-[#D4450A] px-5 text-sm font-bold text-white disabled:opacity-50">{busy?"Creating…":`Create ${kind} and complete all fields →`}</button>
    </form>
  </section>;
}
